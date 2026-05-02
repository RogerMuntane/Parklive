import { pythonApi } from '../api.js';
import { getUserId, showBootstrapAlert } from '../utils.js';

const DEFAULT_CENTER = [41.3872, 2.1703];
const DEFAULT_ZOOM = 14;
const REPORT_COOLDOWN_SECONDS = 60;
const COOLDOWN_STORAGE_KEY = 'parklive_report_disponibilitat_cooldown_until';

function setStatusButtons(statusButtons, nextStatus) {
  statusButtons.forEach((button) => {
    const active = button.dataset.status === nextStatus;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function showToast(toastEl, message, type = 'success') {
  const alertType = type === 'error' ? 'danger' : type;
  showBootstrapAlert(alertType, message);
  
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.className = `report-toast is-visible is-${type}`;

  globalThis.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = globalThis.setTimeout(() => {
    toastEl.classList.remove('is-visible');
  }, 2600);
}

function getCooldownUntil() {
  const storedValue = Number(globalThis.localStorage.getItem(COOLDOWN_STORAGE_KEY));
  if (!Number.isFinite(storedValue) || storedValue <= Date.now()) {
    return 0;
  }

  return storedValue;
}

function setCooldownUntil(untilMs) {
  if (!Number.isFinite(untilMs) || untilMs <= Date.now()) {
    globalThis.localStorage.removeItem(COOLDOWN_STORAGE_KEY);
    return;
  }

  globalThis.localStorage.setItem(COOLDOWN_STORAGE_KEY, String(Math.floor(untilMs)));
}

function formatCooldownText(secondsLeft) {
  const safeSeconds = Math.max(0, Math.ceil(secondsLeft));
  return `Espera ${safeSeconds}s`;
}

async function resolveCurrentPosition() {
  if (!globalThis.navigator?.geolocation) {
    throw new Error('El teu navegador no admet geolocalització.');
  }

  return new Promise((resolve, reject) => {
    globalThis.navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position?.coords?.latitude);
        const lon = Number(position?.coords?.longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          reject(new Error('No s\'ha pogut determinar la teva ubicació actual.'));
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
  let marker = null;
  let cooldownUntilMs = getCooldownUntil();
  let cooldownTimerId = null;

  const clearCooldownTimer = () => {
    if (cooldownTimerId) {
      globalThis.clearInterval(cooldownTimerId);
      cooldownTimerId = null;
    }
  };

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

  const map = globalThis.L.map(mapEl).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  globalThis.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; Col·laboradors d\'OpenStreetMap',
  }).addTo(map);

  const syncMapPosition = ({ lat, lon }) => {
    const latLng = [lat, lon];

    if (marker) {
      marker.setLatLng(latLng);
    } else {
      marker = globalThis.L.marker(latLng).addTo(map);
    }

    marker.bindPopup('Ubicació del report').openPopup();
    map.flyTo(latLng, 17, { duration: 0.8 });

    coordsEl.innerHTML = `<i class="bi bi-geo-alt"></i><span>Lat ${lat.toFixed(5)} · Lon ${lon.toFixed(5)}</span>`;
  };

  const loadPosition = async () => {
    try {
      currentCoords = await resolveCurrentPosition();
      syncMapPosition(currentCoords);
    } catch (error) {
      coordsEl.innerHTML = `<i class="bi bi-exclamation-triangle"></i><span>${error.message}</span>`;
      showToast(toastEl, error.message, 'error');
    }
  };

  statusButtons.forEach((button) => {
    button.addEventListener('click', () => {
      selectedStatus = button.dataset.status;
      setStatusButtons(statusButtons, selectedStatus);
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

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
      const successCooldownSeconds = Number(response?.cooldown_seconds);
      const cooldownSeconds = Number.isFinite(successCooldownSeconds) && successCooldownSeconds > 0
        ? successCooldownSeconds
        : REPORT_COOLDOWN_SECONDS;

      showToast(toastEl, 'Report enviat. Gràcies per col·laborar.', 'success');
      form.reset();
      selectedStatus = 'available';
      setStatusButtons(statusButtons, selectedStatus);
      startCooldown(cooldownSeconds);

      // Tornar al mapa després d'un breu retard
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 1500);
    } catch (error) {
      if (error?.status === 429) {
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

  loadPosition();
  refreshSubmitCooldown();
}