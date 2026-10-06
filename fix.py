import os
import sys

path = r"C:\Users\ferne\OneDrive\Documentos\YAYO-APP"
os.chdir(path)

# Eliminar archivos viejos
if os.path.exists("server.js"):
    os.remove("server.js")
    print("❌ server.js eliminado")

if os.path.exists("index.html"):
    os.remove("index.html")
    print("❌ index.html eliminado")

# Crear server.js
server_code = '''require("dotenv").config();
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
'''

with open("server.js", "w", encoding="utf-8") as f:
    f.write(server_code)
print("✅ server.js creado")

# Crear index.html
html_code = '''<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YAYO - Coach System</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #1a1a1a; color: #fff; }
        .container { max-width: 500px; margin: 50px auto; padding: 20px; }
        .login-screen { display: block; }
        .app-screen { display: none; }
        input, button, select { padding: 10px; margin: 10px 0; width: 100%; border: none; border-radius: 5px; }
        button { background: #ff1493; color: white; cursor: pointer; font-weight: bold; }
        button:hover { background: #ff69b4; }
        .card { background: #2a2a2a; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .success { background: #90EE90; color: black; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .error { background: #FFB6C6; color: black; padding: 10px; margin: 10px 0; border-radius: 5px; }
        h1 { text-align: center; margin-bottom: 20px; }
        h2 { font-size: 18px; margin-top: 20px; }
    </style>
</head>
<body>
<div class="container">
    <div id="loginScreen" class="login-screen">
        <h1>🏋️ YAYO COACH</h1>
        <div class="card">
            <h2>Iniciar Sesión</h2>
            <input type="text" id="loginUser" placeholder="Usuario">
            <input type="password" id="loginPass" placeholder="Contraseña">
            <button onclick="handleLogin()">Entrar</button>
            <div id="loginMsg"></div>
        </div>
    </div>
    <div id="appScreen" class="app-screen">
        <h1>Bienvenido, <span id="userName">Coach</span></h1>
        <button onclick="logout()" style="background: #666;">Cerrar Sesión</button>
        <div class="card">
            <h2>Crear Cliente</h2>
            <input type="text" id="clientUser" placeholder="Usuario">
            <input type="text" id="clientName" placeholder="Nombre Completo">
            <input type="text" id="clientPhone" placeholder="Teléfono">
            <input type="number" id="clientAge" placeholder="Edad">
            <button onclick="createClient()">Crear Cliente</button>
            <div id="clientMsg"></div>
        </div>
        <div class="card">
            <h2>Clientes</h2>
            <div id="clientList"></div>
        </div>
    </div>
</div>
<script>
const API = 'http://localhost:3000';
async function handleLogin() {
    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;
    const msg = document.getElementById('loginMsg');
    if (!user || !pass) {
        msg.innerHTML = '<div class="error">Usuario y contraseña requeridos</div>';
        return;
    }
    try {
        const res = await fetch(API + '/api/auth/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({usuario: user, contrasena: pass})
        });
        const data = await res.json();
        console.log('Login response:', data);
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', user);
            console.log('✓ Token guardado');
            document.getElementById('userName').textContent = user;
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('appScreen').style.display = 'block';
            loadClients();
        } else {
            msg.innerHTML = '<div class="error">Usuario o contraseña incorrectos</div>';
        }
    } catch (err) {
        msg.innerHTML = '<div class="error">Error: ' + err.message + '</div>';
    }
}
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    document.getElementById('appScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'block';
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
}
async function createClient() {
    const token = localStorage.getItem('token');
    const usuario = localStorage.getItem('usuario');
    const clientUser = document.getElementById('clientUser').value;
    const clientName = document.getElementById('clientName').value;
    const clientPhone = document.getElementById('clientPhone').value;
    const clientAge = document.getElementById('clientAge').value;
    const msg = document.getElementById('clientMsg');
    if (!clientUser) {
        msg.innerHTML = '<div class="error">Usuario requerido</div>';
        return;
    }
    try {
        const res = await fetch(API + '/api/clientes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                usuario: clientUser,
                nombreCompleto: clientName,
                telefono: clientPhone,
                edad: clientAge || null
            })
        });
        const data = await res.json();
        console.log('Client response:', data);
        if (data.success) {
            msg.innerHTML = '<div class="success">✅ Cliente creado en MongoDB</div>';
            document.getElementById('clientUser').value = '';
            document.getElementById('clientName').value = '';
            document.getElementById('clientPhone').value = '';
            document.getElementById('clientAge').value = '';
            loadClients();
        } else {
            msg.innerHTML = '<div class="error">Error: ' + (data.error || 'No se guardó') + '</div>';
        }
    } catch (err) {
        msg.innerHTML = '<div class="error">Error: ' + err.message + '</div>';
    }
}
async function loadClients() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(API + '/api/clientes', {
            headers: {'Authorization': 'Bearer ' + token}
        });
        const clients = await res.json();
        const list = document.getElementById('clientList');
        if (Array.isArray(clients) && clients.length > 0) {
            list.innerHTML = clients.map(c => 
                '<div style="padding:10px; background:#333; margin:5px 0; border-radius:3px;">' +
                c.usuario + ' - ' + (c.nombreCompleto || 'Sin nombre') +
                '</div>'
            ).join('');
        } else {
            list.innerHTML = '<p>Sin clientes aún</p>';
        }
    } catch (err) {
        console.error('Error loading clients:', err);
    }
}
window.addEventListener('load', () => {
    const token = localStorage.getItem('token');
    const usuario = localStorage.getItem('usuario');
    if (token && usuario) {
        document.getElementById('userName').textContent = usuario;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appScreen').style.display = 'block';
        loadClients();
    }
});
</script>
</body>
</html>
'''

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html_code)
print("✅ index.html creado")

print("\n✅ LISTO - Presiona cualquier tecla")
os.system("pause")
