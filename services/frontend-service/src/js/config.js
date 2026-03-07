/**
 * ParkLive – config.js
 * Configuració centralitzada de l'aplicació.
 * Les URL base es construeixen dinàmicament segons el hostname del navegador
 * per funcionar tant en local com en producció.
 */

const { protocol, hostname } = window.location;

/**
 * URL base del servei Python (Flask – port 5000).
 * En producció, canviar a una ruta relativa si Nginx fa de proxy invers.
 */
export const PYTHON_API_URL = `${protocol}//${hostname}:5000`;

/**
 * URL base del servei PHP (Apache – port 8080).
 * En producció, canviar a una ruta relativa si Nginx fa de proxy invers.
 */
export const PHP_API_URL = `${protocol}//${hostname}:8080`;

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
