/**
 * ParkLive – reserves.controller.js
 * Controlador de reserves: historial d'usuari, llistat admin,
 * filtre per estat, detall i creació de reserves.
 * Consumeix l'API Python (Flask) via AJAX.
 */

import { pythonApi } from '../api.js';
import { DEFAULT_LIMIT } from '../config.js';
import {
  showAlert,
  hideAllAlerts,
  serializeForm,
  validateForm,
  setFormLoading,
  formatDate,
  formatCurrency,
  getUserId,
  getQueryParam,
} from '../utils.js';

/*  FUNCIONS D'ACCÉS A L'API                                           */

/**
 * Obté l'historial de reserves d'un usuari.
 *
 * @param {Object} [filtres] – Claus opcionals:
 *   estat, data_desde, data_fins, aparcament_id, limit, offset
 * @returns {Promise<Array>}
 */
export async function obtenirReservesUsuari(filtres = {}) {
  const usuariId = getUserId();
  if (!usuariId) throw new Error('Usuari no autenticat');

  const params = {
    user_id: usuariId,
    limit: DEFAULT_LIMIT,
    offset: 0,
    ...filtres,
  };

  try {
    const data = await pythonApi.get('/api/usuari/reserves', params);
    if (filtres.returnFullData) {
        return data; // Retorna { reserves: [], total: X, paginacio: {} }
    }
    return Array.isArray(data) ? data : (data?.reserves || []);
  } catch (err) {
    console.error('[ParkLive] Error obtenint reserves de l\'usuari:', err);
    throw err;
  }
}

/**
 * Obté totes les reserves (admin). Accepta filtres opcionals.
 *
 * @param {Object} [filtres] – usuari_id, aparcament_id, estat,
 *   data_desde, data_fins, limit, offset
 * @returns {Promise<Array>}
 */
export async function obtenirTotesReserves(filtres = {}) {
  const params = {
    limit: DEFAULT_LIMIT,
    offset: 0,
    ...filtres,
  };

  try {
    const data = await pythonApi.get('/api/reserves', params);
    return Array.isArray(data) ? data : (data?.reserves || []);
  } catch (err) {
    console.error('[ParkLive] Error obtenint totes les reserves:', err);
    throw err;
  }
}

/**
 * Obté reserves filtrades per estat.
 *
 * @param {string} estat – pendent, confirmada, en_curs, completada, cancel·lada
 * @param {Object} [filtres] – limit, offset
 * @returns {Promise<Array>}
 */
export async function obtenirReservesPerEstat(estat, filtres = {}) {
  if (!estat) throw new Error('L\'estat és obligatori');

  const params = {
    estat,
    limit: DEFAULT_LIMIT,
    offset: 0,
    ...filtres,
  };

  try {
    const data = await pythonApi.get('/api/reserves/estat', params);
    return Array.isArray(data) ? data : (data?.reserves || []);
  } catch (err) {
    console.error(`[ParkLive] Error obtenint reserves per estat "${estat}":`, err);
    throw err;
  }
}

/**
 * Obté el detall d'una reserva concreta.
 *
 * @param {number|string} reservaId
 * @returns {Promise<Object>}
 */
export async function obtenirDetallReserva(reservaId) {
  try {
    return await pythonApi.get(`/api/reserves/${reservaId}`);
  } catch (err) {
    console.error(`[ParkLive] Error obtenint detall reserva ${reservaId}:`, err);
    throw err;
  }
}

/**
 * Crea una nova reserva.
 *
 * @param {Object} dades – Camps obligatoris:
 *   usuari_id, aparcament_id, data_entrada, data_sortida, preu_total
 *   Opcionals: descompte_aplicat, notes
 * @returns {Promise<Object>} – Resposta amb message i reserva
 */
export async function crearReserva(dades) {
  const required = ['usuari_id', 'aparcament_id', 'data_entrada', 'data_sortida', 'preu_total'];
  const missing = required.filter((k) => !dades[k] && dades[k] !== 0);

  if (missing.length > 0) {
    throw new Error(`Falten camps obligatoris: ${missing.join(', ')}`);
  }

  try {
    return await pythonApi.post('/api/reserves', dades);
  } catch (err) {
    console.error('[ParkLive] Error creant reserva:', err);
    throw err;
  }
}

/**
 * Cancel·la una reserva d'un usuari.
 * @param {number|string} reservaId
 * @returns {Promise<Object>}
 */
export async function cancelarReserva(reservaId) {
  if (!reservaId) throw new Error('ID de reserva obligatori');

  try {
    return await pythonApi.post(`/api/reserves/${reservaId}/cancel`);
  } catch (err) {
    console.error(`[ParkLive] Error cancel·lant reserva ${reservaId}:`, err);
    throw err;
  }
}

/*  RENDERITZACIÓ                                                       */

/** Mapatge d'estats a classes CSS per badges */
const ESTAT_CLASSES = {
  pendent: 'warning',
  confirmada: 'info',
  en_curs: 'primary',
  completada: 'success',
  'cancel·lada': 'danger',
};

/**
 * Renderitza una taula de reserves dins d'un contenidor.
 *
 * @param {Array}       reserves  – Llista de reserves
 * @param {HTMLElement}  container
 */
export function renderReserves(reserves, container) {
  if (!container) return;

  if (!reserves || reserves.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No s'han trobat reserves.</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <table class="table table-reserves">
      <thead>
        <tr>
          <th>ID</th>
          <th>Aparcament</th>
          <th>Entrada</th>
          <th>Sortida</th>
          <th>Preu</th>
          <th>Estat</th>
          <th>Accions</th>
        </tr>
      </thead>
      <tbody>
        ${reserves
      .map(
        (r) => `
          <tr data-reserva-id="${r.id}">
            <td>${r.id}</td>
            <td>${escapeHtml(r.nom_aparcament || r.aparcament_id || '—')}</td>
            <td>${formatDate(r.data_entrada)}</td>
            <td>${formatDate(r.data_sortida)}</td>
            <td>${formatCurrency(r.preu_total)}</td>
            <td><span class="badge badge-${ESTAT_CLASSES[r.estat] || 'secondary'}">${escapeHtml(r.estat || '—')}</span></td>
            <td><button class="btn btn-sm btn-primary btn-detall-reserva" data-id="${r.id}">Detall</button></td>
          </tr>`,
      )
      .join('')}
      </tbody>
    </table>`;
}

/**
 * Renderitza el detall complet d'una reserva.
 *
 * @param {Object}      reserva
 * @param {HTMLElement}  container
 */
export function renderDetallReserva(reserva, container) {
  if (!container || !reserva) return;

  const r = reserva;
  container.innerHTML = `
    <div class="detall-reserva">
      <header class="detall-header">
        <h2>Reserva #${r.id}</h2>
        <span class="badge badge-${ESTAT_CLASSES[r.estat] || 'secondary'}">${escapeHtml(r.estat || '—')}</span>
      </header>
      <div class="detall-info">
        <dl>
          <dt>Aparcament</dt><dd>${escapeHtml(r.nom_aparcament || String(r.aparcament_id || '—'))}</dd>
          <dt>Data d'entrada</dt><dd>${formatDate(r.data_entrada)}</dd>
          <dt>Data de sortida</dt><dd>${formatDate(r.data_sortida)}</dd>
          <dt>Preu total</dt><dd>${formatCurrency(r.preu_total)}</dd>
          <dt>Descompte</dt><dd>${r.descompte_aplicat ? formatCurrency(r.descompte_aplicat) : '—'}</dd>
          <dt>Notes</dt><dd>${escapeHtml(r.notes || '—')}</dd>
        </dl>
      </div>
    </div>`;
}

/*  INICIALITZACIÓ DE LA PÀGINA                                        */

/**
 * Punt d'entrada del controlador de reserves.
 * Detecta elements DOM i vincula events.
 */
export async function initReserves() {
  const listContainer = document.querySelector('[data-role="reserves-list"]');
  const detailContainer = document.querySelector('[data-role="reserva-detail"]');
  const createForm = document.querySelector('[data-role="crear-reserva"]');
  const filterForm = document.querySelector('[data-role="reserves-filter"]');

  // ── Detall d'una reserva concreta ─────────────────────────────
  const reservaId = getQueryParam('reserva_id');
  if (reservaId && detailContainer) {
    try {
      const reserva = await obtenirDetallReserva(reservaId);
      renderDetallReserva(reserva, detailContainer);
    } catch (err) {
      showAlert('error', 'No s\'ha pogut carregar el detall de la reserva.');
    }
    return;
  }

  // ── Llistat de reserves ───────────────────────────────────────
  if (listContainer) {
    await carregarReserves(listContainer);
  }

  // ── Filtre per estat o dates ──────────────────────────────────
  if (filterForm) {
    filterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAllAlerts();

      const filtres = Object.fromEntries(
        [...new FormData(filterForm).entries()].filter(([, v]) => v !== ''),
      );

      try {
        const reserves = filtres.estat
          ? await obtenirReservesPerEstat(filtres.estat, filtres)
          : await obtenirReservesUsuari(filtres);

        if (listContainer) {
          renderReserves(reserves, listContainer);
          attachReservaDetailListeners(listContainer);
        }
      } catch (err) {
        showAlert('error', 'Error al filtrar les reserves.');
      }
    });
  }

  // ── Formulari de crear reserva ────────────────────────────────
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAllAlerts();

      if (!validateForm(createForm)) return;

      const data = serializeForm(createForm);

      // Assegurar que usuari_id s'inclou
      data.usuari_id = data.usuari_id || getUserId();

      // Convertir camps numèrics
      if (data.aparcament_id) data.aparcament_id = Number(data.aparcament_id);
      if (data.preu_total) data.preu_total = Number(data.preu_total);
      if (data.descompte_aplicat) data.descompte_aplicat = Number(data.descompte_aplicat);

      setFormLoading(createForm, true);

      try {
        const result = await crearReserva(data);
        showAlert('success', result.message || 'Reserva creada amb èxit.');
        createForm.reset();

        // Refrescar llistat si existeix
        if (listContainer) {
          await carregarReserves(listContainer);
        }
      } catch (err) {
        showAlert('error', err.message || 'Error en crear la reserva.');
      } finally {
        setFormLoading(createForm, false);
      }
    });
  }

  // ── Secció de reserves del Perfil (Cards modernes) ────────────
  const profileContainer = document.getElementById('profile-reservations-container');
  if (profileContainer) {
    await carregarReservesPerfil(profileContainer);

    // Configurar botó de confirmació del modal
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    if (confirmCancelBtn) {
      confirmCancelBtn.addEventListener('click', async () => {
        const id = confirmCancelBtn.dataset.reservaId;
        if (!id) return;

        // Mostrar loading al botó
        const originalText = confirmCancelBtn.innerHTML;
        confirmCancelBtn.disabled = true;
        confirmCancelBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processant...';

        try {
          await cancelarReserva(id);
          showAlert('success', 'Reserva cancel·lada correctament.');

          // Tancar modal
          const modalEl = document.getElementById('cancelModal');
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) {
            modal.hide();
          }

          // Forçar neteja del backdrop per si Bootstrap triga massa o es queda bloquejat
          const backdrop = document.querySelector('.modal-backdrop');
          if (backdrop) backdrop.remove();
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';

          // Recarregar llista
          await carregarReservesPerfil(profileContainer);
        } catch (err) {
          showAlert('error', err.response?.data?.error || 'Error al cancel·lar la reserva.');
        } finally {
          confirmCancelBtn.disabled = false;
          confirmCancelBtn.innerHTML = originalText;
        }
      });
    }
  }
}

/**
 * Carrega les reserves de l'usuari i les renderitza amb format profile.
 */
async function carregarReservesPerfil(container) {
  try {
    // Podem filtrar per mostrar només les que no estan cancel·lades o totes
    const reserves = await obtenirReservesUsuari();

    // Filtrar reserves actives (futures o en curs)
    const ara = new Date();
    const reservesActives = reserves.filter(r => {
      const dataSortida = new Date(r.data_sortida);
      const est = (r.estat || '').trim().toLowerCase();
      return ['confirmada', 'en_curs', 'pendent'].includes(est) && dataSortida >= ara;
    });

    // Les reserves solen venir ordenades per data d'entrada desc
    renderProfileReserves(reservesActives, container);
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">Error carregant reserves: ${err.message}</div>`;
  }
}

/*  HELPERS PRIVATS                                                     */

/**
 * Carrega i renderitza les reserves de l'usuari actual.
 * @param {HTMLElement} container
 */
async function carregarReserves(container) {
  try {
    const reserves = await obtenirReservesUsuari();
    renderReserves(reserves, container);
    attachReservaDetailListeners(container);
  } catch (err) {
    showAlert('error', 'No s\'han pogut carregar les reserves.');
  }
}

/**
 * Connecta click als botons "Detall" de cada fila.
 * @param {HTMLElement} container
 */
function attachReservaDetailListeners(container) {
  container.querySelectorAll('.btn-detall-reserva').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      window.location.href = `?reserva_id=${id}`;
    });
  });
}

/**
 * Renderitza la secció de reserves del perfil d'usuari (cards modernes).
 * @param {Array} reserves 
 * @param {HTMLElement} container 
 */
export function renderProfileReserves(reserves, container) {
  if (!container) return;

  if (!reserves || reserves.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-calendar-x text-light-gray display-1 mb-3"></i>
        <h4 class="text-secondary">No tens reserves actives</h4>
        <p class="text-muted">Troba un pàrquing i reserva la teva plaça ara mateix.</p>
        <a href="/" class="btn btn-primary mt-3 px-4">Cercar pàrquing</a>
      </div>`;
    return;
  }

  // Filtrar només actives/confirmades per aquesta secció específica si es vol
  // Per ara mostrem totes les que ens passin (el controller ja hauria de filtrar)

  const html = reserves.map(r => {
    const dataCarpentry = new Date(r.data_entrada);
    const ara = new Date();
    const difMs = dataCarpentry - ara;
    const difMinuts = Math.floor(difMs / (1000 * 60));

    const normalizedEstat = (r.estat || '').trim().toLowerCase();
    const potSerCancelada = normalizedEstat === 'confirmada' || normalizedEstat === 'pendent';
    const esCancelable = potSerCancelada && difMinuts > 60;
    const esImminent = potSerCancelada && difMinuts <= 60 && difMinuts > 0;


    let borderClass = 'border-secondary';
    let badgeClass = 'bg-secondary';
    let statusLabel = (r.estat || 'Desconegut').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

    if (potSerCancelada) {
      borderClass = 'border-confirmed';
      badgeClass = 'badge-confirmed';
      statusLabel = normalizedEstat === 'pendent' ? 'Pendent' : 'Confirmada';
    } else if (normalizedEstat === 'cancel·lada') {
      borderClass = 'border-danger';
      badgeClass = 'bg-danger';
      statusLabel = 'Cancel·lada';
    } else if (normalizedEstat === 'en_curs') {
      borderClass = 'border-primary';
      badgeClass = 'bg-primary';
      statusLabel = 'En curs';
    }

    if (esImminent) {
      borderClass = 'border-imminent';
      badgeClass = 'badge-imminent';
      statusLabel = 'Imminent';
    }

    return `
      <div class="col-12 col-xl-6">
        <div class="reservation-card ${borderClass}">
          <div class="reservation-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <div class="d-flex align-items-center gap-2">
                <i class="bi bi-briefcase text-secondary"></i>
                <h5 class="mb-0 fw-bold">${escapeHtml(r.aparcament?.nom || 'Pàrquing')}</h5>
              </div>
              <span class="status-badge ${badgeClass}">${statusLabel}</span>
            </div>

            <div class="mb-4">
              <p class="text-secondary small mb-1">
                <i class="bi bi-geo-alt me-1"></i> ${escapeHtml(r.aparcament?.adreca || '')}, ${escapeHtml(r.aparcament?.ciutat || '')}
              </p>
            </div>

            <div class="row g-2 mb-4">
              <div class="col-6">
                <div class="label-caps mb-1">ENTRADA</div>
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-calendar2-week text-secondary"></i>
                  <span class="fw-bold fs-6">${new Date(r.data_entrada).toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} h</span>
                </div>
              </div>
              <div class="col-6">
                <div class="label-caps mb-1">SORTIDA</div>
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-calendar2-week text-secondary"></i>
                  <span class="fw-bold fs-6">${new Date(r.data_sortida).toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} h</span>
                </div>
              </div>
            </div>

            <div class="mb-4 d-flex align-items-center gap-2 text-secondary small">
              <i class="bi bi-list-columns-reverse"></i>
              <span class="font-monospace">${r.codi_reserva}</span>
            </div>

            ${esImminent ? `
              <div class="alert-imminent mb-3">
                <i class="bi bi-exclamation-triangle-fill"></i>
                <span>No es pot cancel·lar, falten menys de 60 min.</span>
              </div>
            ` : ''}

            <div class="d-flex gap-2">
              <a href="/tiquet_Aparcament.html?id=${r.id}" class="btn-dark-modern text-decoration-none">
                <i class="bi bi-file-earmark-text"></i> Veure tiquet
              </a>
              ${potSerCancelada ? `
                <button type="button" class="btn-outline-cancel ${!esCancelable ? 'opacity-50' : ''}" 
                  ${!esCancelable ? 'disabled style="border-color: #e5e7eb; color: #9ca3af;"' : ''}
                  onclick="setCancelReservationId(${r.id})">
                  Cancel·lar reserva
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `<div class="row g-4">${html}</div>`;
}

// Funció global per gestionar el modal (centralitzada)
if (typeof window !== 'undefined') {
  window.setCancelReservationId = (id) => {
    const modalEl = document.getElementById('cancelModal');
    if (!modalEl) return;

    if (modalEl.parentNode !== document.body) {
      document.body.appendChild(modalEl);
    }

    const confirmBtn = document.getElementById('confirmCancelBtn');
    if (confirmBtn) confirmBtn.dataset.reservaId = id;

    // Usar getOrCreateInstance evita duplicar backdrops i instàncies redundants
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  };
}

/**
 * Escapa caràcters HTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
