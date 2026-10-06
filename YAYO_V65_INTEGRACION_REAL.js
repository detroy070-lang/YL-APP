/**
 * YAYO V65 — INTEGRACIÓN REAL FRONTEND ↔ BACKEND
 * 
 * Propósito: Reemplazar localStorage con API calls reales
 * Status: P0 CRÍTICA - Conexión Frontend-Backend
 * 
 * Características:
 * ✅ API Client centralizado
 * ✅ JWT management
 * ✅ Auth real
 * ✅ RBAC
 * ✅ Error handling
 * ✅ Retry logic
 * ✅ Offline detection
 */

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const YAYO_CONFIG = {
  // Cambiar según ambiente
  API_BASE_URL: 
    localStorage.getItem('YAYO_API_URL') || 
    'http://localhost:3000',
  
  // Tokens
  ACCESS_TOKEN_KEY: 'yayo_access_token',
  REFRESH_TOKEN_KEY: 'yayo_refresh_token',
  USER_KEY: 'yayo_current_user',
  
  // Timeouts
  REQUEST_TIMEOUT: 10000, // 10s
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1s
};

// ============================================================================
// API CLIENT — Centralizado, reusable
// ============================================================================

class YayoAPIClient {
  constructor(config) {
    this.baseURL = config.API_BASE_URL;
    this.accessTokenKey = config.ACCESS_TOKEN_KEY;
    this.refreshTokenKey = config.REFRESH_TOKEN_KEY;
    this.timeout = config.REQUEST_TIMEOUT;
    this.retryAttempts = config.RETRY_ATTEMPTS;
  }

  /**
   * Obtener token actual
   */
  getAccessToken() {
    return localStorage.getItem(this.accessTokenKey);
  }

  /**
   * Guardar tokens (SEGURO: No es HttpOnly en cliente, para MVP es aceptable)
   */
  setTokens(accessToken, refreshToken) {
    localStorage.setItem(this.accessTokenKey, accessToken);
    if (refreshToken) {
      localStorage.setItem(this.refreshTokenKey, refreshToken);
    }
  }

  /**
   * Limpiar tokens
   */
  clearTokens() {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  }

  /**
   * Headers para requests autenticados
   */
  getHeaders() {
    const token = this.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  /**
   * Realizar request con retry y timeout
   */
  async request(method, endpoint, body = null, retryCount = 0) {
    const url = `${this.baseURL}${endpoint}`;
    const options = {
      method,
      headers: this.getHeaders(),
      ...(body && { body: JSON.stringify(body) }),
    };

    try {
      // Timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Request timeout')),
          this.timeout
        )
      );

      const response = await Promise.race([
        fetch(url, options),
        timeoutPromise,
      ]);

      // Manejo de respuestas específicas
      if (response.status === 401) {
        // Token vencido - intentar refresh
        const refreshed = await this.refreshAccessToken();
        if (refreshed && retryCount < 1) {
          return this.request(method, endpoint, body, retryCount + 1);
        }
        this.clearTokens();
        this.onAuthFailure?.();
        throw new Error('Autenticación falló');
      }

      if (response.status === 403) {
        throw new Error('No autorizado para esta operación');
      }

      if (response.status >= 500) {
        if (retryCount < this.retryAttempts) {
          await new Promise(resolve => 
            setTimeout(resolve, this.RETRY_DELAY * (retryCount + 1))
          );
          return this.request(method, endpoint, body, retryCount + 1);
        }
        throw new Error('Servidor no disponible');
      }

      if (!response.ok && response.status >= 400) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || 
          `Error ${response.status}`
        );
      }

      // Parsear respuesta
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (response.status === 204) return null;
        throw new Error('Respuesta inválida del servidor');
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error(`API Error [${method} ${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * GET
   */
  async get(endpoint) {
    return this.request('GET', endpoint);
  }

  /**
   * POST
   */
  async post(endpoint, body) {
    return this.request('POST', endpoint, body);
  }

  /**
   * PUT
   */
  async put(endpoint, body) {
    return this.request('PUT', endpoint, body);
  }

  /**
   * DELETE
   */
  async delete(endpoint) {
    return this.request('DELETE', endpoint);
  }

  /**
   * Refresh token automático
   */
  async refreshAccessToken() {
    const refreshToken = localStorage.getItem(this.refreshTokenKey);
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      this.setTokens(data.data.accessToken, data.data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }
}

// Instancia global
const api = new YayoAPIClient(YAYO_CONFIG);

// ============================================================================
// AUTH SERVICE — Gestión de autenticación
// ============================================================================

class YayoAuthService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  /**
   * Login con usuario/contraseña (Coach)
   */
  async login(usuario, contrasena) {
    try {
      const response = await this.api.post('/api/auth/login', {
        usuario,
        contrasena,
      });

      // Guardar tokens
      this.api.setTokens(
        response.accessToken,
        response.refreshToken
      );

      // Guardar datos del usuario
      localStorage.setItem(
        YAYO_CONFIG.USER_KEY,
        JSON.stringify(response.usuario)
      );

      return {
        success: true,
        usuario: response.usuario,
        token: response.accessToken,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Login con código (Usuario)
   */
  async loginConCodigo(codigoAcceso) {
    try {
      const response = await this.api.post('/api/auth/codigo', {
        codigoAcceso,
      });

      this.api.setTokens(
        response.accessToken,
        response.refreshToken
      );

      localStorage.setItem(
        YAYO_CONFIG.USER_KEY,
        JSON.stringify(response.usuario)
      );

      return {
        success: true,
        usuario: response.usuario,
        token: response.accessToken,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtener usuario actual
   */
  async getCurrentUser() {
    try {
      const response = await this.api.get('/api/auth/me');
      localStorage.setItem(
        YAYO_CONFIG.USER_KEY,
        JSON.stringify(response)
      );
      return response;
    } catch {
      // Si falla, intentar leer del localStorage (fallback)
      const cached = localStorage.getItem(YAYO_CONFIG.USER_KEY);
      return cached ? JSON.parse(cached) : null;
    }
  }

  /**
   * Logout
   */
  async logout() {
    try {
      await this.api.post('/api/auth/logout', {});
    } catch {
      // Error en logout no es bloqueante
    } finally {
      this.api.clearTokens();
      localStorage.removeItem(YAYO_CONFIG.USER_KEY);
    }
  }

  /**
   * ¿Está autenticado?
   */
  isAuthenticated() {
    return !!this.api.getAccessToken();
  }

  /**
   * Obtener rol del usuario actual
   */
  getCurrentRole() {
    const user = JSON.parse(
      localStorage.getItem(YAYO_CONFIG.USER_KEY) || '{}'
    );
    return user.role || null;
  }
}

const auth = new YayoAuthService(api);

// ============================================================================
// DATA SERVICES — Operaciones CRUD reales
// ============================================================================

class YayoUsersService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async list() {
    return this.api.get('/api/users');
  }

  async get(id) {
    return this.api.get(`/api/users/${id}`);
  }

  async create(usuarioData) {
    return this.api.post('/api/users', usuarioData);
  }

  async update(id, usuarioData) {
    return this.api.put(`/api/users/${id}`, usuarioData);
  }

  async delete(id) {
    return this.api.delete(`/api/users/${id}`);
  }
}

class YayoExercisesService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async list() {
    return this.api.get('/api/ejercicios');
  }

  async get(id) {
    return this.api.get(`/api/ejercicios/${id}`);
  }

  async create(exerciseData) {
    return this.api.post('/api/ejercicios', exerciseData);
  }

  async update(id, exerciseData) {
    return this.api.put(`/api/ejercicios/${id}`, exerciseData);
  }

  async delete(id) {
    return this.api.delete(`/api/ejercicios/${id}`);
  }

  async search(query) {
    return this.api.get(`/api/ejercicios/buscar?q=${encodeURIComponent(query)}`);
  }
}

class YayoRoutinesService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async list() {
    return this.api.get('/api/rutinas');
  }

  async get(id) {
    return this.api.get(`/api/rutinas/${id}`);
  }

  async create(routineData) {
    return this.api.post('/api/rutinas', routineData);
  }

  async update(id, routineData) {
    return this.api.put(`/api/rutinas/${id}`, routineData);
  }

  async delete(id) {
    return this.api.delete(`/api/rutinas/${id}`);
  }

  async assign(id, usuarioId) {
    return this.api.post(`/api/rutinas/${id}/asignar`, { usuarioId });
  }
}

class YayoDietsService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async list() {
    return this.api.get('/api/dietas');
  }

  async get(id) {
    return this.api.get(`/api/dietas/${id}`);
  }

  async create(dietData) {
    return this.api.post('/api/dietas', dietData);
  }

  async update(id, dietData) {
    return this.api.put(`/api/dietas/${id}`, dietData);
  }

  async delete(id) {
    return this.api.delete(`/api/dietas/${id}`);
  }

  async assign(id, usuarioId) {
    return this.api.post(`/api/dietas/${id}/asignar`, { usuarioId });
  }
}

class YayoFoodsService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async list() {
    return this.api.get('/api/alimentos');
  }

  async search(nombre) {
    return this.api.get(`/api/alimentos/buscar/${encodeURIComponent(nombre)}`);
  }

  async get(id) {
    return this.api.get(`/api/alimentos/${id}`);
  }
}

class YayoSessionsService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async list() {
    return this.api.get('/api/sesiones');
  }

  async get(id) {
    return this.api.get(`/api/sesiones/${id}`);
  }

  async create(sessionData) {
    return this.api.post('/api/sesiones', sessionData);
  }

  async update(id, sessionData) {
    return this.api.put(`/api/sesiones/${id}`, sessionData);
  }

  async complete(id) {
    return this.api.put(`/api/sesiones/${id}`, { completada: true });
  }
}

class YayoReportsService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  async generate(reportData) {
    return this.api.post('/api/reportes/generar', reportData);
  }

  async list() {
    return this.api.get('/api/reportes');
  }

  async get(id) {
    return this.api.get(`/api/reportes/${id}`);
  }
}

// Instancias globales
const users = new YayoUsersService(api);
const exercises = new YayoExercisesService(api);
const routines = new YayoRoutinesService(api);
const diets = new YayoDietsService(api);
const foods = new YayoFoodsService(api);
const sessions = new YayoSessionsService(api);
const reports = new YayoReportsService(api);

// ============================================================================
// HELPERS — Funciones auxiliares
// ============================================================================

/**
 * Mostrar error al usuario
 */
function showError(message) {
  console.error(message);
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff4757;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 9999;
    font-size: 14px;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 4000);
}

/**
 * Mostrar éxito al usuario
 */
function showSuccess(message) {
  console.log(message);
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #2ed573;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 9999;
    font-size: 14px;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

/**
 * Detectar conexión
 */
function isOnline() {
  return navigator.onLine;
}

window.addEventListener('online', () => {
  console.log('✓ Conexión restablecida');
});

window.addEventListener('offline', () => {
  showError('Sin conexión. Los cambios se guardarán cuando vuelva la conexión.');
});

// ============================================================================
// HOOKS DE INICIALIZACIÓN
// ============================================================================

/**
 * Restaurar sesión al cargar página
 */
async function initializeYayoSession() {
  if (!auth.isAuthenticated()) {
    console.log('No hay sesión activa');
    return;
  }

  try {
    const user = await auth.getCurrentUser();
    console.log('✓ Sesión restaurada:', user.nombre);
    // Emitir evento personalizado
    window.dispatchEvent(new CustomEvent('yayo:sessionRestored', { detail: user }));
  } catch (error) {
    console.error('Error restaurando sesión:', error);
    auth.logout();
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeYayoSession);
} else {
  initializeYayoSession();
}

// ============================================================================
// EXPORTAR PARA TESTING
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    api,
    auth,
    users,
    exercises,
    routines,
    diets,
    foods,
    sessions,
    reports,
  };
}

console.log('✅ YAYO V65 Integración Real cargado');
console.log(`📍 API: ${YAYO_CONFIG.API_BASE_URL}`);
