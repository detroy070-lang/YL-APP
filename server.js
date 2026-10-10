require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB conectado"))
  .catch(e => console.error("❌ Error:", e.message));

const userSchema = new mongoose.Schema({
  usuario: String,
  passwordHash: String,
  contrasena: String,
  password: String,
  role: String
});

const clientSchema = new mongoose.Schema({
  usuario: String,
  contraseña: String,
  nombreCompleto: String,
  telefono: String,
  edad: Number,
  coach: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("Usuario", userSchema, "usuarios_v65");
const Client = mongoose.model("Cliente", clientSchema, "clientes_v64");

app.post("/api/auth/login", async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;
    const u = await User.findOne({ usuario });
    if (!u) return res.status(401).json({ error: "Credenciales incorrectas" });
    const pwd = u.passwordHash || u.contrasena || u.password;
    if (pwd !== contrasena) return res.status(401).json({ error: "Credenciales incorrectas" });
    const token = jwt.sign({ usuario: u.usuario, role: u.role }, process.env.JWT_SECRET, { expiresIn: "24h" });
    res.json({ success: true, token, usuario: u.usuario });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function auth(req, res, next) {
  const t = req.headers.authorization?.split(" ")[1];
  if (!t) return res.status(401).json({ error: "Token requerido" });
  jwt.verify(t, process.env.JWT_SECRET, (e, u) => {
    if (e) return res.status(403).json({ error: "Token inválido" });
    req.user = u;
    next();
  });
}

app.post("/api/clientes", auth, async (req, res) => {
  try {
    const { usuario, nombreCompleto, telefono, edad } = req.body;
    if (!usuario) return res.status(400).json({ error: "Usuario requerido" });
    const existe = await Client.findOne({ usuario });
    if (existe) return res.status(400).json({ error: "Ya existe" });
    const c = new Client({ usuario, contraseña: "1234", nombreCompleto: nombreCompleto || "", telefono: telefono || "", edad: edad || null, coach: req.user.usuario });
    await c.save();
    res.json({ success: true, cliente: c });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/clientes", auth, async (req, res) => {
  try {
    const c = await Client.find({ coach: req.user.usuario });
    res.json(c);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log("✅ Servidor en puerto 3000"));
