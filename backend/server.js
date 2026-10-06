// ===============================================
// YAYO APP v65 - BACKEND SERVER (Express + MongoDB)
// ===============================================

require('dotenv').config({ path: '../.env' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

// ===============================================
// MIDDLEWARE
// ===============================================

app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));

// ===============================================
// CONECTAR MONGODB
// ===============================================

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('✅ MongoDB conectado');
    console.log(`📊 Database: yayo_v65`);
  })
  .catch(err => {
    console.error('❌ Error MongoDB:', err.message);
    process.exit(1);
  });

// ===============================================
// SCHEMAS & MODELS
// ===============================================

// Coach Schema
const coachSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  usuario: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  telefono: String,
  especialidad: String,
  clientes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' }],
  createdAt: { type: Date, default: Date.now }
});

// Cliente Schema
const clienteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  usuario: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  edad: Number,
  coach_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach', required: true },
  objetivo: String,
  status: { type: String, default: 'Activo' },
  peso_inicial: Number,
  createdAt: { type: Date, default: Date.now }
});

// Dieta Schema
const dietaSchema = new mongoose.Schema({
  coach_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach', required: true },
  cliente_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' },
  nombre: String,
  kcal_objetivo: Number,
  macros: { p: Number, c: Number, f: Number },
  comidas: [
    {
      nombre: String,
      alimentos: [String],
      kcal: Number,
      macros: { p: Number, c: Number, f: Number }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

// Routine Schema
const routineSchema = new mongoose.Schema({
  coach_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach', required: true },
  cliente_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' },
  nombre: String,
  dia: String,
  ejercicios: [
    {
      nombre: String,
      sets: Number,
      reps: Number,
      weight: Number,
      RIR: Number
    }
  ],
  sessions: [
    {
      fecha: Date,
      completada: Boolean,
      pesos_usados: [Number],
      notas: String
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

// Models
const Coach = mongoose.model('Coach', coachSchema);
const Cliente = mongoose.model('Cliente', clienteSchema);
const Dieta = mongoose.model('Dieta', dietaSchema);
const Routine = mongoose.model('Routine', routineSchema);

// ===============================================
// MIDDLEWARE - AUTH
// ===============================================

async function verificarToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Formato de token inválido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ===============================================
// ENDPOINTS - AUTH
// ===============================================

// 1️⃣ LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    // Buscar coach
    const coach = await Coach.findOne({ usuario });
    if (!coach) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Validar contraseña
    const passwordOk = await bcryptjs.compare(password, coach.password);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Generar JWT
    const token = jwt.sign(
      { id: coach._id, usuario: coach.usuario, role: 'coach' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      token,
      role: 'coach',
      usuario_id: coach._id,
      nombre: coach.nombre
    });

  } catch (err) {
    console.error('Error login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ===============================================
// ENDPOINTS - USUARIOS (CLIENTES)
// ===============================================

// 2️⃣ CREAR CLIENTE (Coach)
app.post('/api/clientes', verificarToken, async (req, res) => {
  try {
    const { nombre, usuario, password, edad, objetivo } = req.body;

    // Validar que sea coach
    const coach = await Coach.findById(req.usuario.id);
    if (!coach) {
      return res.status(403).json({ error: 'Coach no encontrado' });
    }

    // Verificar usuario único
    const existente = await Cliente.findOne({ usuario });
    if (existente) {
      return res.status(400).json({ error: 'Usuario ya existe' });
    }

    // Encriptar contraseña
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Crear cliente
    const cliente = new Cliente({
      nombre,
      usuario,
      password: hashedPassword,
      edad,
      objetivo,
      coach_id: req.usuario.id,
      status: 'Activo'
    });

    await cliente.save();

    // Agregar cliente a lista del coach
    coach.clientes.push(cliente._id);
    await coach.save();

    res.status(201).json({
      message: 'Cliente creado exitosamente',
      cliente_id: cliente._id,
      cliente
    });

  } catch (err) {
    console.error('Error crear cliente:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3️⃣ VER MIS CLIENTES (Coach)
app.get('/api/coach/mis-clientes', verificarToken, async (req, res) => {
  try {
    const clientes = await Cliente.find({ coach_id: req.usuario.id });
    res.json(clientes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4️⃣ VER CLIENTE ESPECÍFICO
app.get('/api/clientes/:id', verificarToken, async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Validar que sea su coach
    if (cliente.coach_id.toString() !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    res.json(cliente);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5️⃣ EDITAR CLIENTE (Coach)
app.put('/api/clientes/:id', verificarToken, async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    if (cliente.coach_id.toString() !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    const { nombre, edad, objetivo, status } = req.body;
    if (nombre) cliente.nombre = nombre;
    if (edad) cliente.edad = edad;
    if (objetivo) cliente.objetivo = objetivo;
    if (status) cliente.status = status;

    await cliente.save();
    res.json({ message: 'Cliente actualizado', cliente });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6️⃣ ELIMINAR CLIENTE (Coach)
app.delete('/api/clientes/:id', verificarToken, async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    if (cliente.coach_id.toString() !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    // Remover de lista del coach
    const coach = await Coach.findById(req.usuario.id);
    coach.clientes = coach.clientes.filter(id => id.toString() !== req.params.id);
    await coach.save();

    // Eliminar cliente
    await Cliente.findByIdAndDelete(req.params.id);

    res.json({ message: 'Cliente eliminado' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================================
// ENDPOINTS - DIETAS
// ===============================================

// 7️⃣ CREAR DIETA (Coach)
app.post('/api/dietas', verificarToken, async (req, res) => {
  try {
    const { cliente_id, nombre, kcal_objetivo, macros, comidas } = req.body;

    // Validar que cliente pertenece a este coach
    const cliente = await Cliente.findById(cliente_id);
    if (!cliente || cliente.coach_id.toString() !== req.usuario.id) {
      return res.status(403).json({ error: 'Cliente no autorizado' });
    }

    const dieta = new Dieta({
      coach_id: req.usuario.id,
      cliente_id,
      nombre,
      kcal_objetivo,
      macros,
      comidas
    });

    await dieta.save();

    res.status(201).json({
      message: 'Dieta creada',
      dieta_id: dieta._id,
      dieta
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8️⃣ VER DIETA
app.get('/api/dietas/:id', verificarToken, async (req, res) => {
  try {
    const dieta = await Dieta.findById(req.params.id);
    if (!dieta) {
      return res.status(404).json({ error: 'Dieta no encontrada' });
    }

    // Validar acceso
    if (dieta.coach_id.toString() !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    res.json(dieta);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9️⃣ VER DIETAS DEL CLIENTE
app.get('/api/clientes/:cliente_id/dietas', verificarToken, async (req, res) => {
  try {
    const dietas = await Dieta.find({ cliente_id: req.params.cliente_id, coach_id: req.usuario.id });
    res.json(dietas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================================
// ENDPOINTS - ALIMENTOS (READ ONLY)
// ===============================================

// 🔟 VER ALIMENTOS
app.get('/api/alimentos', async (req, res) => {
  try {
    const alimentos = [
      { nombre: "Arroz blanco cocido", grupo: "Carbohidrato", kcal: 130, p: 2.4, c: 28.2, f: 0.3 },
      { nombre: "Arroz integral cocido", grupo: "Carbohidrato", kcal: 111, p: 2.6, c: 23.0, f: 0.9 },
      { nombre: "Avena cocida", grupo: "Carbohidrato", kcal: 68, p: 2.4, c: 12.0, f: 1.4 },
      { nombre: "Pan integral", grupo: "Carbohidrato", kcal: 265, p: 8.4, c: 47.0, f: 3.3 },
      { nombre: "Arepa", grupo: "Carbohidrato", kcal: 212, p: 4.2, c: 41.0, f: 3.6 },
      { nombre: "Pechuga de pollo cocida", grupo: "Proteína", kcal: 165, p: 31.0, c: 0.0, f: 3.6 },
      { nombre: "Pechuga de pavo cocida", grupo: "Proteína", kcal: 135, p: 29.9, c: 0.0, f: 0.6 },
      { nombre: "Carne de res magra cocida", grupo: "Proteína", kcal: 180, p: 26.4, c: 0.0, f: 7.9 },
      { nombre: "Huevo cocido", grupo: "Proteína", kcal: 155, p: 13.0, c: 1.1, f: 11.0 },
      { nombre: "Claras cocidas", grupo: "Proteína", kcal: 52, p: 11.1, c: 0.7, f: 0.2 },
      { nombre: "Atún en agua", grupo: "Proteína", kcal: 96, p: 21.5, c: 0.0, f: 0.6 },
      { nombre: "Salmón cocido", grupo: "Proteína", kcal: 206, p: 22.0, c: 0.0, f: 12.3 },
      { nombre: "Tilapia cocida", grupo: "Proteína", kcal: 128, p: 26.2, c: 0.0, f: 2.7 },
      { nombre: "Leche descremada", grupo: "Lácteo", kcal: 36, p: 3.6, c: 5.0, f: 0.1 },
      { nombre: "Leche", grupo: "Lácteo", kcal: 61, p: 3.2, c: 4.8, f: 3.3 },
      { nombre: "Yogur griego", grupo: "Lácteo", kcal: 59, p: 10.2, c: 3.3, f: 0.4 },
      { nombre: "Queso campesino", grupo: "Lácteo", kcal: 264, p: 25.0, c: 1.3, f: 17.5 },
      { nombre: "Frijoles cocidos", grupo: "Leguminosa", kcal: 127, p: 8.7, c: 23.0, f: 0.5 },
      { nombre: "Lentejas cocidas", grupo: "Leguminosa", kcal: 116, p: 9.0, c: 20.0, f: 0.4 },
      { nombre: "Garbanzos cocidos", grupo: "Leguminosa", kcal: 134, p: 8.9, c: 22.5, f: 2.1 },
      { nombre: "Banano", grupo: "Fruta", kcal: 89, p: 1.1, c: 22.8, f: 0.3 },
      { nombre: "Mango", grupo: "Fruta", kcal: 60, p: 0.8, c: 15.0, f: 0.4 },
      { nombre: "Brócoli cocido", grupo: "Verdura", kcal: 34, p: 2.8, c: 6.6, f: 0.4 },
      { nombre: "Zanahoria cocida", grupo: "Verdura", kcal: 34, p: 0.7, c: 7.7, f: 0.2 },
      { nombre: "Lechuga", grupo: "Verdura", kcal: 15, p: 1.2, c: 2.9, f: 0.2 },
      { nombre: "Tomate", grupo: "Verdura", kcal: 18, p: 0.9, c: 3.9, f: 0.2 },
      { nombre: "Espinaca cocida", grupo: "Verdura", kcal: 23, p: 2.7, c: 3.6, f: 0.4 },
      { nombre: "Aguacate", grupo: "Grasa", kcal: 160, p: 2.0, c: 8.6, f: 14.7 },
      { nombre: "Maní", grupo: "Grasa", kcal: 567, p: 25.8, c: 16.1, f: 49.2 },
      { nombre: "Almendras", grupo: "Grasa", kcal: 579, p: 21.1, c: 21.6, f: 50.6 },
      { nombre: "Nueces", grupo: "Grasa", kcal: 654, p: 15.2, c: 13.7, f: 65.2 },
      { nombre: "Crema de maní", grupo: "Grasa", kcal: 588, p: 25.0, c: 20.0, f: 50.0 },
      { nombre: "Aceite de oliva", grupo: "Grasa", kcal: 884, p: 0.0, c: 0.0, f: 100.0 },
      { nombre: "Semillas de chía", grupo: "Grasa", kcal: 486, p: 16.5, c: 42.1, f: 30.7 },
      { nombre: "Papa cocida", grupo: "Carbohidrato", kcal: 77, p: 1.7, c: 17.5, f: 0.1 },
      { nombre: "Papa criolla cocida", grupo: "Carbohidrato", kcal: 80, p: 2.0, c: 18.0, f: 0.2 },
      { nombre: "Camote cocido", grupo: "Carbohidrato", kcal: 86, p: 1.6, c: 20.1, f: 0.1 },
      { nombre: "Plátano cocido", grupo: "Carbohidrato", kcal: 122, p: 1.3, c: 29.3, f: 0.3 },
      { nombre: "Yuca cocida", grupo: "Carbohidrato", kcal: 132, p: 0.9, c: 31.0, f: 0.3 },
      { nombre: "Yuca cruda", grupo: "Carbohidrato", kcal: 160, p: 1.4, c: 38.0, f: 0.3 },
      { nombre: "Papa cruda", grupo: "Carbohidrato", kcal: 77, p: 2.1, c: 17.5, f: 0.1 },
      { nombre: "Pechuga de pollo cruda", grupo: "Proteína", kcal: 106, p: 21.0, c: 0.0, f: 2.3 },
      { nombre: "Huevo crudo", grupo: "Proteína", kcal: 155, p: 13.0, c: 1.1, f: 11.0 },
      { nombre: "Claras crudo", grupo: "Proteína", kcal: 52, p: 11.1, c: 0.7, f: 0.2 },
      { nombre: "Tilapia crudo", grupo: "Proteína", kcal: 82, p: 17.4, c: 0.0, f: 0.7 },
      { nombre: "Salmón crudo", grupo: "Proteína", kcal: 208, p: 20.0, c: 0.0, f: 13.0 },
      { nombre: "Carne de res magra crudo", grupo: "Proteína", kcal: 106, p: 20.1, c: 0.0, f: 2.3 }
    ];

    res.json(alimentos);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================================
// HEALTH CHECK
// ===============================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'YAYO App Backend v65',
    mongodb: 'Conectado',
    timestamp: new Date()
  });
});

// ===============================================
// ERROR HANDLING
// ===============================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ===============================================
// INICIAR SERVIDOR
// ===============================================

app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   YAYO APP v65 - BACKEND RUNNING     ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`📊 Base de datos: yayo_v65`);
  console.log(`🔗 API disponible en: http://localhost:${PORT}`);
  console.log('');
});

module.exports = app;
