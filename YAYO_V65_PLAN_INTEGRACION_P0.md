# 🔴 YAYO V65 — PLAN DE INTEGRACIÓN P0 (CRÍTICA)

**Objetivo:** Conectar frontend + backend de forma REAL en 4 fases.  
**Status:** En ejecución inmediata  
**Responsabilidad:** Verificar CADA conexión, no simular

---

## FASE 1: AUTH REAL (Login Coach)

### 1.1 Verificar Backend

Endpoint esperado: `POST /api/auth/login`

```bash
# Probar manualmente desde terminal
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"yayo","contrasena":"1234"}'

# Resultado esperado:
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "...",
    "usuario": {
      "id": "...",
      "nombre": "Yayo Daza",
      "role": "coach"
    }
  }
}
```

**Si NO funciona:**
1. Verificar que backend está corriendo: `npm start`
2. Verificar que MongoDB está disponible
3. Verificar que el usuario "yayo" existe en BD
4. Revisar logs: `backend está esperando conexión a MongoDB`

**Acción:** ☐ Testear endpoint manualmente

---

### 1.2 Integrar Frontend

En HTML de login (reemplazar función `login()`):

**ANTES:**
```javascript
function login() {
  const usuario = document.getElementById('usuario').value;
  const contrasena = document.getElementById('contrasena').value;
  
  if (usuario === 'yayo' && contrasena === '1234') {
    localStorage.setItem('usuario', usuario);
    // ...
  }
}
```

**DESPUÉS:**
```javascript
async function login() {
  const usuario = document.getElementById('usuario').value;
  const contrasena = document.getElementById('contrasena').value;
  
  if (!usuario || !contrasena) {
    showError('Completa usuario y contraseña');
    return;
  }

  try {
    const result = await auth.login(usuario, contrasena);
    
    if (result.success) {
      showSuccess(`Bienvenido, ${result.usuario.nombre}`);
      // Actualizar UI
      document.getElementById('nombreUsuario').textContent = result.usuario.nombre;
      showPage('dashboard');
    } else {
      showError(result.error || 'Login fallido');
    }
  } catch (error) {
    showError('Error conectando con servidor');
  }
}
```

**Acción:** ☐ Reemplazar función login() en HTML

---

### 1.3 Probar Localmente

**Setup:**
1. Terminal 1: Backend corriendo
   ```bash
   cd backend && npm start
   # Esperado: "Server running on :3000"
   ```

2. Terminal 2: Frontend en navegador
   ```bash
   http://localhost:8080  # o donde esté alojado
   ```

**Test manual:**
1. Abrir DevTools (F12)
2. Console tab
3. Escribir:
   ```javascript
   auth.login('yayo', '1234').then(r => console.log(r))
   ```
4. Verificar respuesta

**Resultado esperado:**
```javascript
{
  success: true,
  usuario: { id: "...", nombre: "Yayo Daza", role: "coach" },
  token: "eyJhbGc..."
}
```

**Acción:** ☐ Login funciona desde frontend

---

## FASE 2: USUARIOS REALES (Create/Read)

### 2.1 Backend Endpoint

Esperado: `POST /api/users`

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_AQUI>" \
  -d '{
    "nombre": "Juan Pérez",
    "codigoAcceso": "ABC123XYZ",
    "rol": "usuario"
  }'
```

**Acción:** ☐ Endpoint POST /api/users funciona

---

### 2.2 Frontend - Crear usuario

**Reemplazar:**
```javascript
// VIEJO - localStorage
function crearUsuario() {
  const nombre = document.getElementById('nombre').value;
  let usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  usuarios.push({ nombre, id: Date.now() });
  localStorage.setItem('usuarios', JSON.stringify(usuarios));
}

// NUEVO - API real
async function crearUsuario() {
  const nombre = document.getElementById('nombre').value;
  
  if (!nombre) {
    showError('Nombre requerido');
    return;
  }

  try {
    const usuario = await users.create({
      nombre,
      codigoAcceso: generarCodigo(), // función auxiliar
      email: `${nombre.toLowerCase()}@yayo.local`,
    });
    
    showSuccess(`Usuario ${usuario.nombre} creado`);
    cargarUsuarios(); // Recargar lista
  } catch (error) {
    showError(`Error: ${error.message}`);
  }
}

// Función auxiliar
function generarCodigo() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
```

**Acción:** ☐ Crear usuario persiste en MongoDB

---

### 2.3 Frontend - Listar usuarios

**Reemplazar:**
```javascript
// VIEJO - localStorage
function cargarUsuarios() {
  const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
  mostrarEnUI(usuarios);
}

// NUEVO - API real
async function cargarUsuarios() {
  try {
    const usuariosList = await users.list();
    mostrarEnUI(usuariosList);
    console.log('✓ Usuarios cargados desde BD');
  } catch (error) {
    showError(`No pudimos cargar usuarios: ${error.message}`);
  }
}
```

**Prueba:**
1. Crear usuario desde UI
2. Recargar página (F5)
3. Usuario debe aparecer en lista

**Acción:** ☐ Datos persisten en reload

---

## FASE 3: EJERCICIOS REALES

### 3.1 Reemplazar localStorage

Buscar todas las instancias de:
```javascript
JSON.parse(localStorage.getItem('ejercicios') || '[]')
localStorage.setItem('ejercicios', JSON.stringify(...))
```

Reemplazar con:
```javascript
const ejerciciosList = await exercises.list();
// o
await exercises.create({ ... });
```

### 3.2 Test E2E

**Flujo:**
1. Coach crea ejercicio
2. Coach recarga página
3. Ejercicio debe continuar existiendo
4. Usuario ve ejercicio en su rutina

**Acción:** ☐ Ejercicios persisten en BD

---

## FASE 4: RUTINAS Y ASIGNACIONES

### 4.1 Crear rutina

```javascript
async function crearRutina() {
  const nombre = document.getElementById('nombreRutina').value;
  
  try {
    const rutina = await routines.create({
      nombre,
      objetivo: 'hipertrofia',
      nivel: 'intermedio',
      descripcion: '...',
    });
    
    showSuccess('Rutina creada');
  } catch (error) {
    showError(error.message);
  }
}
```

### 4.2 Asignar a usuario

```javascript
async function asignarRutina(rutinaId, usuarioId) {
  try {
    await routines.assign(rutinaId, usuarioId);
    showSuccess('Rutina asignada');
    // Notificar al usuario (WebSocket futuro)
  } catch (error) {
    showError(error.message);
  }
}
```

**Prueba:**
1. Coach crea rutina
2. Coach la asigna a usuario
3. Usuario inicia sesión
4. Usuario ve rutina asignada

**Acción:** ☐ Asignaciones funcionan

---

## CRITERIOS DE ÉXITO

| Criterio | Verificado | Fecha |
|----------|-----------|-------|
| Backend API respondiendo | ☐ | |
| Login devuelve JWT | ☐ | |
| Frontend almacena token | ☐ | |
| Crear usuario persiste | ☐ | |
| Recargar página = datos continúan | ☐ | |
| Logout borra token | ☐ | |
| Usuario no ve datos de otro | ☐ | |
| Coach no ve usuarios de otro coach | ☐ | |
| Ejercicios vienen de BD | ☐ | |
| Rutinas se asignan | ☐ | |

---

## TESTS OBLIGATORIOS

### Test 1: Auth Básico

```bash
# Login
POST http://localhost:3000/api/auth/login
{
  "usuario": "yayo",
  "contrasena": "1234"
}

# Resultado: Status 200 + accessToken
```

✓ Verificado: ___________  
Resultado: ___________

---

### Test 2: Create & Persist

```javascript
// Crear usuario
const usuario = await users.create({ nombre: 'Test User' });
console.log(usuario.id);

// Esperar 2 segundos

// Cargar usuarios
const lista = await users.list();
const existe = lista.find(u => u.id === usuario.id);
console.assert(existe, 'Usuario debe existir después de reload');
```

✓ Verificado: ___________  
Resultado: ___________

---

### Test 3: Reload Persistence

```javascript
// 1. Crear dato
// 2. F5 (reload)
// 3. Dato debe existir

// Chrome DevTools:
// Application → localStorage → verificar tokens
```

✓ Verificado: ___________  
Resultado: ___________

---

### Test 4: Multiusuario

```javascript
// Coach A login → crea Usuario 1
// Coach A logout
// Coach B login → crea Usuario 2
// Coach A login → NO ve Usuario 2

// Resultado: coachId en BD diferencia
```

✓ Verificado: ___________  
Resultado: ___________

---

### Test 5: 401 Unauthorized

```javascript
// Ejecutar SIN token:
fetch('http://localhost:3000/api/users')

// Resultado: 401 Unauthorized
```

✓ Verificado: ___________  
Resultado: ___________

---

## CHECKLIST DE INTEGRACIÓN

### Frontend
- [ ] Incluir `YAYO_V65_INTEGRACION_REAL.js` antes de cualquier otro script
- [ ] Reemplazar `function login()` vieja
- [ ] Reemplazar `localStorage.setItem` en usuarios
- [ ] Reemplazar `localStorage.getItem` en usuarios
- [ ] Reemplazar `localStorage.setItem` en ejercicios
- [ ] Reemplazar `localStorage.getItem` en ejercicios
- [ ] Reemplazar `localStorage.setItem` en rutinas
- [ ] Reemplazar `localStorage.getItem` en rutinas
- [ ] Reemplazar `localStorage.setItem` en dietas
- [ ] Reemplazar `localStorage.getItem` en dietas
- [ ] Reemplazar `localStorage.setItem` en sesiones
- [ ] Reemplazar `localStorage.getItem` en sesiones
- [ ] Remover datos mock de HTML
- [ ] Remover `window.YAYO_ALIMENTOS` hardcodeados si van a BD

### Backend
- [ ] Verificar `/api/auth/login` funciona
- [ ] Verificar `/api/users` POST funciona
- [ ] Verificar `/api/users` GET funciona
- [ ] Verificar JWT se valida
- [ ] Verificar RBAC funciona
- [ ] Verificar MongoDB está conectado
- [ ] Verificar índices creados
- [ ] Verificar coachId aisla usuarios

### Testing
- [ ] Test 1: Auth pasa
- [ ] Test 2: Create & Persist pasa
- [ ] Test 3: Reload pasa
- [ ] Test 4: Multiusuario pasa
- [ ] Test 5: 401 pasa
- [ ] E2E Coach → User → Sesión pasa
- [ ] Responsivo en móvil
- [ ] Sin errores en consola

---

## ERRORES COMUNES

### Error: "Cannot find module 'jsonwebtoken'"

**Causa:** Backend no tiene dependencias  
**Solución:**
```bash
cd backend && npm install
```

### Error: "MongoServerError: connect ECONNREFUSED"

**Causa:** MongoDB no conectado  
**Solución:**
1. Verificar MongoDB está corriendo: `mongosh`
2. Verificar MONGODB_URI en .env
3. Si es MongoDB Atlas, verificar whitelist IP

### Error: "CORS policy: No 'Access-Control-Allow-Origin'"

**Causa:** CORS no configurado  
**Solución:**
```javascript
// En backend
app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true,
}));
```

### Error: "Unexpected token '<' in JSON at position 0"

**Causa:** Frontend recibe HTML en vez de JSON  
**Solución:**
- Verificar que endpoint es correcto
- Verificar Content-Type header
- Verificar que no es 404 devolviendo index.html

---

## PRÓXIMOS PASOS

1. ✅ Conectar Auth
2. ✅ Conectar Usuarios
3. ✅ Conectar Ejercicios
4. ✅ Conectar Rutinas
5. ✅ Conectar Dietas
6. ✅ Conectar Sesiones
7. ⭕ Multimedia
8. ⭕ WebSockets
9. ⭕ Reportes
10. ⭕ Redis

Primero: CONECTAR. Después: MEJORAR.

---

## HABILITAR GUÍA DE USUARIO

Cuando todo funcione, mostrar:

```text
✅ YAYO V65 FUNCIONAL

Frontend ↔ Backend: CONECTADO
MongoDB: FUNCIONANDO
JWT: ACTIVO
RBAC: VALIDADO
Persistencia: REAL

Usuarios: N
Ejercicios: N
Rutinas: N
Sesiones: N
Almacenamiento: MongoDB

Listo para usuarios reales.
```

---

**Actualización:** 29-09-2026  
**Estado:** FASE 1 Iniciada  
**Prioridad:** P0 CRÍTICA  
**Sin simulación. Solo verificación real.**
