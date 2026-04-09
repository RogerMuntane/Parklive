/**
 * ParkLive – utils.js
 * Funcions d'utilitat comunes reutilitzables a tota l'aplicació.
 */

import { STORAGE_KEYS } from './config.js';

/*  1. GESTIÓ D'ALERTES                                                */

/**
 * Mostra un missatge d'alerta dins d'un contenidor.
 * Espera l'estructura HTML existent:
 *   <div class="alert alert-error is-hidden">…</div>
 *   <div class="alert alert-success is-hidden">…</div>
 *
 * @param {string} type     – 'error' | 'success'
 * @param {string} message  – Text a mostrar
 * @param {HTMLElement} [scope=document] – Context DOM per limitar la cerca
 */
export function showAlert(type, message, scope = document) {
  const alert = scope.querySelector(`.alert.alert-${type}`);
  if (!alert) return;

  alert.textContent = message;
  alert.classList.remove('d-none', 'is-hidden');

  // Amagar automàticament els missatges d'èxit al cap de 5 s
  alert.classList.add('d-none');
}

/**
 * Mostra una alerta a l'estil Bootstrap que s'esvaeix automàticament.
 * @param {string} type - 'success', 'danger', 'warning', 'info'
 * @param {string} message - El missatge a mostrar
 * @param {HTMLElement} parent - On penjar l'alerta (per defecte document.body)
 */
export function showBootstrapAlert(type, message, parent = document.body) {
    // Intentar netejar alertes prèvies si el mètode existeix localment
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alert.style.zIndex = 9999;
    alert.role = 'alert';
    alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    parent.appendChild(alert);
    setTimeout(() => {
      alert.classList.remove('show');
      alert.classList.add('hide');
      setTimeout(() => alert.remove(), 500);
    }, 3500);
}

/**
 * Amaga un missatge d'alerta.
 * @param {string} type
 * @param {HTMLElement} [scope=document]
 */
export function hideAlert(type, scope = document) {
  const alert = scope.querySelector(`.alert.alert-${type}`);
  if (!alert) return;

  alert.classList.add('d-none');
}

/**
 * Amaga totes les alertes dins d'un contenidor.
 * @param {HTMLElement} [scope=document]
 */
export function hideAllAlerts(scope = document) {
  scope.querySelectorAll('.alert').forEach((el) => el.classList.add('d-none'));
}

/*  2. FORMULARIS                                                       */

/**
 * Serialitza un formulari HTML a un objecte pla.
 * @param {HTMLFormElement} form
 * @returns {Object}
 */
export function serializeForm(form) {
  const data = {};
  const formData = new FormData(form);

  for (const [key, value] of formData.entries()) {
    // Si hi ha múltiples valors amb el mateix nom, convertir a array
    if (key in data) {
      if (!Array.isArray(data[key])) {
        data[key] = [data[key]];
      }
      data[key].push(value);
    } else {
      data[key] = value;
    }
  }

  return data;
}

/**
 * Valida un formulari HTML5 i marca els camps invàlids.
 * Retorna `true` si tot és vàlid.
 *
 * @param {HTMLFormElement} form
 * @returns {boolean}
 */
export function validateForm(form) {
  // Netejar estat previ
  form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));

  if (form.checkValidity()) return true;

  // Marcar camps invàlids
  form.querySelectorAll(':invalid').forEach((el) => {
    el.classList.add('is-invalid');
  });

  form.reportValidity();
  return false;
}

/**
 * Deshabilita / habilita el botó de submit d'un formulari.
 * Mostra un indicador de càrrega si es desactiva.
 *
 * @param {HTMLFormElement} form
 * @param {boolean} loading
 */
export function setFormLoading(form, loading) {
  const btn = form.querySelector('[type="submit"]');
  if (!btn) return;

  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.textContent = 'Carregant…';
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.originalText || btn.textContent;
    btn.disabled = false;
  }
}

/*  3. SESSIÓ / EMMAGATZEMATGE                                         */

/**
 * Guarda les dades de l'usuari autenticat a sessionStorage.
 * @param {Object} userData – Objecte amb { id, nom, email, … }
 */
export function saveUserSession(userData) {
  if (userData.id) {
    sessionStorage.setItem(STORAGE_KEYS.USER_ID, String(userData.id));
  }
  if (userData.token) {
    sessionStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, userData.token);
  }
  sessionStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
}

/**
 * Obté les dades de l'usuari de la sessió, o null si no existeix.
 * @returns {Object|null}
 */
export function getUserSession() {
  const raw = sessionStorage.getItem(STORAGE_KEYS.USER_DATA);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Retorna l'ID d'usuari de la sessió actual, o null.
 * @returns {string|null}
 */
export function getUserId() {
  return sessionStorage.getItem(STORAGE_KEYS.USER_ID);
}

/**
 * Elimina totes les dades de sessió de l'usuari.
 */
export function clearUserSession() {
  sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  sessionStorage.removeItem(STORAGE_KEYS.USER_ID);
  sessionStorage.removeItem(STORAGE_KEYS.USER_DATA);
  // Netejar estat OAuth i cookie relacionada per evitar falsos positius
  sessionStorage.removeItem('parklive_oauth');
}

/**
 * Comprova si hi ha un usuari autenticat.
 * @returns {boolean}
 */
export function isAuthenticated() {
  return sessionStorage.getItem(STORAGE_KEYS.USER_ID) !== null;
}

/*  4. FORMATADORS                                                      */

/**
 * Formata una data ISO a format local (dd/mm/yyyy HH:mm).
 * @param {string} isoDate
 * @returns {string}
 */
export function formatDate(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '—';

  return d.toLocaleString('ca-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formata un número com a moneda (EUR).
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/*  5. UTILITATS GENERALS                                              */

/**
 * Debounce: retarda l'execució d'una funció fins que passin `delay` ms
 * sense cap crida nova.
 *
 * @param {Function} fn
 * @param {number} delay – Mil·lisegons (per defecte 300)
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Obté un query parameter de la URL actual.
 * @param {string} name
 * @returns {string|null}
 */
export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * Redirigeix a una URL després d'un petit retard.
 * @param {string} url
 * @param {number} [delay=1500]
 */
export function redirectAfterDelay(url, delay = 1500) {
  setTimeout(() => {
    window.location.href = url;
  }, delay);
}
