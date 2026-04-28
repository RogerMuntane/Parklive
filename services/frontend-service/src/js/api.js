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

    // Només afegir Content-Type si no és un GET o DELETE (per evitar problemes amb alguns proxies)
    if (options.method && !['GET', 'DELETE'].includes(options.method.toUpperCase())) {
      headers['Content-Type'] = 'application/json';
    }

    // Injectar ID d'usuari si existeix a la sessió
    const userId = sessionStorage.getItem(STORAGE_KEYS.USER_ID);
    if (userId) {
      headers['X-User-ID'] = userId;
    }

    // Injectar token d'autenticació si existeix
    const token = sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Sempre incloure cookies per a backend PHP
    const config = { ...options, headers };
    // Si la baseURL és PHP_API_URL, afegir credentials: 'include'
    if (this.baseURL === PHP_API_URL.replace(/\/+$/, '')) {
      config.credentials = 'include';
    }

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
        const errorMsg =
          (typeof data === 'object' && data?.error) || `Error ${response.status}`;
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
      body: JSON.stringify(body),
    });
  }

  /**
   * PUT amb cos JSON.
   * @param {string} endpoint
   * @param {Object} [body]
   * @returns {Promise<any>}
   */
  put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
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
