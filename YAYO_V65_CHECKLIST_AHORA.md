# ⚡ YAYO V65 — CHECKLIST EJECUTABLE AHORA

**Última actualización:** 29 de septiembre 2026  
**Responsable:** Emanuel + Yayo  
**Deadline:** Sin simulación. Real o error.

---

## 🔴 ANTES DE EMPEZAR

**Verifica que TODOS estos archivos existen:**

- [ ] `/mnt/user-data/outputs/YAYO_V65_COMPLETA_FINAL.html` (Frontend V63)
- [ ] `/mnt/user-data/outputs/YAYO_BACKEND_V64_COMPLETE.js` (Backend)
- [ ] `/mnt/user-data/outputs/package_v64.json` (Dependencies)
- [ ] `/mnt/user-data/outputs/YAYO_V65_INTEGRACION_REAL.js` (NUEVO - API Client)
- [ ] `/mnt/user-data/outputs/YAYO_V65_PLAN_INTEGRACION_P0.md` (NUEVO - Plan)

Si falta alguno: **PARAR Y AVISAR**

---

## ⏱️ TIEMPO ESTIMADO: 3-4 HORAS

- [ ] Setup backend: 30 min
- [ ] Test endpoints: 20 min
- [ ] Conectar frontend login: 30 min
- [ ] Test login real: 20 min
- [ ] Conectar usuarios: 45 min
- [ ] Test multiusuario: 30 min
- [ ] Documentación: 30 min

**Total realista:** 2.5-3.5 horas si no hay blockers

---

## 📋 STEP 1: SETUP BACKEND (30 minutos)

### 1.1 Tener Node.js instalado

```bash
node --version  # Debe ser 16+
npm --version
```

Si no está instalado: https://nodejs.org

**Verificado:** [ ]

---

### 1.2 Tener MongoDB

**Opción A: MongoDB Atlas (Recomendado - gratuito)**
1. Ir a https://www.mongodb.com/cloud/atlas
2. Crear cuenta gratuita
3. Crear cluster gratuito (M0 = 512MB)
4. Obtener connection string
5. Reemplazar en `.env`

**Opción B: MongoDB local (para desarrollo)**
```bash
mongosh  # Si está instalado localmente
```

**Verificado:** [ ]

---

### 1.3 Crear `.env` con credenciales

Basarse en `/mnt/user-data/outputs/.env.example`:

```env
# .env (NUNCA commitear esto)

# MongoDB
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/yayo_v65

# JWT
JWT_SECRET=tu-secreto-super-seguro-cambiar-en-produccion
JWT_REFRESH_SECRET=tu-refresh-secreto-super-seguro

# Redis (opcional)
REDIS_URL=redis://localhost:6379
# O usar Upstash: redis://default:password@host:port

# Frontend URL
FRONTEND_URL=http://localhost:8080

# Ambiente
NODE_ENV=development
PORT=3000
```

**Verificado:** [ ]

---

### 1.4 Instalar dependencias

```bash
cd backend  # O donde esté YAYO_BACKEND_V64_COMPLETE.js
npm install
```

Debe crear carpeta `node_modules` (100MB+)

**Verificado:** [ ]

---

### 1.5 Inicializar usuarios de prueba

En MongoDB, crear:

```javascript
db.usuarios_v65.insertOne({
  nombre: "Yayo Daza",
  usuario: "yayo",
  passwordHash: bcrypt.hashSync("1234", 10),  // En producción NUNCA plaintext
  email: "yayo@example.com",
  role: "coach",
  activo: true,
  createdAt: new Date()
})

db.usuarios_v65.insertOne({
  nombre: "Prueba Usuario 1",
  codigoAcceso: "ABC123XYZ",
  email: "usuario1@example.com",
  role: "usuario",
  coachId: "id-de-yayo",  // Referencia al coach
  activo: true,
  createdAt: new Date()
})
```

O usar script de inicialización si existe.

**Verificado:** [ ]

---

### 1.6 Arrancar backend

```bash
npm start
# Esperado: "Server running on http://localhost:3000"
```

Dejar corriendo en terminal.

**Verificado:** [ ]

---

## 📋 STEP 2: TEST ENDPOINTS BACKEND (20 minutos)

**Usar Postman, Insomnia o curl desde terminal**

### 2.1 Health check

```bash
curl http://localhost:3000/api/health
```

**Resultado esperado:**
```json
{
  "status": "ok",
  "timestamp": "2026-09-29T20:00:00Z"
}
```

**Verificado:** [ ]

---

### 2.2 Login coach

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"yayo","contrasena":"1234"}'
```

**Resultado esperado:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "usuario": {
      "id": "507f1f77bcf86cd799439011",
      "nombre": "Yayo Daza",
      "role": "coach"
    }
  }
}
```

**Si no funciona:**
- [ ] Revisar que usuario "yayo" existe en BD
- [ ] Revisar que contraseña es correcta
- [ ] Revisar logs del backend

**Verificado:** [ ]

---

### 2.3 Obtener usuario actual (con token)

```bash
# Reemplazar TOKEN_AQUI con token del paso anterior
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer TOKEN_AQUI"
```

**Resultado esperado:**
```json
{
  "id": "...",
  "nombre": "Yayo Daza",
  "role": "coach"
}
```

**Verificado:** [ ]

---

### 2.4 Listar usuarios (con token)

```bash
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer TOKEN_AQUI"
```

**Resultado esperado:**
```json
[
  { "id": "...", "nombre": "Prueba Usuario 1", "role": "usuario" },
  ...
]
```

**Verificado:** [ ]

---

## 📋 STEP 3: CONECTAR FRONTEND LOGIN (30 minutos)

### 3.1 Incluir script de integración

En `YAYO_V65_COMPLETA_FINAL.html`, **ANTES** de cualquier otro script, agregar:

```html
<script src="YAYO_V65_INTEGRACION_REAL.js"></script>
```

o si los archivos están en carpetas:

```html
<script src="../YAYO_V65_INTEGRACION_REAL.js"></script>
```

**Verificado:** [ ]

---

### 3.2 Localizar función login() vieja

Buscar en HTML:

```bash
grep -n "function login()" YAYO_V65_COMPLETA_FINAL.html
```

Encontrará algo como línea 599.

**Verificado:** [ ]

---

### 3.3 REEMPLAZAR función login()

**ANTES (vieja, simulada):**
```javascript
function login(){
  const usuario = document.getElementById('usuario').value;
  const contrasena = document.getElementById('contrasena').value;
  
  if(usuario==='yayo'&&contrasena==='1234'){
    localStorage.setItem('usuario', usuario);
    // ...mostrar dashboard
  }
}
```

**DESPUÉS (nueva, REAL):**
```javascript
async function login(){
  const usuario = document.getElementById('usuario').value;
  const contrasena = document.getElementById('contrasena').value;
  
  if(!usuario || !contrasena){
    showError('Completa usuario y contraseña');
    return;
  }

  try {
    const result = await auth.login(usuario, contrasena);
    
    if(result.success){
      showSuccess(`Bienvenido, ${result.usuario.nombre}`);
      // Guardar nombre visible
      document.getElementById('nombreCoach').textContent = result.usuario.nombre;
      // Mostrar dashboard
      showPage('dashboard');
    } else {
      showError(result.error || 'Login fallido');
    }
  } catch(error){
    showError('Error conectando con servidor: ' + error.message);
  }
}
```

**Verificado:** [ ]

---

### 3.4 Actualizar API_BASE_URL

En navegador console:

```javascript
YAYO_CONFIG.API_BASE_URL = 'http://localhost:3000'
```

O editar directamente en `YAYO_V65_INTEGRACION_REAL.js`:

```javascript
const YAYO_CONFIG = {
  API_BASE_URL: 'http://localhost:3000',  // ← Cambiar esto
  ...
}
```

**Verificado:** [ ]

---

## 📋 STEP 4: TEST LOGIN REAL (20 minutos)

### 4.1 Abrir frontend en navegador

```
http://localhost:8080
# o donde esté alojado el frontend
```

**Verificado:** [ ]

---

### 4.2 Abrir DevTools (F12)

- Tab: Console
- Limpiar consola

**Verificado:** [ ]

---

### 4.3 Escribir en console:

```javascript
// Probar que integración se cargó
console.log(auth)  // Debe mostrar YayoAuthService

// Probar login
auth.login('yayo', '1234').then(result => {
  console.log('Login result:', result)
})
```

**Resultado esperado:**
```
Login result: {
  success: true,
  usuario: { id: "...", nombre: "Yayo Daza", role: "coach" },
  token: "eyJhbGc..."
}
```

**Si falla:**

**Error:** "Cannot GET /YAYO_V65_INTEGRACION_REAL.js"
- [ ] Revisar ruta del archivo
- [ ] Revisar que archivo existe

**Error:** "CORS policy"
- [ ] Backend no tiene CORS configurado
- [ ] Agregar a backend:
  ```javascript
  app.use(cors({
    origin: 'http://localhost:8080',
    credentials: true
  }))
  ```

**Error:** "401 Unauthorized"
- [ ] Usuario/contraseña incorrecto
- [ ] Usuario no existe en BD
- [ ] JWT_SECRET no coincide

**Verificado:** [ ]

---

### 4.4 Clickear botón login en UI

Ingresa:
- Usuario: `yayo`
- Contraseña: `1234`

Click "Entrar"

**Resultado esperado:**
- Toast verde: "Bienvenido, Yayo Daza"
- Redirección a dashboard

**Verificado:** [ ]

---

### 4.5 Revisar localStorage

DevTools → Application → Cookies → localhost:8080

Debe haber:
```
yayo_access_token = eyJhbGc...
yayo_refresh_token = eyJhbGc...
yayo_current_user = {"id":"...","nombre":"Yayo Daza","role":"coach"}
```

**Verificado:** [ ]

---

## 📋 STEP 5: CONECTAR USUARIOS (45 minutos)

### 5.1 Localizar función de crear usuario

Buscar en HTML:

```bash
grep -n "function.*crearUsuario\|function.*nuevoUsuario" YAYO_V65_COMPLETA_FINAL.html
```

**Verificado:** [ ]

---

### 5.2 Localizar almacenamiento de usuarios

```bash
grep -n "localStorage.*usuario" YAYO_V65_COMPLETA_FINAL.html | grep -v "coach" | head -5
```

**Verificado:** [ ]

---

### 5.3 Reemplazar todas las instancias

Buscar patrón:
```javascript
JSON.parse(localStorage.getItem('usuarios'))
localStorage.setItem('usuarios', JSON.stringify(...))
```

Reemplazar con:
```javascript
// Leer
const usuariosList = await users.list();

// Crear
const nuevoUsuario = await users.create({
  nombre: nombreValue,
  email: emailValue,
  codigoAcceso: generarCodigo()
});

// Actualizar
await users.update(usuarioId, datosActualizados);

// Eliminar
await users.delete(usuarioId);
```

**Verificado:** [ ]

---

### 5.4 Crear función auxiliar para código

```javascript
function generarCodigo() {
  return Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();
}
```

**Verificado:** [ ]

---

### 5.5 Test: Crear usuario

**En UI:**
1. Login como coach
2. Ir a sección "Usuarios" o "Crear usuario"
3. Ingresar nombre: "Juan Pérez"
4. Click "Crear"

**Resultado esperado:**
- Toast verde: "Usuario Juan Pérez creado"
- Usuario aparece en lista

**En DevTools console:**
```javascript
users.list().then(l => console.log(l))
```

Debe mostrar usuario creado.

**Verificado:** [ ]

---

### 5.6 Test: Persistencia

**Recargar página (F5)**

**Resultado esperado:**
- Usuario "Juan Pérez" debe continuar en lista
- **No debe desaparecer**

Si desaparece: localStorage aún está siendo usado en algún lugar.

**Verificado:** [ ]

---

## 📋 STEP 6: TEST MULTIUSUARIO (30 minutos)

### 6.1 Coach A: Crear Usuario 1

1. Login como yayo
2. Crear usuario "María"
3. Logout (Click logout)

**Verificado:** [ ]

---

### 6.2 Coach B: Login (simular otro coach)

**En terminal:**
```bash
# Crear otro coach en BD
mongosh
> use yayo_v65
> db.usuarios_v65.insertOne({
    nombre: "Otro Coach",
    usuario: "coach2",
    passwordHash: bcrypt.hashSync("4321", 10),
    role: "coach",
    activo: true,
    createdAt: new Date()
  })
```

O crear desde frontend si existe opción.

**Verificado:** [ ]

---

### 6.3 Coach B: Login y crear Usuario 2

1. Login como coach2 / 4321
2. Crear usuario "Pedro"

**Verificado:** [ ]

---

### 6.4 Coach A: Verificar aislamiento

1. Login como yayo nuevamente
2. Ir a usuarios

**Resultado esperado:**
- Ver "María" ✅
- **NO ver "Pedro"** ✅

Si ve a Pedro: Backend no está validando coachId.

**Verificado:** [ ]

---

## 📋 STEP 7: DOCUMENTACIÓN (30 minutos)

### 7.1 Crear archivo README.md

```markdown
# YAYO V65 — Setup para Desarrollo

## Requisitos
- Node.js 16+
- MongoDB (Atlas o local)
- npm

## Setup Backend

1. Clonar repo
2. cd backend
3. npm install
4. Crear .env (ver .env.example)
5. npm start

Backend corre en http://localhost:3000

## Setup Frontend

1. Copiar YAYO_V65_COMPLETA_FINAL.html
2. Copiar YAYO_V65_INTEGRACION_REAL.js
3. Actualizar API_BASE_URL en integración
4. Abrir en navegador

## Credenciales de prueba
- Coach: yayo / 1234
- Crear usuarios desde UI

## Verificación
- [ ] Backend responde en :3000
- [ ] Login devuelve JWT
- [ ] Usuarios persisten en reload
- [ ] Multiusuario funciona
```

**Verificado:** [ ]

---

### 7.2 Actualizar YAYO_V65_PLAN_INTEGRACION_P0.md

Marcar completados:
- [ ] FASE 1: Auth real ✅
- [ ] FASE 2: Usuarios reales ✅
- [x] FASE 3: Ejercicios (próximo)
- [x] FASE 4: Rutinas (próximo)

**Verificado:** [ ]

---

## ✅ CHECKLIST FINAL

| Área | Hecho | Verificado |
|------|-------|-----------|
| Backend corre | | [ ] |
| MongoDB conectado | | [ ] |
| POST /api/auth/login funciona | | [ ] |
| Frontend incluye integración | | [ ] |
| Login funciona | | [ ] |
| JWT en localStorage | | [ ] |
| Usuarios persisten | | [ ] |
| Multiusuario aislado | | [ ] |
| Documentación actualizada | | [ ] |

---

## 🚨 SI ALGO FALLA

### Paso 1: Revisar logs

**Backend:**
```bash
# Terminal donde corre backend
# Buscar errores rojos
```

**Frontend:**
```javascript
// DevTools console
// Buscar errores rojos
```

### Paso 2: Común de errores

| Error | Solución |
|-------|----------|
| CORS | Agregar cors() en backend |
| 401 | Revisar JWT_SECRET |
| No conecta BD | Revisar MONGODB_URI |
| localStorage.getItem undefined | Script de integración no cargó |
| "Usuario no existe" | Crear usuario en BD manualmente |

### Paso 3: Resetear

```bash
# Limpiar BD
mongo
> db.usuarios_v65.deleteMany({})

# Reinstalar backend
rm -rf node_modules package-lock.json
npm install

# Limpiar localStorage frontend
localStorage.clear()
```

---

## 📞 PRÓXIMAS FASES

Cuando PASEN todos los checkboxes arriba:

- [ ] FASE 3: Conectar Ejercicios
- [ ] FASE 4: Conectar Rutinas
- [ ] FASE 5: Conectar Dietas
- [ ] FASE 6: Conectar Sesiones
- [ ] FASE 7: WebSockets
- [ ] FASE 8: Multimedia
- [ ] FASE 9: Reportes PDF
- [ ] FASE 10: Security audit

---

**Actualizado:** 29-09-2026  
**Estado:** FASE 1-2 LISTA PARA EJECUTAR  
**Requisito:** NO SIMULAR - Verificar CADA paso
