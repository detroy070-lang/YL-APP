// ===============================================
// YAYO APP v65 - BACKEND SERVER (Express + MongoDB)
// ===============================================

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ===============================================
// MIDDLEWARE
// ===============================================

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));

// ===============================================
// SERVIR ARCHIVOS ESTÁTICOS (IMPORTANTE!)
// ===============================================

app.use((req, res, next) => {
  if (/^\/(backend|node_modules)(\/|$)/i.test(req.path)) return res.status(404).end();
  next();
});
app.use(express.static(path.join(__dirname, '..')));

// ===============================================
// CONECTAR MONGODB
// ===============================================

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB conectado');
    console.log(`📊 Database: yayo_v65`);
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

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const coach = await Coach.findOne({ username, password });
    if (!coach) {
      return res.status(401).json({ error: 'Usuario o contraseña inválidos' });
    }
    res.json({
      success: true,
      user: {
        id: coach._id,
        nombre: coach.nombre,
        username: coach.username,
        rol: 'coach'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clientes', async (req, res) => {
  try {
    const { nombre, username, password, edad, objetivo, coach_id } = req.body;
    const cliente = new Cliente({
      nombre, username, password, edad, objetivo, coach_id, status: 'activo'
    });
    await cliente.save();
    res.json({ success: true, cliente });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/coach/mis-clientes', async (req, res) => {
  try {
    const coach_id = req.query.coach_id;
    const clientes = await Cliente.find({ coach_id });
    res.json({ clientes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clientes/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'No encontrado' });
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, cliente });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/clientes/:id', async (req, res) => {
  try {
    await Cliente.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/dietas', async (req, res) => {
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

app.get('/api/dietas/:id', async (req, res) => {
  try {
    const dieta = await Dieta.findById(req.params.id);
    if (!dieta) return res.status(404).json({ error: 'No encontrado' });
    res.json(dieta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clientes/:id/dietas', async (req, res) => {
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

// Todos los bloques de una vez (carga inicial de la app)
app.get('/api/state', async (req, res) => {
  try {
    const docs = await AppState.find({}).lean();
    const out = {};
    docs.forEach(d => { out[d.key] = formatoEstado(d); });
    res.set('Cache-Control', 'no-store');
    res.json({ docs: out });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Solo las versiones (la app pregunta esto cada pocos segundos)
app.get('/api/state/versions', async (req, res) => {
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

app.get('/api/state/:key', async (req, res) => {
  try {
    if (!KEY_OK.test(req.params.key)) return res.status(400).json({ error: 'Bloque inválido' });
    const d = await AppState.findOne({ key: req.params.key }).lean();
    res.set('Cache-Control', 'no-store');
    if (!d) return res.json({ exists: false });
    res.json(Object.assign({ exists: true }, formatoEstado(d)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/state/:key', async (req, res) => {
  try {
    const key = req.params.key;
    if (!KEY_OK.test(key)) return res.status(400).json({ error: 'Bloque inválido' });
    const body = req.body || {};
    const value = body.value === undefined ? null : body.value;
    const baseVersion = body.baseVersion;
    const json = JSON.stringify(value);
    if (Buffer.byteLength(json) > 15 * 1024 * 1024) {
      return res.status(413).json({ error: 'El bloque es demasiado grande' });
    }
    const now = new Date();
    let doc = null;
    if (typeof baseVersion !== 'number') {
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
      const actual = await AppState.findOne({ key }).lean();
      return res.status(409).json({
        error: 'conflicto',
        doc: actual ? formatoEstado(actual) : { value: null, version: 0 }
      });
    }
    if (key === 'users') {
      reflejarClientes(value).catch(e => console.error('⚠️ Espejo clientes:', e.message));
    }
    res.json({ success: true, version: doc.version, updatedAt: doc.updatedAt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fotos y archivos (chequeos, protocolos)
app.post('/api/archivos', express.raw({ type: () => true, limit: '10mb' }), async (req, res) => {
  try {
    if (!req.body || !req.body.length) return res.status(400).json({ error: 'Archivo vacío' });
    let nombre = 'archivo';
    try { nombre = decodeURIComponent(req.get('X-File-Name') || 'archivo'); } catch (e) {}
    const tipo = req.get('X-File-Type') || 'application/octet-stream';
    const a = await Archivo.create({ nombre, tipo, tamano: req.body.length, datos: req.body });
    res.json({ success: true, url: '/api/archivos/' + a._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/archivos/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).end();
    const a = await Archivo.findById(req.params.id);
    if (!a) return res.status(404).end();
    res.set('Content-Type', a.tipo || 'application/octet-stream');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

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