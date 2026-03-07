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

/* ================================================================== */
/*  FUNCIONS D'ACCÉS A L'API                                           */
/* ================================================================== */

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
    usuari_id: usuariId,
    limit: DEFAULT_LIMIT,
    offset: 0,
    ...filtres,
  };

  try {
    const data = await pythonApi.get('/api/usuari/reserves', params);
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

/* ================================================================== */
/*  RENDERITZACIÓ                                                       */
/* ================================================================== */

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

/* ================================================================== */
/*  INICIALITZACIÓ DE LA PÀGINA                                        */
/* ================================================================== */

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
}

/* ================================================================== */
/*  HELPERS PRIVATS                                                     */
/* ================================================================== */

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
