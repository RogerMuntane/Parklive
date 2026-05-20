/**
 * ParkLive – report-disponibilitat.controller.js
 *
 * Controlador per a la pàgina de reportar disponibilitat al carrer.
 * Permet als usuaris informar si una zona d'aparcament lliure està ocupada o disponible.
 * Inclou geolocalització, restricció de radi (150m) i gestió de cooldown (temps d'espera).
 */

import { pythonApi } from '../api.js';
import { getUserId, showBootstrapAlert } from '../utils.js';

const DEFAULT_CENTER = [41.3872, 2.1703];
const DEFAULT_ZOOM = 14;
const REPORT_COOLDOWN_SECONDS = 60;
const COOLDOWN_STORAGE_KEY = 'parklive_report_disponibilitat_cooldown_until';

/**
 * Actualitza l'estat visual dels botons de selecció (Disponible/Ocupat).
 *
 * @param {HTMLElement[]} statusButtons - Llista de botons d'estat.
 * @param {string} nextStatus - L'estat a activar ('available' o 'occupied').
 */
function setStatusButtons(statusButtons, nextStatus) {
  statusButtons.forEach((button) => {
    const active = button.dataset.status === nextStatus;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

/**
 * Mostra un missatge flotant (toast) informatiu o d'error.
 *
 * @param {HTMLElement} toastEl - Element on es mostrarà el missatge.
 * @param {string} message - Text a mostrar.
 * @param {string} [type='success'] - Tipus de missatge ('success' o 'error').
 */
function showToast(toastEl, message, type = 'success') {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.className = `report-toast is-visible is-${type}`;

  globalThis.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = globalThis.setTimeout(() => {
    toastEl.classList.remove('is-visible');
  }, 2600);
}

/**
 * Obté la data límit del temps d'espera des del localStorage.
 *
 * @returns {number} Timestamp en ms o 0 si no n'hi ha.
 */
function getCooldownUntil() {
  const storedValue = Number(globalThis.localStorage.getItem(COOLDOWN_STORAGE_KEY));
  if (!Number.isFinite(storedValue) || storedValue <= Date.now()) {
    return 0;
  }

  return storedValue;
}

/**
 * Desa la data límit del temps d'espera al localStorage.
 *
 * @param {number} untilMs - Timestamp en ms.
 */
function setCooldownUntil(untilMs) {
  if (!Number.isFinite(untilMs) || untilMs <= Date.now()) {
    globalThis.localStorage.removeItem(COOLDOWN_STORAGE_KEY);
    return;
  }

  globalThis.localStorage.setItem(COOLDOWN_STORAGE_KEY, String(Math.floor(untilMs)));
}

/**
 * Formata el text del botó durant el compte enrere.
 */
function formatCooldownText(secondsLeft) {
  const safeSeconds = Math.max(0, Math.ceil(secondsLeft));
  return `Espera ${safeSeconds}s`;
}

/**
 * Intenta obtenir la ubicació GPS actual de l'usuari.
 *
 * @returns {Promise<{lat: number, lon: number}>} Coordenades de l'usuari.
 */
async function resolveCurrentPosition() {
  if (!globalThis.navigator?.geolocation) {
    throw new Error('El teu navegador no admet geolocalització.');
  }

  return new Promise((resolve, reject) => {
    globalThis.navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position?.coords?.latitude);
        const lon = Number(position?.coords?.longitude);
        const accuracy = position?.coords?.accuracy;

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          reject(new Error('No s\'ha pogut determinar la teva ubicació actual.'));
          return;
        }

        // Filtre de precisió: evitem ubicacions massa imprecises (> 5km)
        if (accuracy && accuracy > 5000) {
          reject(new Error('La precisió de la ubicació és massa baixa. Comprova el GPS.'));
          return;
        }

        resolve({ lat, lon });
      },
      () => {
        reject(new Error('Activa la ubicació per poder reportar la plaça al carrer.'));
      },
      {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 60 * 1000,
      },
    );
  });
}

/**
 * Inicialitza tota la lògica de la pàgina de reports de disponibilitat.
 */
export function initReportDisponibilitat() {
  const form = document.getElementById('reportDisponibilitatForm');
  const mapEl = document.getElementById('reportDisponibilitatMap');
  const coordsEl = document.getElementById('reportDisponibilitatCoords');
  const toastEl = document.getElementById('reportDisponibilitatToast');
  const submitBtn = document.getElementById('reportDisponibilitatSubmit');
  const commentEl = document.getElementById('reportDisponibilitatComment');
  const statusButtons = Array.from(document.querySelectorAll('.report-status-option[data-status]'));

  if (!form || !mapEl || !coordsEl || !submitBtn || statusButtons.length === 0 || !globalThis.L) {
    return;
  }

  let selectedStatus = 'available';
  let currentCoords = null;
  let userGpsCoords = null;    // Posició GPS real de l'usuari (referència per al radi)
  let marker = null;
  let allowedCircle = null;    // Cercle visual de l'àrea permesa
  let cooldownUntilMs = getCooldownUntil();
  let cooldownTimerId = null;

  const MAX_RADIUS_M = 150; // Radi màxim permès en metres des de la posició GPS real

  /**
   * Fórmula Haversine: calcula la distància en metres entre dos punts (lat/lon).
   */
  const haversineMeters = (a, b) => {
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const sinLat = Math.sin(dLat / 2);
    const sinLon = Math.sin(dLon / 2);
    const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLon * sinLon;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  };

  /**
   * Força un punt (target) a quedar-se dins del radi màxim respecte a l'origen (GPS).
   * S'utilitza per evitar que els usuaris reportin places lluny d'on realment es troben.
   */
  const clampToRadius = (target, origin) => {
    const dist = haversineMeters(origin, target);
    if (dist <= MAX_RADIUS_M) return target;

    // Si està fora, calculem el punt més proper sobre el perímetre del cercle
    const R = 6371000;
    const toRad = (d) => (d * Math.PI) / 180;
    const toDeg = (r) => (r * 180) / Math.PI;
    const φ1 = toRad(origin.lat);
    const λ1 = toRad(origin.lon);
    const bearing = Math.atan2(
      Math.sin(toRad(target.lon - origin.lon)) * Math.cos(toRad(target.lat)),
      Math.cos(φ1) * Math.sin(toRad(target.lat)) - Math.sin(φ1) * Math.cos(toRad(target.lat)) * Math.cos(toRad(target.lon - origin.lon))
    );
    const d = MAX_RADIUS_M / R;
    const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(bearing));
    const λ2 = λ1 + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2));
    return { lat: toDeg(φ2), lon: toDeg(λ2) };
  };

  /**
   * Atura el temporitzador de cooldown.
   */
  const clearCooldownTimer = () => {
    if (cooldownTimerId) {
      globalThis.clearInterval(cooldownTimerId);
      cooldownTimerId = null;
    }
  };

  /**
   * Actualitza l'estat del botó d'enviament segons el temps d'espera restant.
   */
  const refreshSubmitCooldown = () => {
    const secondsLeft = (cooldownUntilMs - Date.now()) / 1000;
    if (secondsLeft <= 0) {
      clearCooldownTimer();
      cooldownUntilMs = 0;
      setCooldownUntil(0);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar report';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = formatCooldownText(secondsLeft);
  };

  /**
   * Inicia el compte enrere per poder fer un nou report.
   */
  const startCooldown = (seconds) => {
    const safeSeconds = Math.max(1, Math.ceil(Number(seconds) || REPORT_COOLDOWN_SECONDS));
    cooldownUntilMs = Date.now() + safeSeconds * 1000;
    setCooldownUntil(cooldownUntilMs);
    refreshSubmitCooldown();

    clearCooldownTimer();
    cooldownTimerId = globalThis.setInterval(() => {
      refreshSubmitCooldown();
    }, 500);
  };

  // ── Inicialitzar mapa Leaflet ─────────────────────────────────────────────
  const map = globalThis.L.map(mapEl, {
    zoomControl: false,
    attributionControl: false,
    preferCanvas: true,
    worldCopyJump: true,
  }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

  globalThis.L.control.scale({ imperial: false, position: 'bottomright' }).addTo(map);
  globalThis.L.control.zoom({ position: 'bottomright' }).addTo(map);
  globalThis.L.control
    .attribution({ position: 'bottomleft', prefix: false })
    .addTo(map)
    .addAttribution('© OpenStreetMap contributors, © CARTO');

  globalThis.L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    { subdomains: 'abcd', minZoom: 4, maxZoom: 20 },
  ).addTo(map);

  /**
   * Actualitza les coordenades mostrades a l'usuari sota el mapa.
   */
  const updateCoordDisplay = ({ lat, lon }) => {
    coordsEl.innerHTML = `<i class="bi bi-geo-alt"></i><span>Lat ${lat.toFixed(5)} · Lon ${lon.toFixed(5)}</span>`;
  };

  /**
   * Sincronitza la posició del marcador personalitzat al mapa.
   * Si no existeix, el crea amb el seu icona de polsació (pulse).
   */
  const syncMapPosition = ({ lat, lon }, animate = true) => {
    const latLng = [lat, lon];

    if (marker) {
      marker.setLatLng(latLng);
    } else {
      const reportIcon = globalThis.L.divIcon({
        className: 'report-location-marker-wrapper',
        html: `
          <div class="report-location-marker">
            <div class="report-location-marker__pulse"></div>
            <div class="report-location-marker__icon rounded-circle bg-primary d-flex align-items-center justify-content-center text-white border border-2 border-white shadow">
              <i class="bi bi-broadcast-pin"></i>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      marker = globalThis.L.marker(latLng, {
        draggable: true,
        icon: reportIcon
      }).addTo(map);
      marker.bindPopup('Arrossega per ajustar · Radi màxim 150 m').openPopup();

      // En arrossegar, limitem el marcador al radi de 150m si coneixem la posició GPS real
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        let clamped = { lat: pos.lat, lon: pos.lng };

        if (userGpsCoords) {
          const dist = haversineMeters(userGpsCoords, clamped);
          if (dist > MAX_RADIUS_M) {
            clamped = clampToRadius(clamped, userGpsCoords);
            marker.setLatLng([clamped.lat, clamped.lon]);
            showToast(toastEl, `Ubicació limitada a ${MAX_RADIUS_M} m de la teva posició.`, 'error');
          }
        }

        currentCoords = clamped;
        updateCoordDisplay(clamped);
      });
    }

    if (animate) map.flyTo(latLng, 17, { duration: 0.8 });
    updateCoordDisplay({ lat, lon });
  };

  // Clic al mapa: mou el marcador a la posició clicada (respectant el radi màxim)
  map.on('click', (e) => {
    const clicked = { lat: e.latlng.lat, lon: e.latlng.lng };

    if (userGpsCoords) {
      const dist = haversineMeters(userGpsCoords, clicked);
      if (dist > MAX_RADIUS_M) {
        const clamped = clampToRadius(clicked, userGpsCoords);
        currentCoords = clamped;
        syncMapPosition(clamped, false);
        showToast(toastEl, `Ubicació limitada a ${MAX_RADIUS_M} m de la teva posició.`, 'error');
        return;
      }
    }

    currentCoords = clicked;
    syncMapPosition(clicked, false);
  });

  /**
   * Obté la posició inicial i dibuixa el cercle blau de permís (radi de 150m).
   */
  const loadPosition = async () => {
    try {
      const gps = await resolveCurrentPosition();
      userGpsCoords = gps;
      currentCoords = gps;

      // Dibuixar cercle de l'àrea permesa al voltant de la posició GPS real
      if (allowedCircle) allowedCircle.remove();
      allowedCircle = globalThis.L.circle([gps.lat, gps.lon], {
        radius: MAX_RADIUS_M,
        color: '#2563eb',
        weight: 1.5,
        fillColor: '#2563eb',
        fillOpacity: 0.07,
        dashArray: '6 4',
      }).addTo(map);

      syncMapPosition(gps);
    } catch (error) {
      coordsEl.innerHTML = `<i class="bi bi-exclamation-triangle"></i><span>${error.message}</span>`;
      showToast(toastEl, error.message, 'error');
    }
  };

  // Selecció d'estat (Disponible / Ocupat)
  statusButtons.forEach((button) => {
    button.addEventListener('click', () => {
      selectedStatus = button.dataset.status;
      setStatusButtons(statusButtons, selectedStatus);
    });
  });

  // Enviament del formulari
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Verifiquem cooldown abans d'enviar
    const localCooldownLeft = (cooldownUntilMs - Date.now()) / 1000;
    if (localCooldownLeft > 0) {
      showToast(toastEl, `Espera ${Math.ceil(localCooldownLeft)}s per tornar a reportar.`, 'error');
      refreshSubmitCooldown();
      return;
    }

    if (!currentCoords) {
      showToast(toastEl, 'Primer hem d\'obtenir la teva ubicació actual.', 'error');
      await loadPosition();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Enviant...';

    const payload = {
      usuari_id: getUserId() || null,
      status: selectedStatus,
      comment: commentEl?.value?.trim() || '',
      latitud: currentCoords.lat,
      longitud: currentCoords.lon,
    };

    try {
      const response = await pythonApi.post('/api/reports/disponibilitat', payload);

      // El backend ens pot retornar un temps d'espera personalitzat
      const successCooldownSeconds = Number(response?.cooldown_seconds);
      const cooldownSeconds = Number.isFinite(successCooldownSeconds) && successCooldownSeconds > 0
        ? successCooldownSeconds
        : REPORT_COOLDOWN_SECONDS;

      showToast(toastEl, 'Report enviat. Gràcies per col·laborar.', 'success');
      form.reset();
      selectedStatus = 'available';
      setStatusButtons(statusButtons, selectedStatus);
      startCooldown(cooldownSeconds);

      // Tornem a la home després d'uns segons
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      if (error?.status === 429) {
        // Error de "Too Many Requests": l'API ens diu quant de temps hem d'esperar
        const secondsLeft = Number(error?.data?.cooldown_seconds_left);
        const safeSeconds = Number.isFinite(secondsLeft) && secondsLeft > 0
          ? secondsLeft
          : REPORT_COOLDOWN_SECONDS;
        showToast(toastEl, `Espera ${Math.ceil(safeSeconds)}s per tornar a reportar.`, 'error');
        startCooldown(safeSeconds);
      } else {
        showToast(toastEl, error.message || 'No s\'ha pogut enviar el report.', 'error');
      }
    } finally {
      if (cooldownUntilMs <= Date.now()) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar report';
      }
    }
  });

  // Execució inicial
  loadPosition();
  refreshSubmitCooldown();
}