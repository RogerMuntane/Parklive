/**
 * ParkLive – api.js
 * Client HTTP genèric basat en Fetch API.
 * Proporciona mètodes GET, POST, PUT i DELETE amb gestió d'errors,
 * headers comuns i injecció automàtica de credencials d'usuari.
 */

import { PYTHON_API_URL, PHP_API_URL, STORAGE_KEYS } from './config.js';

/* ------------------------------------------------------------------ */
/*  Error personalitzat                                                */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  /**
   * @param {string}  message  – Missatge llegible per l'usuari
   * @param {number}  status   – Codi HTTP (0 si no hi ha connexió)
   * @param {Object}  data     – Cos de la resposta original (pot ser null)
   */
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/* ------------------------------------------------------------------ */
/*  Utilitats internes                                                  */
/* ------------------------------------------------------------------ */

/**
 * Converteix un objecte pla en query string.
 * Ignora valors `undefined` i `null`.
 *
 * @param {Object} params
 * @returns {string} – p. ex. '?ciutat=Barcelona&limit=20' o '' si buit
 */
function buildQueryString(params = {}) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );

  if (entries.length === 0) return '';

  const searchParams = new URLSearchParams(entries.map(([k, v]) => [k, String(v)]));
  return `?${searchParams.toString()}`;
}

/* ------------------------------------------------------------------ */
/*  Classe ApiClient                                                    */
/* ------------------------------------------------------------------ */

class ApiClient {
  /**
   * @param {string} baseURL – URL arrel del servei (sense barra final)
   */
  constructor(baseURL) {
    this.baseURL = baseURL.replace(/\/+$/, '');
  }

  /* ---------- mètode central ------------------------------------ */

  /**
   * Llança una petició HTTP genèrica.
   *
   * @param {string} endpoint   – Ruta relativa (p. ex. '/api/aparcaments')
   * @param {RequestInit} [options] – Opcions addicionals de fetch
   * @returns {Promise<any>}      – Dades JSON parseejades
   * @throws {ApiError}
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const headers = {
      Accept: 'application/json',
      ...options.headers,
    };

    // Només afegir Content-Type si no és un GET o DELETE i el body és JSON
    if (options.method && !['GET', 'DELETE', 'OPTIONS', 'HEAD'].includes(options.method.toUpperCase())) {
      if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }
    }

    // Injectar token d'autenticació si existeix (JWT)
    const token = sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Sempre passar les capçaleres amb el JWT
    // Nota: Mantenim credentials: 'include' perquè el backend està configurat amb supports_credentials=True
    const config = { ...options, headers, credentials: 'include' };

    try {
      const response = await fetch(url, config);

      // Intentar parsejar JSON; si falla, considerar cos buit
      let data;
      const contentType = response.headers.get('Content-Type') || '';

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        let errorMsg = `Error ${response.status}`;
        if (typeof data === 'object' && data !== null) {
          if (data.error) {
            errorMsg = data.error;
          } else if (data.errors) {
            if (Array.isArray(data.errors)) {
              errorMsg = data.errors.join(' | ');
            } else if (typeof data.errors === 'object') {
              errorMsg = Object.values(data.errors).flat().join(' | ');
            } else {
              errorMsg = String(data.errors);
            }
          }
        }
        throw new ApiError(errorMsg, response.status, data);
      }

      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError('Error de connexió amb el servidor', 0, null);
    }
  }

  /* ---------- mètodes de conveniència --------------------------- */

  /**
   * GET amb query params opcionals.
   * @param {string} endpoint
   * @param {Object} [params]
   * @returns {Promise<any>}
   */
  get(endpoint, params = {}) {
    const qs = buildQueryString(params);
    return this.request(`${endpoint}${qs}`, { method: 'GET' });
  }

  /**
   * POST amb cos JSON.
   * @param {string} endpoint
   * @param {Object} [body]
   * @returns {Promise<any>}
   */
  post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  /**
   * PUT amb cos JSON o FormData.
   * @param {string} endpoint
   * @param {Object|FormData} [body]
   * @returns {Promise<any>}
   */
  put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  /**
   * DELETE.
   * @param {string} endpoint
   * @returns {Promise<any>}
   */
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  /**
   * POST amb FormData (per enviaments multipart o a PHP tradicional).
   * No posa Content-Type manualment perquè el navegador el fixa sol.
   *
   * @param {string} endpoint
   * @param {FormData|HTMLFormElement} formOrData
   * @returns {Promise<any>}
   */
  postForm(endpoint, formOrData) {
    const body = formOrData instanceof HTMLFormElement
      ? new FormData(formOrData)
      : formOrData;

    return this.request(endpoint, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body,
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Instàncies exportades                                              */
/* ------------------------------------------------------------------ */

/** Client per al servei Python (Flask) – aparcaments, reserves, contribucions */
export const pythonApi = new ApiClient(PYTHON_API_URL);

/** Client per al servei PHP – autenticació, sessions */
export const phpApi = new ApiClient(PHP_API_URL);

export { buildQueryString };
