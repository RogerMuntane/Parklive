/**
 * ParkLive – config.js
 * Configuració centralitzada de l'aplicació.
 * Les URL base es construeixen dinàmicament segons el hostname del navegador
 * i els ports definits a env.js (injectats des del .env via Docker).
 */

import { ENV } from './env.js';

const { protocol, hostname } = window.location;

// En producció, si hem definit un API_HOST al .env, el fem servir.
// Si no, fem servir el hostname actual del navegador.
const isProd = ENV.APP_ENV === 'production';
const apiHost = (isProd && ENV.API_HOST) ? ENV.API_HOST : hostname;

/**
 * URL base del servei Python (Flask).
 * El port es llegeix de ENV (originat al .env → docker-compose → env.js).
 */
export const PYTHON_API_URL = `${protocol}//${apiHost}:${ENV.PYTHON_SERVICE_PORT}`;

/**
 * URL base del servei PHP (Apache).
 * El port es llegeix de ENV (originat al .env → docker-compose → env.js).
 */
export const PHP_API_URL = `${protocol}//${apiHost}:${ENV.PHP_SERVICE_PORT}`;

/** Claus Públiques (Stripe/Google) */
export const STRIPE_PUBLIC_KEY = ENV.STRIPE_PUBLIC_KEY;
export const GOOGLE_CLIENT_ID = ENV.GOOGLE_CLIENT_ID;

/** Constants Financeres */
export const FINANCIAL_CONSTANTS = Object.freeze({
  IVA_PERCENTAGE: parseFloat(ENV.IVA_PERCENTAGE || 0.21),
  PREMIUM_DISCOUNT: parseFloat(ENV.PREMIUM_DISCOUNT || 0.10),
});

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
