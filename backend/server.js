// ===============================================
// YAYO APP v65 - BACKEND SERVER (Express + MongoDB)
// ===============================================

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const zlib = require('zlib');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
app.set('trust proxy', 1); // Render está detrás de un proxy (HTTPS)

// Llave para firmar las sesiones. Debe venir de la variable JWT_SECRET de Render.
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 16) {
  JWT_SECRET = crypto.randomBytes(48).toString('hex');
  console.warn('⚠️  JWT_SECRET no está configurado (o es muy corto). Se usará uno temporal: las sesiones se cerrarán cada vez que el servidor reinicie.');
}
const SESSION_DAYS = 30;
const COOKIE = 'yl_s';
const COACHES = ['yayo', 'laura'];
const norm = v => String(v == null ? '' : v).trim().toLowerCase();

// ===============================================
// MIDDLEWARE
// ===============================================

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));

// Cabeceras de seguridad básicas
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'same-origin');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// ===============================================
// SERVIR ARCHIVOS ESTÁTICOS (IMPORTANTE!)
// ===============================================

app.use((req, res, next) => {
  if (/^\/(backend|node_modules)(\/|$)/i.test(req.path)) return res.status(404).end();
  next();
});
// La página principal se envía comprimida (1,4 MB -> ~0,4 MB): carga mucho
// más rápido en celulares. Se recomprime sola si el archivo cambia.
const INDEX_FILE = path.join(__dirname, '..', 'index.html');
let indexCache = { mtime: 0, raw: null, gz: null, etag: '' };
function cargarIndex() {
  const st = fs.statSync(INDEX_FILE);
  if (st.mtimeMs !== indexCache.mtime) {
    const raw = fs.readFileSync(INDEX_FILE);
    indexCache = { mtime: st.mtimeMs, raw, gz: zlib.gzipSync(raw, { level: 9 }), etag: '"' + crypto.createHash('sha1').update(raw).digest('hex').slice(0, 20) + '"' };
  }
  return indexCache;
}
function enviarIndex(req, res) {
  try {
    const c = cargarIndex();
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-cache'); // siempre revisa si hay versión nueva
    res.set('ETag', c.etag);
    res.set('Vary', 'Accept-Encoding');
    if (req.headers['if-none-match'] === c.etag) return res.status(304).end();
    if (/\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
      res.set('Content-Encoding', 'gzip');
      return res.send(c.gz);
    }
    res.send(c.raw);
  } catch (e) {
    res.status(500).send('No se pudo cargar la app.');
  }
}
app.get(['/', '/index.html'], enviarIndex);
app.use(express.static(path.join(__dirname, '..'), { index: false }));

// ===============================================
// CONECTAR MONGODB
// ===============================================

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB conectado');
    console.log(`📊 Database: yayo_v65`);
    try { await prepararSeguridad(); } catch (e) { console.error('❌ Preparando seguridad:', e.message); }
  })
  .catch(err => {
    console.error('❌ Error MongoDB:', err.message);
    process.exit(1);
  });

// ===============================================
// ESQUEMAS MONGODB
// ===============================================

const coachSchema = new mongoose.Schema({
  nombre: String,
  username: String,
  password: String,
  telefono: String,
  especialidad: String,
  ver: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now }
});

const clienteSchema = new mongoose.Schema({
  nombre: String,
  username: String,
  password: String,
  edad: Number,
  coach_id: mongoose.Schema.Types.ObjectId,
  objetivo: String,
  status: { type: String, default: 'activo' },
  app_id: String,
  telefono: String,
  coach: String,
  fisiculturista: Boolean,
  origen: String,
  createdAt: { type: Date, default: Date.now }
});

const dietaSchema = new mongoose.Schema({
  coach_id: mongoose.Schema.Types.ObjectId,
  cliente_id: mongoose.Schema.Types.ObjectId,
  nombre: String,
  kcal_objetivo: Number,
  macros: {
    proteina: Number,
    carbohidratos: Number,
    grasas: Number
  },
  comidas: Array,
  createdAt: { type: Date, default: Date.now }
});

const Coach = mongoose.model('Coach', coachSchema);
const Cliente = mongoose.model('Cliente', clienteSchema);
const Dieta = mongoose.model('Dieta', dietaSchema);

// ===============================================
// RUTAS API
// ===============================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor funcionando' });
});

app.post('/api/clientes', soloCoach, async (req, res) => {
  try {
    const { nombre, username, password, edad, objetivo, coach_id } = req.body;
    const cliente = new Cliente({
      nombre, username, edad, objetivo, coach_id, status: 'activo'
    });
    await cliente.save();
    res.json({ success: true, cliente });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/coach/mis-clientes', soloCoach, async (req, res) => {
  try {
    const coach_id = req.query.coach_id;
    const clientes = await Cliente.find({ coach_id });
    res.json({ clientes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clientes/:id', soloCoach, async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'No encontrado' });
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/clientes/:id', soloCoach, async (req, res) => {
  try {
    const datos = Object.assign({}, req.body); delete datos.password;
    const cliente = await Cliente.findByIdAndUpdate(req.params.id, datos, { new: true });
    res.json({ success: true, cliente });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/clientes/:id', soloCoach, async (req, res) => {
  try {
    await Cliente.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/dietas', soloCoach, async (req, res) => {
  try {
    const { coach_id, cliente_id, nombre, kcal_objetivo, macros, comidas } = req.body;
    const dieta = new Dieta({
      coach_id, cliente_id, nombre, kcal_objetivo, macros, comidas
    });
    await dieta.save();
    res.json({ success: true, dieta });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dietas/:id', soloCoach, async (req, res) => {
  try {
    const dieta = await Dieta.findById(req.params.id);
    if (!dieta) return res.status(404).json({ error: 'No encontrado' });
    res.json(dieta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clientes/:id/dietas', soloCoach, async (req, res) => {
  try {
    const dietas = await Dieta.find({ cliente_id: req.params.id });
    res.json({ dietas });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/alimentos', (req, res) => {
  const alimentos = [
    { name: "Pollo pechuga cocida", group: "Proteína", kcal: 165, p: 31, c: 0, f: 3.6 }
  ];
  res.json({ alimentos });
});

// ===============================================
// PUENTE APP <-> MONGODB (datos de la app)
// -----------------------------------------------
// La app guarda su información en bloques: users, routines, diets,
// checkins, etc. Cada bloque es un documento en la colección
// "app_state". Cada documento lleva un número de versión para que dos
// dispositivos que guardan al mismo tiempo no se pisen: si alguien
// guardó antes, el servidor responde 409 con lo último y la app
// combina los cambios antes de volver a guardar.
// ===============================================

const appStateSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  json: String,
  version: Number,
  updatedAt: Date
}, { collection: 'app_state' });
const AppState = mongoose.model('AppState', appStateSchema);

const archivoSchema = new mongoose.Schema({
  nombre: String,
  tipo: String,
  tamano: Number,
  datos: Buffer,
  clave: { type: String, index: true },
  subidoPor: String,
  createdAt: { type: Date, default: Date.now }
}, { collection: 'archivos' });
const Archivo = mongoose.model('Archivo', archivoSchema);

const KEY_OK = /^[A-Za-z0-9_-]{1,40}$/;

function formatoEstado(d) {
  let value = null;
  try { value = JSON.parse(d.json || 'null'); } catch (e) { value = null; }
  return { value, version: d.version || 0, updatedAt: d.updatedAt };
}

// Copia legible de los usuarios de la app en la colección "clientes"
// (sin contraseñas), para poder verlos en MongoDB Atlas.
async function reflejarClientes(users) {
  if (!Array.isArray(users)) return;
  const lista = users.filter(u => u && u.id != null && u.name &&
    !['yayo', 'laura'].includes(String(u.name).toLowerCase()));
  const ops = lista.map(u => ({
    updateOne: {
      filter: { app_id: String(u.id) },
      update: { $set: {
        app_id: String(u.id),
        origen: 'app',
        username: u.name,
        nombre: u.fullName || u.name,
        edad: Number(u.age) || null,
        objetivo: u.goal || '',
        status: String(u.status || 'Activo').toLowerCase(),
        telefono: u.phone || '',
        coach: u.coachId || '',
        fisiculturista: !!u.bodybuilder
      } },
      upsert: true
    }
  }));
  if (ops.length) await Cliente.bulkWrite(ops);
  await Cliente.deleteMany({ origen: 'app', app_id: { $nin: lista.map(u => String(u.id)) } });
}

// ===============================================
// SEGURIDAD: LOGIN, SESIONES Y PERMISOS
// -----------------------------------------------
// - Las contraseñas se guardan CIFRADAS (bcrypt) en la colección
//   "credenciales" (clientes) y "coaches" (Yayo y Laura). Nunca viajan
//   a los celulares ni quedan legibles en la base de datos.
// - Al entrar, el servidor entrega una cookie de sesión firmada
//   (HttpOnly: el código de la página no la puede leer). Dura 30 días.
// - Cada cliente recibe SOLO su propia información y solo puede
//   modificar lo suyo. Los coaches ven y modifican todo.
// - Si el coach cambia la contraseña de un cliente, o lo pone en pausa,
//   las sesiones abiertas de ese cliente dejan de funcionar.
// ===============================================

const credencialSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  nombre: String,
  hash: String,
  ver: { type: Number, default: 1 },
  updatedAt: Date
}, { collection: 'credenciales' });
const Credencial = mongoose.model('Credencial', credencialSchema);

// Memoria rápida (un solo servidor): usuarios de la app, credenciales y coaches
const cache = { users: [], usersVersion: -1, creds: new Map(), coaches: new Map(), listo: false };

const esHash = v => typeof v === 'string' && /^\$2[aby]\$\d{2}\$/.test(v);
const userId = u => String(u && u.id);

async function cargarUsuarios() {
  const d = await AppState.findOne({ key: 'users' }).lean();
  let list = [];
  try { list = d ? JSON.parse(d.json || '[]') : []; } catch (e) { list = []; }
  cache.users = Array.isArray(list) ? list : [];
  cache.usersVersion = d ? (d.version || 0) : 0;
}

// Se ejecuta una vez al arrancar: cifra lo que estaba en texto plano.
async function prepararSeguridad() {
  // 1) Coaches: asegurar que existan y que su contraseña esté cifrada
  for (const c of COACHES) {
    let doc = await Coach.findOne({ username: new RegExp('^' + c + '$', 'i') });
    if (!doc) {
      doc = await Coach.create({ nombre: c === 'yayo' ? 'Yayo Daza' : 'Laura Henao', username: c, password: await bcrypt.hash('1234', 10), ver: 1 });
      console.log('🔐 Coach ' + c + ' creado con contraseña inicial 1234 (cámbiala desde la app).');
    } else if (!esHash(doc.password)) {
      doc.password = await bcrypt.hash(String(doc.password || '1234'), 10);
      doc.ver = (doc.ver || 1) + 1;
      await doc.save();
      console.log('🔐 Contraseña del coach ' + c + ' cifrada.');
    }
    cache.coaches.set(c, { id: String(doc._id), nombre: doc.nombre, hash: doc.password, ver: doc.ver || 1 });
  }
  // 2) Credenciales de clientes ya guardadas
  (await Credencial.find({}).lean()).forEach(c => cache.creds.set(c.uid, { hash: c.hash, ver: c.ver || 1 }));
  // 3) Contraseñas en texto plano dentro de los usuarios de la app -> cifrar y quitar
  await cargarUsuarios();
  let cambio = false;
  for (const u of cache.users) {
    if (u && typeof u.password === 'string' && u.password) {
      if (!cache.creds.has(userId(u))) await guardarCredencial(u, u.password, false);
      delete u.password; cambio = true;
    } else if (u && typeof u === 'object' && 'password' in u) { delete u.password; cambio = true; }
  }
  if (cambio) {
    await AppState.updateOne({ key: 'users' }, { $set: { json: JSON.stringify(cache.users), updatedAt: new Date() }, $inc: { version: 1 } });
    await cargarUsuarios();
    console.log('🔐 Contraseñas de clientes cifradas y retiradas de los datos de la app.');
  }
  // 4) La lista de contraseñas emitidas (issuedKeys) no se guarda más
  const ik = await AppState.findOne({ key: 'issuedKeys' }).lean();
  if (ik && ik.json !== '[]') {
    await AppState.updateOne({ key: 'issuedKeys' }, { $set: { json: '[]', updatedAt: new Date() }, $inc: { version: 1 } });
    console.log('🔐 Lista de contraseñas emitidas borrada.');
  }
  // 5) Por si quedó alguna contraseña en la colección "clientes"
  await Cliente.updateMany({ password: { $exists: true } }, { $unset: { password: 1 } });
  cache.listo = true;
  console.log('✅ Seguridad lista: ' + cache.creds.size + ' credenciales de clientes.');
}

async function guardarCredencial(u, plano, subirVersion = true) {
  const uid = userId(u);
  const prev = cache.creds.get(uid);
  const hash = await bcrypt.hash(String(plano), 10);
  const ver = prev ? (subirVersion ? prev.ver + 1 : prev.ver) : 1;
  await Credencial.updateOne({ uid }, { $set: { uid, nombre: u.name || '', hash, ver, updatedAt: new Date() } }, { upsert: true });
  cache.creds.set(uid, { hash, ver });
  return ver;
}

function buscarUsuario(nombre) {
  const n = norm(nombre);
  return cache.users.find(u => u && norm(u.name) === n && !COACHES.includes(norm(u.name)));
}
const pausado = u => norm(u && u.status) === 'pausado';

// ---------- cookie de sesión ----------
function firmar(res, req, datos) {
  const token = jwt.sign(datos, JWT_SECRET, { expiresIn: SESSION_DAYS + 'd' });
  res.cookie(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/',
    secure: req.secure || req.get('x-forwarded-proto') === 'https',
    maxAge: SESSION_DAYS * 24 * 3600 * 1000
  });
}
function leerCookie(req) {
  const h = req.headers.cookie || '';
  const m = h.split(/;\s*/).find(x => x.startsWith(COOKIE + '='));
  return m ? decodeURIComponent(m.slice(COOKIE.length + 1)) : null;
}
// Quién es: coach (yayo/laura) o cliente. null si la sesión no es válida.
function sesion(req) {
  const t = leerCookie(req);
  if (!t) return null;
  let d;
  try { d = jwt.verify(t, JWT_SECRET); } catch (e) { return null; }
  if (d.r === 'coach') {
    const c = cache.coaches.get(d.c);
    if (!c || c.ver !== d.pv) return null;
    return { rol: 'coach', coach: d.c, nombre: d.c === 'laura' ? 'Laura' : 'Yayo' };
  }
  if (d.r === 'user') {
    const u = cache.users.find(x => userId(x) === String(d.uid));
    const cr = cache.creds.get(String(d.uid));
    if (!u || pausado(u)) return null;
    if ((cr ? cr.ver : 0) !== (d.pv || 0)) return null;
    return { rol: 'user', uid: String(d.uid), nombre: u.name, user: u };
  }
  return null;
}
function conSesion(req, res, next) {
  if (!cache.listo) return res.status(503).json({ error: 'El servidor está iniciando. Intenta en unos segundos.' });
  const s = sesion(req);
  if (!s) return res.status(401).json({ error: 'Sesión no válida. Vuelve a iniciar sesión.' });
  req.quien = s; next();
}
function soloCoach(req, res, next) {
  conSesion(req, res, () => {
    if (req.quien.rol !== 'coach') return res.status(403).json({ error: 'Solo para coaches.' });
    next();
  });
}

// ---------- límite de intentos de login ----------
const intentos = new Map(); // ip|usuario -> { n, hasta }
function bloqueado(clave) {
  const r = intentos.get(clave);
  return !!(r && r.hasta && r.hasta > Date.now());
}
function fallo(clave) {
  const r = intentos.get(clave) || { n: 0, hasta: 0 };
  r.n += 1;
  if (r.n >= 8) { r.hasta = Date.now() + 15 * 60 * 1000; r.n = 0; }
  intentos.set(clave, r);
}
setInterval(() => { const now = Date.now(); for (const [k, r] of intentos) if (!r.hasta || r.hasta < now) intentos.delete(k); }, 30 * 60 * 1000).unref();

const sinClave = u => { if (!u || typeof u !== 'object') return u; const c = Object.assign({}, u); delete c.password; return c; };
function respuestaSesion(s) {
  return s.rol === 'coach'
    ? { success: true, rol: 'coach', coach: s.coach, nombre: s.nombre }
    : { success: true, rol: 'user', uid: s.uid, nombre: s.nombre, user: sinClave(s.user) };
}

app.post('/api/auth/login', async (req, res) => {
  try {
    if (!cache.listo) return res.status(503).json({ error: 'El servidor está iniciando. Intenta en unos segundos.' });
    const username = String((req.body && req.body.username) || '').trim();
    const password = String((req.body && req.body.password) || '');
    if (!username || !password) return res.status(400).json({ error: 'Escribe usuario y contraseña.' });
    const clave = (req.ip || '') + '|' + norm(username);
    if (bloqueado(clave)) return res.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos e intenta de nuevo.' });

    const n = norm(username);
    if (COACHES.includes(n)) {
      const c = cache.coaches.get(n);
      if (!c || !(await bcrypt.compare(password, c.hash))) { fallo(clave); return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' }); }
      intentos.delete(clave);
      firmar(res, req, { r: 'coach', c: n, pv: c.ver });
      return res.json(respuestaSesion({ rol: 'coach', coach: n, nombre: n === 'laura' ? 'Laura' : 'Yayo' }));
    }
    const u = buscarUsuario(username);
    const cr = u && cache.creds.get(userId(u));
    // Sin credencial guardada, la app siempre usó "1234" como contraseña inicial
    const ok = !!u && (cr ? await bcrypt.compare(password, cr.hash) : password === '1234');
    if (!ok) { fallo(clave); return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' }); }
    if (pausado(u)) return res.status(403).json({ error: 'Tu cuenta está en pausa. Escríbele a tu coach para reactivarla.' });
    intentos.delete(clave);
    firmar(res, req, { r: 'user', uid: userId(u), pv: cr ? cr.ver : 0 });
    res.json(respuestaSesion({ rol: 'user', uid: userId(u), nombre: u.name, user: u }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!cache.listo) return res.status(503).json({ error: 'El servidor está iniciando.' });
  const s = sesion(req);
  if (!s) return res.status(401).json({ error: 'Sin sesión.' });
  res.json(respuestaSesion(s));
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE, { path: '/' });
  res.json({ success: true });
});

// El coach asigna/cambia la contraseña de un cliente, o el cliente cambia la suya
app.post('/api/auth/password', conSesion, async (req, res) => {
  try {
    const uid = String((req.body && req.body.uid) || '');
    const password = (req.body && req.body.password) || '';
    if (typeof password !== 'string' || password.length < 4 || password.length > 100) return res.status(400).json({ error: 'Contraseña inválida.' });
    const q = req.quien;
    if (q.rol === 'user' && q.uid !== uid) return res.status(403).json({ error: 'Solo puedes cambiar tu propia contraseña.' });
    let u = cache.users.find(x => userId(x) === uid);
    // Un cliente recién creado por el coach puede no estar guardado aún: se acepta su nombre
    if (!u && q.rol === 'coach' && uid) u = { id: uid, name: String((req.body && req.body.name) || '') };
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado.' });
    const ver = await guardarCredencial(u, password, true);
    if (q.rol === 'user') firmar(res, req, { r: 'user', uid, pv: ver }); // su sesión actual sigue válida
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Yayo o Laura cambian su propia contraseña
app.post('/api/auth/coach-password', soloCoach, async (req, res) => {
  try {
    const actual = String((req.body && req.body.actual) || '');
    const nueva = (req.body && req.body.nueva) || '';
    const k = req.quien.coach;
    const c = cache.coaches.get(k);
    if (!(await bcrypt.compare(actual, c.hash))) return res.status(401).json({ error: 'La contraseña actual no es correcta.' });
    if (typeof nueva !== 'string' || nueva.length < 6 || nueva.length > 100 || !/[a-zA-Z]/.test(nueva) || !/[0-9]/.test(nueva)) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres, una letra y un número.' });
    }
    const hash = await bcrypt.hash(nueva, 10);
    const ver = c.ver + 1;
    await Coach.updateOne({ username: new RegExp('^' + k + '$', 'i') }, { $set: { password: hash, ver } });
    cache.coaches.set(k, Object.assign({}, c, { hash, ver }));
    firmar(res, req, { r: 'coach', c: k, pv: ver }); // esta sesión sigue; las demás se cierran
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- qué ve y qué puede tocar cada cliente ----------
// Bloques en forma de lista: un elemento es del cliente si lleva su id o su nombre.
const BLOQUES_LISTA = ['routines', 'diets', 'sessions', 'checkins', 'calendarEvents', 'progressReviews'];
// Bloques en forma de objeto organizados por cliente (llave = id o nombre del cliente)
const OBJ_POR_CLIENTE = ['userAssignments', 'assignmentHistory', 'progressLogs'];
// Bloques generales que el cliente puede ver pero no cambiar
const SOLO_LECTURA = ['brands', 'foodNutrition'];
// Bloques que el cliente sí puede modificar (solo en lo suyo)
const CLIENTE_ESCRIBE = ['users', 'sessions', 'checkins', 'calendarEvents', 'progressReviews', 'progressLogs'];
// Datos de su propia ficha que el cliente NO puede cambiar
const CAMPOS_PROTEGIDOS = ['id', 'name', 'status', 'coachId', 'bodybuilder', 'createdAt', 'protocolPdf', 'protocolFiles', 'password'];

function esDelCliente(x, s) {
  if (!x || typeof x !== 'object') return false;
  const id = s.uid, n = norm(s.nombre);
  if (x.userId != null && String(x.userId) === id) return true;
  if (x.uid != null && String(x.uid) === id) return true;
  if (x.user != null && norm(x.user) === n) return true;
  if (x.userName != null && norm(x.userName) === n) return true;
  return false;
}
const sinDueno = x => x && typeof x === 'object' && x.userId == null && x.uid == null && !norm(x.user) && !norm(x.userName);
function llaveDelCliente(k, s) {
  const kk = norm(k), n = norm(s.nombre);
  return kk === s.uid || kk === n || kk.startsWith(s.uid + '|') || kk.startsWith(n + '|') || kk.endsWith('_' + n) || kk.endsWith('_' + s.uid);
}

// Lo que un cliente puede ver de un bloque
function vistaCliente(key, value, s) {
  if (key === 'users') {
    return (Array.isArray(value) ? value : [])
      .filter(u => u && (userId(u) === s.uid || COACHES.includes(norm(u.name))))
      .map(sinClave);
  }
  if (key === 'issuedKeys' || key === 'accessRequests') return [];
  if (SOLO_LECTURA.includes(key)) return value;
  if (BLOQUES_LISTA.includes(key)) {
    if (!Array.isArray(value)) return [];
    // los eventos de calendario sin dueño son generales (para todos)
    return value.filter(x => esDelCliente(x, s) || (key === 'calendarEvents' && sinDueno(x)));
  }
  if (OBJ_POR_CLIENTE.includes(key)) {
    const out = {};
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.keys(value).forEach(k => { if (llaveDelCliente(k, s)) out[k] = value[k]; });
    }
    return out;
  }
  return Array.isArray(value) ? [] : (value && typeof value === 'object' ? {} : null);
}

// Combina lo que envía un cliente con el bloque completo: solo cambia lo suyo.
function combinarCliente(key, completo, enviado, s) {
  if (key === 'users') {
    const lista = Array.isArray(completo) ? completo.slice() : [];
    const mio = (Array.isArray(enviado) ? enviado : []).find(u => u && userId(u) === s.uid);
    const i = lista.findIndex(u => u && userId(u) === s.uid);
    if (!mio || i < 0) return lista;
    const nuevo = Object.assign({}, lista[i]);
    Object.keys(mio).forEach(k => { if (!CAMPOS_PROTEGIDOS.includes(k)) nuevo[k] = mio[k]; });
    Object.keys(nuevo).forEach(k => { if (!(k in mio) && !CAMPOS_PROTEGIDOS.includes(k)) delete nuevo[k]; });
    lista[i] = nuevo;
    return lista;
  }
  if (BLOQUES_LISTA.includes(key)) {
    const base = Array.isArray(completo) ? completo : [];
    const propios = (Array.isArray(enviado) ? enviado : []).filter(x => esDelCliente(x, s));
    return base.filter(x => !esDelCliente(x, s)).concat(propios);
  }
  if (OBJ_POR_CLIENTE.includes(key)) {
    const out = {};
    const base = completo && typeof completo === 'object' && !Array.isArray(completo) ? completo : {};
    Object.keys(base).forEach(k => { if (!llaveDelCliente(k, s)) out[k] = base[k]; });
    const env = enviado && typeof enviado === 'object' && !Array.isArray(enviado) ? enviado : {};
    Object.keys(env).forEach(k => { if (llaveDelCliente(k, s)) out[k] = env[k]; });
    return out;
  }
  return completo;
}

// ---------- biblioteca de plantillas (dietas y rutinas) ----------
// Compartida: la ven y editan las dos coaches. Privada: solo la ve y cambia quien la creó.
const BIBLIOTECAS = ['libraryDiets', 'libraryRoutines'];
const minus = v => String(v == null ? '' : v).trim().toLowerCase();
function esDeCoach(dueno, quien) {
  const d = minus(dueno);
  return !!d && (d === minus(quien.nombre) || d === minus(quien.coach));
}
// Privada de otra coach: no se muestra y no se puede tocar desde esta sesión
function esPrivadaAjena(x, quien) {
  if (!x || typeof x !== 'object' || x.scope !== 'private') return false;
  if (!minus(x.owner)) return false; // sin dueño conocido: visible para las dos
  return !esDeCoach(x.owner, quien);
}
// Lo que ve una coach de una biblioteca
function vistaCoachBiblioteca(key, value, quien) {
  if (!BIBLIOTECAS.includes(key) || !Array.isArray(value)) return value;
  return value.filter(x => !esPrivadaAjena(x, quien));
}
// Combina lo que envía una coach con lo guardado: conserva las privadas de la otra coach
function combinarBiblioteca(completo, enviado, quien) {
  const base = Array.isArray(completo) ? completo : [];
  const ajenas = base.filter(x => esPrivadaAjena(x, quien));
  const ids = new Set(ajenas.map(x => String(x && x.id)));
  const previos = new Map(base.map(x => [String(x && x.id), x]));
  const propios = (Array.isArray(enviado) ? enviado : [])
    .filter(x => x && typeof x === 'object' && !ids.has(String(x.id)))
    .map(x => {
      const previo = previos.get(String(x.id));
      // el dueño no cambia: una plantilla nueva es de quien la crea
      const owner = previo ? (previo.owner || quien.nombre) : quien.nombre;
      let scope = x.scope === 'private' ? 'private' : 'shared';
      // solo el dueño puede hacer privada una plantilla
      if (!esDeCoach(owner, quien) && previo) scope = previo.scope || 'shared';
      return Object.assign({}, x, { owner, scope });
    });
  return propios.concat(ajenas);
}

// Nunca se guardan contraseñas dentro de los usuarios de la app
function limpiarUsuarios(value) {
  if (!Array.isArray(value)) return value;
  return value.map(sinClave);
}

// Todos los bloques de una vez (carga inicial de la app)
// El coach recibe todo; un cliente recibe solo lo suyo.
app.get('/api/state', conSesion, async (req, res) => {
  try {
    const docs = await AppState.find({}).lean();
    const out = {};
    docs.forEach(d => {
      const f = formatoEstado(d);
      if (d.key === 'issuedKeys') f.value = [];
      if (d.key === 'users') f.value = limpiarUsuarios(f.value);
      if (req.quien.rol === 'user') f.value = vistaCliente(d.key, f.value, req.quien);
      else f.value = vistaCoachBiblioteca(d.key, f.value, req.quien);
      out[d.key] = f;
    });
    res.set('Cache-Control', 'no-store');
    res.json({ docs: out });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Solo las versiones (la app pregunta esto cada pocos segundos)
app.get('/api/state/versions', conSesion, async (req, res) => {
  try {
    const docs = await AppState.find({}, { key: 1, version: 1 }).lean();
    const out = {};
    docs.forEach(d => { out[d.key] = d.version || 0; });
    res.set('Cache-Control', 'no-store');
    res.json({ versions: out });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function vistaDe(req, key, d) {
  const f = formatoEstado(d);
  if (key === 'issuedKeys') f.value = [];
  if (key === 'users') f.value = limpiarUsuarios(f.value);
  if (req.quien.rol === 'user') f.value = vistaCliente(key, f.value, req.quien);
  else f.value = vistaCoachBiblioteca(key, f.value, req.quien);
  return f;
}

app.get('/api/state/:key', conSesion, async (req, res) => {
  try {
    const key = req.params.key;
    if (!KEY_OK.test(key)) return res.status(400).json({ error: 'Bloque inválido' });
    const d = await AppState.findOne({ key }).lean();
    res.set('Cache-Control', 'no-store');
    if (!d) return res.json({ exists: false });
    res.json(Object.assign({ exists: true }, vistaDe(req, key, d)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/state/:key', conSesion, async (req, res) => {
  try {
    const key = req.params.key;
    if (!KEY_OK.test(key)) return res.status(400).json({ error: 'Bloque inválido' });
    const q = req.quien;
    const body = req.body || {};
    let value = body.value === undefined ? null : body.value;
    const baseVersion = body.baseVersion;
    const actual = await AppState.findOne({ key }).lean();
    const versionActual = actual ? (actual.version || 0) : 0;

    // La lista de contraseñas emitidas ya no se guarda (solo vive en el celular del coach)
    if (key === 'issuedKeys') return res.json({ success: true, version: versionActual, updatedAt: actual && actual.updatedAt });

    if (q.rol === 'user') {
      // Bloques que el cliente no puede cambiar: se ignora (sin error)
      if (!CLIENTE_ESCRIBE.includes(key)) return res.json({ success: true, version: versionActual, updatedAt: actual && actual.updatedAt });
      if (typeof baseVersion === 'number' && baseVersion !== versionActual) {
        return res.status(409).json({ error: 'conflicto', doc: actual ? vistaDe(req, key, actual) : { value: null, version: 0 } });
      }
      const completo = actual ? formatoEstado(actual).value : (key === 'progressLogs' ? {} : []);
      value = combinarCliente(key, completo, value, q);
    } else if (BIBLIOTECAS.includes(key)) {
      // la coach no puede borrar ni cambiar las privadas de la otra coach
      const completo = actual ? formatoEstado(actual).value : [];
      value = combinarBiblioteca(completo, value, q);
    }

    if (key === 'users') value = limpiarUsuarios(value);
    const json = JSON.stringify(value);
    if (Buffer.byteLength(json) > 15 * 1024 * 1024) {
      return res.status(413).json({ error: 'El bloque es demasiado grande' });
    }
    const now = new Date();
    let doc = null;
    if (q.rol === 'user') {
      // el cliente siempre guarda sobre la versión que acabamos de leer
      if (!actual) {
        try { doc = (await AppState.create({ key, json, version: 1, updatedAt: now })).toObject(); }
        catch (e) { if (e && e.code !== 11000) throw e; doc = null; }
      } else {
        doc = await AppState.findOneAndUpdate(
          { key, version: versionActual },
          { $set: { json, updatedAt: now }, $inc: { version: 1 } },
          { new: true }
        ).lean();
      }
    } else if (typeof baseVersion !== 'number') {
      doc = await AppState.findOneAndUpdate(
        { key },
        { $set: { json, updatedAt: now }, $inc: { version: 1 } },
        { new: true, upsert: true }
      ).lean();
    } else if (baseVersion === 0) {
      try {
        doc = (await AppState.create({ key, json, version: 1, updatedAt: now })).toObject();
      } catch (e) {
        if (e && e.code !== 11000) throw e;
        doc = null;
      }
    } else {
      doc = await AppState.findOneAndUpdate(
        { key, version: baseVersion },
        { $set: { json, updatedAt: now }, $inc: { version: 1 } },
        { new: true }
      ).lean();
    }
    if (!doc) {
      const ultimo = await AppState.findOne({ key }).lean();
      return res.status(409).json({
        error: 'conflicto',
        doc: ultimo ? vistaDe(req, key, ultimo) : { value: null, version: 0 }
      });
    }
    if (key === 'users') {
      cache.users = Array.isArray(value) ? value : [];
      cache.usersVersion = doc.version;
      reflejarClientes(value).catch(e => console.error('⚠️ Espejo clientes:', e.message));
    }
    res.json({ success: true, version: doc.version, updatedAt: doc.updatedAt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fotos y archivos (chequeos, protocolos). Solo con sesión.
// Cada archivo recibe una clave aleatoria imposible de adivinar.
const TIPOS_SEGUROS = /^(image\/(jpeg|png|webp|gif|heic|heif|avif)|application\/pdf)$/i;
app.post('/api/archivos', conSesion, express.raw({ type: () => true, limit: '10mb' }), async (req, res) => {
  try {
    if (!req.body || !req.body.length) return res.status(400).json({ error: 'Archivo vacío' });
    let nombre = 'archivo';
    try { nombre = decodeURIComponent(req.get('X-File-Name') || 'archivo').slice(0, 120); } catch (e) {}
    const tipo = String(req.get('X-File-Type') || 'application/octet-stream').slice(0, 80);
    const clave = crypto.randomBytes(18).toString('hex');
    await Archivo.create({ nombre, tipo, tamano: req.body.length, datos: req.body, clave, subidoPor: req.quien.rol === 'user' ? req.quien.uid : req.quien.coach });
    res.json({ success: true, url: '/api/archivos/' + clave });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/archivos/:id', conSesion, async (req, res) => {
  try {
    const id = String(req.params.id || '');
    let a = null;
    if (/^[a-f0-9]{36}$/.test(id)) a = await Archivo.findOne({ clave: id });
    else if (mongoose.isValidObjectId(id) && req.quien.rol === 'coach') a = await Archivo.findById(id); // enlaces antiguos: solo coach
    if (!a) return res.status(404).end();
    const tipo = TIPOS_SEGUROS.test(a.tipo || '') ? a.tipo : 'application/octet-stream';
    res.set('Content-Type', tipo);
    if (tipo === 'application/octet-stream') res.set('Content-Disposition', 'attachment');
    res.set('Cache-Control', 'private, max-age=31536000, immutable');
    res.send(a.datos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cualquier otra ruta /api que no exista: error claro (no el index)
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ===============================================
// SERVIR INDEX.HTML (IMPORTANTE!)
// ===============================================

app.get('*', enviarIndex);

// ===============================================
// INICIAR SERVIDOR
// ===============================================

app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║   YAYO APP v65 - BACKEND RUNNING       ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log('✅ Servidor corriendo en puerto ' + PORT);
  console.log('📊 Base de datos: yayo_v65');
  console.log('🔗 API disponible en: http://localhost:' + PORT);
  console.log('');
});

module.exports = app;