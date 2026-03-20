/**
 * ParkLive – contribucions.controller.js
 * Controlador de contribucions: creació de noves contribucions
 * i historial de contribucions de l'usuari.
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
  getUserId,
} from '../utils.js';

/*  FUNCIONS D'ACCÉS A L'API                                           */

/**
 * Obté l'historial de contribucions de l'usuari actual.
 *
 * @param {Object} [filtres] – Claus opcionals:
 *   tipus, validada (true/false), limit, offset
 * @returns {Promise<{total: number, contribucions: Array}>}
 */
export async function obtenirContribucionsUsuari(filtres = {}) {
  const usuariId = getUserId();
  if (!usuariId) throw new Error('Usuari no autenticat');

  const params = {
    usuari_id: usuariId,
    limit: DEFAULT_LIMIT,
    offset: 0,
    ...filtres,
  };

  try {
    const data = await pythonApi.get('/api/usuari/contribucions', params);

    return {
      total: data?.total ?? 0,
      contribucions: Array.isArray(data?.contribucions)
        ? data.contribucions
        : (Array.isArray(data) ? data : []),
    };
  } catch (err) {
    console.error('[ParkLive] Error obtenint contribucions:', err);
    throw err;
  }
}

/**
 * Crea una nova contribució (report d'estat d'un aparcament).
 *
 * @param {Object} dades – Camps obligatoris: usuari_id, aparcament_id, tipus
 *   Opcionals: estat_reportat, dades, latitud, longitud
 * @returns {Promise<Object>} – Resposta amb message i contribucio
 */
export async function crearContribucio(dades) {
  const required = ['usuari_id', 'aparcament_id', 'tipus'];
  const missing = required.filter((k) => !dades[k] && dades[k] !== 0);

  if (missing.length > 0) {
    throw new Error(`Falten camps obligatoris: ${missing.join(', ')}`);
  }

  try {
    return await pythonApi.post('/api/contribucions', dades);
  } catch (err) {
    console.error('[ParkLive] Error creant contribució:', err);
    throw err;
  }
}

/*  RENDERITZACIÓ                                                       */

/** Tipus de contribució amb icones */
const TIPUS_ICONS = {
  disponibilitat: '🅿️',
  incidencia: '⚠️',
  valoracio: '⭐',
  foto: '📷',
};

/**
 * Renderitza una llista de contribucions dins d'un contenidor.
 *
 * @param {Array}       contribucions
 * @param {HTMLElement}  container
 */
export function renderContribucions(contribucions, container) {
  if (!container) return;

  if (!contribucions || contribucions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No s'han trobat contribucions.</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <ul class="list list-contribucions">
      ${contribucions
        .map(
          (c) => `
        <li class="list-item contribucio-item ${c.validada ? 'is-validated' : ''}">
          <span class="contribucio-icon">${TIPUS_ICONS[c.tipus] || '📝'}</span>
          <div class="contribucio-body">
            <strong class="contribucio-tipus">${escapeHtml(c.tipus || '—')}</strong>
            <span class="contribucio-estat">${escapeHtml(c.estat_reportat || '')}</span>
            ${c.dades?.comentari ? `<p class="contribucio-comentari">${escapeHtml(c.dades.comentari)}</p>` : ''}
            <small class="contribucio-meta">
              Aparcament: ${c.aparcament_id || '—'}
              · ${formatDate(c.data_creacio || c.created_at)}
              ${c.validada ? ' · ✅ Validada' : ''}
            </small>
          </div>
        </li>`,
        )
        .join('')}
    </ul>`;
}

/*  INICIALITZACIÓ DE LA PÀGINA                                        */

/**
 * Punt d'entrada del controlador de contribucions.
 * Detecta elements DOM i vincula events.
 */
export async function initContribucions() {
  const listContainer = document.querySelector('[data-role="contribucions-list"]');
  const createForm = document.querySelector('[data-role="crear-contribucio"]');
  const filterForm = document.querySelector('[data-role="contribucions-filter"]');

  // ── Llistat de contribucions ──────────────────────────────────
  if (listContainer) {
    await carregarContribucions(listContainer);
  }

  // ── Filtre ────────────────────────────────────────────────────
  if (filterForm) {
    filterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAllAlerts();

      const filtres = Object.fromEntries(
        [...new FormData(filterForm).entries()].filter(([, v]) => v !== ''),
      );

      try {
        const { contribucions } = await obtenirContribucionsUsuari(filtres);
        renderContribucions(contribucions, listContainer);
      } catch (err) {
        showAlert('error', 'Error al filtrar les contribucions.');
      }
    });
  }

  // ── Formulari de crear contribució ────────────────────────────
  if (createForm) {
    // Intentar obtenir la geolocalització per omplir latitud/longitud
    prefillGeolocation(createForm);

    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAllAlerts();

      if (!validateForm(createForm)) return;

      const data = serializeForm(createForm);

      // Assegurar que l'usuari_id està present
      data.usuari_id = data.usuari_id || getUserId();

      // Convertir camps numèrics
      if (data.aparcament_id) data.aparcament_id = Number(data.aparcament_id);
      if (data.latitud) data.latitud = Number(data.latitud);
      if (data.longitud) data.longitud = Number(data.longitud);

      // Construir objecte "dades" si hi ha comentari
      if (data.comentari) {
        data.dades = { comentari: data.comentari };
        delete data.comentari;
      }

      setFormLoading(createForm, true);

      try {
        const result = await crearContribucio(data);
        showAlert('success', result.message || 'Contribució reportada amb èxit.');
        createForm.reset();

        // Refrescar llistat si existeix
        if (listContainer) {
          await carregarContribucions(listContainer);
        }
      } catch (err) {
        showAlert('error', err.message || 'Error en reportar la contribució.');
      } finally {
        setFormLoading(createForm, false);
      }
    });
  }
}

/*  HELPERS PRIVATS                                                     */

/**
 * Carrega i renderitza les contribucions de l'usuari actual.
 * @param {HTMLElement} container
 */
async function carregarContribucions(container) {
  try {
    const { contribucions } = await obtenirContribucionsUsuari();
    renderContribucions(contribucions, container);
  } catch (err) {
    showAlert('error', 'No s\'han pogut carregar les contribucions.');
  }
}

/**
 * Intenta obtenir la posició GPS del navegador i omplir
 * els camps latitud/longitud del formulari.
 *
 * @param {HTMLFormElement} form
 */
function prefillGeolocation(form) {
  if (!navigator.geolocation) return;

  const latInput = form.querySelector('[name="latitud"]');
  const lngInput = form.querySelector('[name="longitud"]');

  if (!latInput || !lngInput) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      latInput.value = pos.coords.latitude.toFixed(6);
      lngInput.value = pos.coords.longitude.toFixed(6);
    },
    () => {
      // L'usuari ha denegat la geolocalització – ignorar
    },
  );
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
