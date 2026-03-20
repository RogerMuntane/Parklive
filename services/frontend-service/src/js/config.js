/**
 * ParkLive – config.js
 * Configuració centralitzada de l'aplicació.
 * Les URL base es construeixen dinàmicament segons el hostname del navegador
 * i els ports definits a env.js (injectats des del .env via Docker).
 */

import { ENV } from './env.js';

const { protocol, hostname } = window.location;

/**
 * URL base del servei Python (Flask).
 * El port es llegeix de ENV (originat al .env → docker-compose → env.js).
 */
export const PYTHON_API_URL = `${protocol}//${hostname}:${ENV.PYTHON_SERVICE_PORT}`;

/**
 * URL base del servei PHP (Apache).
 * El port es llegeix de ENV (originat al .env → docker-compose → env.js).
 */
export const PHP_API_URL = `${protocol}//${hostname}:${ENV.PHP_SERVICE_PORT}`;

/** Paginació per defecte */
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/** Claus de sessionStorage / localStorage */
export const STORAGE_KEYS = Object.freeze({
  AUTH_TOKEN: 'parklive_auth_token',
  USER_ID: 'parklive_user_id',
  USER_DATA: 'parklive_user_data',
  THEME: 'theme',
});

/** Temps en ms abans de redirigir després d'una acció amb èxit */
export const REDIRECT_DELAY = 1500;
