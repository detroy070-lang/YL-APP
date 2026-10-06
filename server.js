const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'yayo-secret-key';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB conectado');
}).catch(err => {
  console.error('❌ Error MongoDB:', err);
});

const coachSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  nombre: String,
  createdAt: { type: Date, default: Date.now }
});

const clienteSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  nombreCompleto: String,
  whatsapp: String,
  edad: Number,
  objetivo: String,
  tipoPerfil: { type: String, enum: ['general', 'fisiculturista'], default: 'general' },
  color: { type: String, default: '#ff2d55' },
  coachId: mongoose.Schema.Types.ObjectId,
  coachUsername: String,
  password: { type: String, default: '1234' },
  estado: { type: String, enum: ['activo', 'pausa', 'inactivo'], default: 'activo' },
  createdAt: { type: Date, default: Date.now }
});

const alimentoSchema = new mongoose.Schema({
  nombre: String,
  categoria: String,
  calorias: Number,
  proteina: Number,
  grasa: Number,
  carbohidratos: Number,
  unidad: String,
  peso: Number
});

const Coach = mongoose.model('Coach', coachSchema);
const Cliente = mongoose.model('Cliente', clienteSchema);
const Alimento = mongoose.model('Alimento', alimentoSchema);

app.post('/api/auth/login', async (req, res) => {
  try {
    const { user, password } = req.body;
    const coach = await Coach.findOne({ username: user.toLowerCase() });
    
    if (!coach || coach.passwordHash !== password) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { coachId: coach._id, username: coach.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      usuario: coach.username,
      coachId: coach._id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const verifyToken = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sin autorización' });
  }

  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.coachId = decoded.coachId;
    req.coachUsername = decoded.username;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

app.post('/api/clientes', verifyToken, async (req, res) => {
  try {
    const { username, nombreCompleto, whatsapp, edad, objetivo, tipoPerfil, color } = req.body;

    const existente = await Cliente.findOne({ username: username.toLowerCase() });
    if (existente) {
      return res.status(400).json({ error: 'Usuario ya existe' });
    }

    const cliente = new Cliente({
      username: username.toLowerCase(),
      nombreCompleto: nombreCompleto || username,
      whatsapp: whatsapp || '',
      edad: edad || null,
      objetivo: objetivo || 'Sin definir',
      tipoPerfil: tipoPerfil || 'general',
      color: color || '#ff2d55',
      coachId: req.coachId,
      coachUsername: req.coachUsername,
      password: '1234',
      estado: 'activo'
    });

    await cliente.save();
    res.json({
      success: true,
      cliente: {
        id: cliente._id,
        username: cliente.username,
        nombreCompleto: cliente.nombreCompleto,
        estado: cliente.estado
      }
    });
  } catch (error) {
    console.error('Error creando cliente:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clientes', verifyToken, async (req, res) => {
  try {
    const clientes = await Cliente.find({ coachId: req.coachId });
    res.json({ success: true, clientes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/clientes/:id', verifyToken, async (req, res) => {
  try {
    const { estado } = req.body;
    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id,
      { estado },
      { new: true }
    );
    res.json({ success: true, cliente });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ENDPOINT: Obtener alimentos
app.get('/api/alimentos', async (req, res) => {
  try {
    const alimentos = await Alimento.find({});
    res.json({ success: true, alimentos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ENDPOINT: Buscar alimento por nombre
app.get('/api/alimentos/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const alimentos = await Alimento.find({
      nombre: { $regex: query, $options: 'i' }
    });
    res.json({ success: true, alimentos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor YAYO en puerto ${PORT}`);
});
