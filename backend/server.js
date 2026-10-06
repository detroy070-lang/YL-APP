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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));

// ===============================================
// SERVIR ARCHIVOS ESTÁTICOS (IMPORTANTE!)
// ===============================================

app.use(express.static(path.join(__dirname, '..')));

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