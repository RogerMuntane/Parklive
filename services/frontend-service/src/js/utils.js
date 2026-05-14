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
/**
 * showAlert - Funció exportada per a showAlert.
 *
 * @param {any} type - Paràmetre type
 * @param {any} message - Paràmetre message
 * @param {any} scope - Paràmetre scope
 * @returns {any} Resultat de la funció.
 */
export function showAlert(type, message, scope = document) {
  const alert = scope.querySelector(`.alert.alert-${type}`);
  if (!alert) return;

  alert.textContent = message;
  alert.classList.remove('d-none', 'is-hidden');

  // Amagar automàticament els missatges d'èxit al cap de 5 s
  if (type === 'success') {
    setTimeout(() => {
      alert.classList.add('d-none');
    }, 5000);
  }
}

/**
 * Mostra una alerta a l'estil Bootstrap que s'esvaeix automàticament.
 * @param {string} type - 'success', 'danger', 'warning', 'info'
 * @param {string} message - El missatge a mostrar
 * @param {HTMLElement} parent - On penjar l'alerta (per defecte document.body)
 */
/**
 * showBootstrapAlert - Funció exportada per a showBootstrapAlert.
 *
 * @param {any} type - Paràmetre type
 * @param {any} message - Paràmetre message
 * @param {any} parent - Paràmetre parent
 * @returns {any} Resultat de la funció.
 */
export function showBootstrapAlert(type, message, parent = document.body) {
    // Netejar alertes prèvies a la mateixa posició per evitar superposició
    const existing = document.querySelector('.alert.position-fixed.top-0');
    
    // PRIORITAT: Si ja hi ha una alerta de sessió caducada, no la treiem per posar un error genèric.
    // També evitem duplicar el mateix missatge de sessió caducada.
    if (existing) {
        const isExistingAuthError = existing.innerText.includes('Sessió caducada');
        const isNewAuthError = message.includes('Sessió caducada');
        
        if (isExistingAuthError && !isNewAuthError) return; // No sobreescriure sessió per error genèric
        if (isExistingAuthError && isNewAuthError) return;  // Ja n'hi ha una, no fem res
        
        existing.remove();
    }

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
      if (alert && alert.parentNode) {
        alert.classList.remove('show');
        alert.classList.add('hide');
        setTimeout(() => alert.remove(), 500);
      }
    }, 3500);
}

/**
 * Amaga un missatge d'alerta.
 * @param {string} type
 * @param {HTMLElement} [scope=document]
 */
/**
 * hideAlert - Funció exportada per a hideAlert.
 *
 * @param {any} type - Paràmetre type
 * @param {any} scope - Paràmetre scope
 * @returns {any} Resultat de la funció.
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
/**
 * hideAllAlerts - Funció exportada per a hideAllAlerts.
 *
 * @param {any} scope - Paràmetre scope
 * @returns {any} Resultat de la funció.
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
/**
 * serializeForm - Funció exportada per a serializeForm.
 *
 * @param {any} form - Paràmetre form
 * @returns {any} Resultat de la funció.
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
/**
 * validateForm - Funció exportada per a validateForm.
 *
 * @param {any} form - Paràmetre form
 * @returns {any} Resultat de la funció.
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
/**
 * setFormLoading - Funció exportada per a setFormLoading.
 *
 * @param {any} form - Paràmetre form
 * @param {any} loading - Paràmetre loading
 * @returns {any} Resultat de la funció.
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
/**
 * saveUserSession - Funció exportada per a saveUserSession.
 *
 * @param {any} userData - Paràmetre userData
 * @returns {any} Resultat de la funció.
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
/**
 * getUserSession - Funció exportada per a getUserSession.
 *
 * @returns {any} Resultat de la funció.
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
/**
 * getUserId - Funció exportada per a getUserId.
 *
 * @returns {any} Resultat de la funció.
 */
export function getUserId() {
  return sessionStorage.getItem(STORAGE_KEYS.USER_ID);
}

/**
 * Elimina totes les dades de sessió de l'usuari.
 */
/**
 * clearUserSession - Funció exportada per a clearUserSession.
 *
 * @returns {any} Resultat de la funció.
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
/**
 * isAuthenticated - Funció exportada per a isAuthenticated.
 *
 * @returns {any} Resultat de la funció.
 */
export function isAuthenticated() {
  return sessionStorage.getItem(STORAGE_KEYS.USER_ID) !== null;
}

/**
 * Comprova si l'usuari autenticat és premium (o admin/operador).
 * @returns {boolean}
 */
/**
 * isPremiumUser - Funció exportada per a isPremiumUser.
 *
 * @returns {any} Resultat de la funció.
 */
export function isPremiumUser() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (!raw) return false;
    const user = JSON.parse(raw);
    const role = (user.tipus_usuari || 'basic').toLowerCase();
    return role === 'premium' || role === 'admin' || role === 'operador';
  } catch {
    return false;
  }
}

/**
 * Redirigeix l'usuari a la pàgina de perfil per millorar el pla.
 * Mostra un avís informatiu previ.
 */
/**
 * redirectToUpgradePlan - Funció exportada per a redirectToUpgradePlan.
 *
 * @returns {any} Resultat de la funció.
 */
export function redirectToUpgradePlan() {
  showBootstrapAlert(
    'warning',
    '<i class="bi bi-lock-fill me-1"></i> Funció exclusiva <strong>Premium</strong>. Millora el teu pla per guardar aparcaments favorits.',
  );
  setTimeout(() => {
    window.location.href = '/perfil?upgrade=1';
  }, 1800);
}

/*  4. FORMATADORS                                                      */

/**
 * Formata una data ISO a format local (dd/mm/yyyy HH:mm).
 * @param {string} isoDate
 * @returns {string}
 */
/**
 * formatDate - Funció exportada per a formatDate.
 *
 * @param {any} isoDate - Paràmetre isoDate
 * @returns {any} Resultat de la funció.
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
/**
 * formatCurrency - Funció exportada per a formatCurrency.
 *
 * @param {any} amount - Paràmetre amount
 * @returns {any} Resultat de la funció.
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
/**
 * debounce - Funció exportada per a debounce.
 *
 * @param {any} fn - Paràmetre fn
 * @param {any} delay - Paràmetre delay
 * @returns {any} Resultat de la funció.
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
/**
 * getQueryParam - Funció exportada per a getQueryParam.
 *
 * @param {any} name - Paràmetre name
 * @returns {any} Resultat de la funció.
 */
export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * Redirigeix a una URL després d'un petit retard.
 * @param {string} url
 * @param {number} [delay=1500]
 */
/**
 * redirectAfterDelay - Funció exportada per a redirectAfterDelay.
 *
 * @param {any} url - Paràmetre url
 * @param {any} delay - Paràmetre delay
 * @returns {any} Resultat de la funció.
 */
export function redirectAfterDelay(url, delay = 1500) {
  setTimeout(() => {
    window.location.href = url;
  }, delay);
}

/**
 * Inicialitza un selector de coordenades en un mapa Leaflet.
 * @param {string} containerId - L'ID del div contenidor.
 * @param {HTMLInputElement} latInput - L'input on guardar la latitud.
 * @param {HTMLInputElement} lngInput - L'input on guardar la longitud.
 * @param {number} defaultLat - Latitud per defecte (ex. 41.3872).
 * @param {number} defaultLng - Longitud per defecte (ex. 2.1703).
 * @param {Object} mapInstance - Referència a l'objecte mapa previ per reutilitzar-lo.
 * @returns {Object} { map, marker } - Referències per gestionar-ho externament (ex. invalidateSize).
 */
/**
 * createMapPicker - Funció exportada per a createMapPicker.
 *
 * @param {any} containerId - Paràmetre containerId
 * @param {any} latInput - Paràmetre latInput
 * @param {any} lngInput - Paràmetre lngInput
 * @param {any} defaultLat - Paràmetre defaultLat
 * @param {any} defaultLng - Paràmetre defaultLng
 * @param {any} mapInstance - Paràmetre mapInstance
 * @param {any} markerInstance - Paràmetre markerInstance
 * @returns {any} Resultat de la funció.
 */
export function createMapPicker(containerId, latInput, lngInput, defaultLat = 41.3872, defaultLng = 2.1703, mapInstance, markerInstance) {
    const L = globalThis.L;
    if (!L) return { map: null, marker: null };

    const initialLat = latInput.value && !isNaN(parseFloat(latInput.value)) ? parseFloat(latInput.value) : defaultLat;
    const initialLng = lngInput.value && !isNaN(parseFloat(lngInput.value)) ? parseFloat(lngInput.value) : defaultLng;

    latInput.value = initialLat;
    lngInput.value = initialLng;

    if (mapInstance) {
        mapInstance.setView([initialLat, initialLng], 18);
        if (markerInstance) {
            markerInstance.setLatLng([initialLat, initialLng]);
        }
        return { map: mapInstance, marker: markerInstance };
    }

    const map = L.map(containerId, {
        minZoom: 5,
        maxZoom: 20
    }).setView([initialLat, initialLng], 18);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors, © CARTO'
    }).addTo(map);

    const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);

    marker.on('dragend', function() {
        const pos = marker.getLatLng();
        latInput.value = pos.lat;
        lngInput.value = pos.lng;
    });

    map.on('click', function(e) {
        marker.setLatLng(e.latlng);
        latInput.value = e.latlng.lat;
        lngInput.value = e.latlng.lng;
    });

    return { map, marker };
}
