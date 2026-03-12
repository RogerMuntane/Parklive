/**
 * ParkLive – aparcament.controller.js
 * Controlador d'aparcaments: llistat, cerca amb filtres i detall.
 * Consumeix l'API Python (Flask) via AJAX.
 */

import { pythonApi } from '../api.js';
import { DEFAULT_LIMIT } from '../config.js';
import {
  showAlert,
  hideAllAlerts,
  formatCurrency,
  debounce,
  getQueryParam,
} from '../utils.js';

/*  LLISTAR APARCAMENTS                                                */

/**
 * Obté tots els aparcaments disponibles.
 * @returns {Promise<Array>}
 */
export async function llistarAparcaments() {
  try {
    const data = await pythonApi.get('/api/aparcaments');
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[ParkLive] Error llistant aparcaments:', err);
    throw err;
  }
}

/*  CERCA AMB FILTRES                                                   */

/**
 * Cerca aparcaments amb filtres opcionals.
 *
 * @param {Object} filtres – Claus possibles:
 *   ciutat, tipus, estat, tarifa_hora_min, tarifa_hora_max,
 *   tarifa_dia_min, tarifa_dia_max, accessibilitat, carrega_electrica,
 *   videovigilancia, obert_24h, valoracio_min, latitud, longitud,
 *   radi_km, limite, offset
 * @returns {Promise<Array>}
 */
export async function cercarAparcaments(filtres = {}) {
  try {
    const params = {
      limite: DEFAULT_LIMIT,
      offset: 0,
      ...filtres,
    };

    const data = await pythonApi.get('/api/aparcaments/cerca', params);
    return Array.isArray(data) ? data : (data?.aparcaments || []);
  } catch (err) {
    console.error('[ParkLive] Error cercant aparcaments:', err);
    throw err;
  }
}

/*  DETALL D'APARCAMENT                                                */

/**
 * Obté el detall d'un aparcament per ID.
 *
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
export async function obtenirAparcament(id) {
  try {
    return await pythonApi.get(`/api/aparcaments/${id}`);
  } catch (err) {
    console.error(`[ParkLive] Error obtenint aparcament ${id}:`, err);
    throw err;
  }
}

/*  RENDERITZACIÓ                                                       */

/**
 * Renderitza una llista d'aparcaments dins d'un contenidor DOM.
 *
 * @param {Array}       aparcaments – Array d'objectes aparcament
 * @param {HTMLElement} container   – Element DOM on injectar el HTML
 */
export function renderAparcaments(aparcaments, container) {
  if (!container) return;

  if (!aparcaments || aparcaments.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No s'han trobat aparcaments.</p>
      </div>`;
    return;
  }

  container.innerHTML = aparcaments
    .map(
      (a) => `
      <article class="card card-aparcament" data-id="${a.id}">
        <div class="card-body">
          <h3 class="card-title">${escapeHtml(a.nom || 'Aparcament')}</h3>
          <p class="card-text">${escapeHtml(a.adreca || a.ciutat || '')}</p>
          <div class="card-meta">
            <span class="badge badge-${a.estat || 'actiu'}">${escapeHtml(a.estat || 'actiu')}</span>
            ${a.tarifa_hora != null ? `<span class="card-price">${formatCurrency(a.tarifa_hora)}/h</span>` : ''}
          </div>
          <div class="card-features">
            ${a.accessibilitat ? '<span class="feature-tag">♿ Accessible</span>' : ''}
            ${a.carrega_electrica ? '<span class="feature-tag">⚡ Càrrega</span>' : ''}
            ${a.obert_24h ? '<span class="feature-tag"> 24h</span>' : ''}
          </div>
        </div>
        <div class="card-actions">
          <button class="btn btn-sm btn-primary btn-detall" data-id="${a.id}">Veure detall</button>
        </div>
      </article>`,
    )
    .join('');
}

/**
 * Renderitza el detall complet d'un aparcament.
 *
 * @param {Object}      aparcament – Objecte amb totes les dades
 * @param {HTMLElement}  container  – Element DOM on injectar
 */
export function renderDetallAparcament(aparcament, container) {
  if (!container || !aparcament) return;

  const a = aparcament;
  container.innerHTML = `
    <div class="detall-aparcament">
      <header class="detall-header">
        <h2>${escapeHtml(a.nom || 'Aparcament')}</h2>
        <span class="badge badge-${a.estat || 'actiu'}">${escapeHtml(a.estat || 'actiu')}</span>
      </header>
      <div class="detall-info">
        <dl>
          <dt>Adreça</dt><dd>${escapeHtml(a.adreca || '—')}</dd>
          <dt>Ciutat</dt><dd>${escapeHtml(a.ciutat || '—')}</dd>
          <dt>Tipus</dt><dd>${escapeHtml(a.tipus || '—')}</dd>
          <dt>Places totals</dt><dd>${a.places_totals ?? '—'}</dd>
          <dt>Places disponibles</dt><dd>${a.places_disponibles ?? '—'}</dd>
          <dt>Tarifa/hora</dt><dd>${formatCurrency(a.tarifa_hora)}</dd>
          <dt>Tarifa/dia</dt><dd>${formatCurrency(a.tarifa_dia)}</dd>
          <dt>Valoració</dt><dd>${a.valoracio_mitjana != null ? `${a.valoracio_mitjana} / 5` : '—'}</dd>
        </dl>
      </div>
      <div class="detall-features">
        <h3>Serveis</h3>
        <ul>
          <li>${a.accessibilitat ? '✅' : '❌'} Accessibilitat</li>
          <li>${a.carrega_electrica ? '✅' : '❌'} Càrrega elèctrica</li>
          <li>${a.videovigilancia ? '✅' : '❌'} Videovigilància</li>
          <li>${a.obert_24h ? '✅' : '❌'} Obert 24h</li>
        </ul>
      </div>
    </div>`;
}

/*  INICIALITZACIÓ DE LA PÀGINA                                        */

/**
 * Inicialitza la interfície d'aparcaments.
 * Detecta els elements de la pàgina i carrega les dades.
 */
export async function initAparcaments() {
  const listContainer = document.querySelector('[data-role="aparcaments-list"]');
  const detailContainer = document.querySelector('[data-role="aparcament-detail"]');
  const searchForm = document.querySelector('[data-role="aparcaments-search"]');

  // ── Detall d'un aparcament concret ────────────────────────────
  const aparcamentId = getQueryParam('aparcament_id');
  if (aparcamentId && detailContainer) {
    try {
      const aparcament = await obtenirAparcament(aparcamentId);
      renderDetallAparcament(aparcament, detailContainer);
    } catch (err) {
      showAlert('error', 'No s\'ha pogut carregar el detall de l\'aparcament.');
    }
    return;
  }

  // ── Llistat general ──────────────────────────────────────────
  if (listContainer) {
    try {
      const aparcaments = await llistarAparcaments();
      renderAparcaments(aparcaments, listContainer);
      attachDetailListeners(listContainer);
    } catch (err) {
      showAlert('error', 'No s\'han pogut carregar els aparcaments.');
    }
  }

  // ── Cerca amb filtres ────────────────────────────────────────
  if (searchForm) {
    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAllAlerts();

      const formData = new FormData(searchForm);
      const filtres = Object.fromEntries(
        [...formData.entries()].filter(([, v]) => v !== ''),
      );

      try {
        const resultats = await cercarAparcaments(filtres);
        if (listContainer) {
          renderAparcaments(resultats, listContainer);
          attachDetailListeners(listContainer);
        }
      } catch (err) {
        showAlert('error', 'Error en la cerca d\'aparcaments.');
      }
    });

    // Cerca en temps real al escriure al camp de ciutat (debounced)
    const cityInput = searchForm.querySelector('[name="ciutat"]');
    if (cityInput && listContainer) {
      cityInput.addEventListener(
        'input',
        debounce(async () => {
          const ciutat = cityInput.value.trim();
          if (ciutat.length < 2) return;

          try {
            const resultats = await cercarAparcaments({ ciutat });
            renderAparcaments(resultats, listContainer);
            attachDetailListeners(listContainer);
          } catch {
            // Silenciar errors de cerca en temps real
          }
        }, 400),
      );
    }
  }
}

/*  HELPERS PRIVATS                                                     */

/**
 * Connecta events de clic als botons "Veure detall" dins d'un contenidor.
 * @param {HTMLElement} container
 */
function attachDetailListeners(container) {
  container.querySelectorAll('.btn-detall').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      // Navegar a la mateixa pàgina amb el query param
      window.location.href = `?aparcament_id=${id}`;
    });
  });
}

/**
 * Escapa caràcters HTML per evitar XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
