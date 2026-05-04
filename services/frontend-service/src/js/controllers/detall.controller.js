/**
 * ParkLive – detall.controller.js
 *
 * Controlador de la pàgina de detall d'un aparcament.
 * Llegeix el paràmetre `id` de la URL, crida a la Python API
 * i omple tots els slots [data-detall] del DOM.
 */

import { pythonApi } from '../api.js';
import { getQueryParam, isAuthenticated, showBootstrapAlert } from '../utils.js';
import {
  isFavoriteParking,
  toggleFavoriteParking,
} from './favorits.service.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatCurrency(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(2).replace('.', ',')} €`;
}

/** Genera les estrelles HTML (1–5 amb mitges) */
function buildStars(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  const star = (cls) => `<i class="bi ${cls}"></i>`;
  return (
    star('bi-star-fill').repeat(full) +
    (half ? star('bi-star-half') : '') +
    star('bi-star').repeat(empty)
  );
}

/** Formata un TIME de MySQL "HH:MM:SS" → "HH:MM" */
function formatTime(t) {
  if (!t) return null;
  return String(t).slice(0, 5);
}

/** Etiqueta llegible per al tipus d'aparcament */
function tipusLabel(tipus) {
  const map = {
    carrer: 'Carrer',
    cobert: 'Cobert',
    aire_lliure: 'Aire lliure',
    subterrani: 'Subterrani',
    parking_public: 'Pàrquing Públic',
    parking_privat: 'Pàrquing Privat',
  };
  return map[tipus] || esc(tipus || '—');
}

/** Icona Bootstrap per al tipus d'aparcament */
function tipusIcon(tipus) {
  const map = {
    carrer: 'bi-signpost-split',
    cobert: 'bi-building',
    aire_lliure: 'bi-sun',
    subterrani: 'bi-layers-fill',
    parking_public: 'bi-p-square',
    parking_privat: 'bi-lock',
  };
  return map[tipus] || 'bi-p-circle';
}

/** Omple un element [data-detall] amb el valor corresponent */
function fill(key, value) {
  document.querySelectorAll(`[data-detall="${key}"]`).forEach((el) => {
    if (el.tagName === 'IMG') {
      el.src = value;
    } else {
      el.innerHTML = value;
    }
  });
}

/** Mostra/amaga un element per atribut [data-detall-feature] */
function setFeature(key, enabled) {
  document.querySelectorAll(`[data-detall-feature="${key}"]`).forEach((el) => {
    el.style.display = enabled ? '' : 'none';
  });
}

/* ------------------------------------------------------------------ */
/*  Renderització completa                                              */
/* ------------------------------------------------------------------ */

function renderDetall(a) {
  /* ── Hero ─────────────────────────────────────────────────────── */
  fill('nom', esc(a.nom || 'Aparcament'));
  fill('tipus', tipusLabel(a.tipus));

  const estat = (a.estat || 'actiu').toLowerCase();
  const estatLabel = estat === 'actiu'
    ? 'Actiu'
    : estat === 'complet'
      ? 'Complet'
      : estat === 'manteniment'
        ? 'Manteniment'
        : 'Inactiu';

  const estatClass = estat === 'actiu'
    ? 'bg-success'
    : estat === 'complet'
      ? 'bg-danger'
      : 'bg-warning text-dark';

  fill('estat-badge',
    `<span class="badge ${estatClass} parking-status-badge">${estatLabel} <i class="bi bi-patch-check-fill"></i></span>`
  );

  /* Valoració */
  const rating = parseFloat(a.valoracio_mitjana) || 0;
  const numValoracions = a.total_valoracions ?? a.num_valoracions ?? 0;
  fill('stars', `<span class="text-warning fs-4">${buildStars(rating)}</span>`);
  fill('valoracio-text', `(${rating.toFixed(1)}/5 de ${numValoracions} valoracions)`);

  /* Breadcrumb */
  fill('breadcrumb-nom', esc(a.nom || 'Aparcament'));

  /* ── Descripció i ubicació ────────────────────────────────────── */
  const adreca = [a.adreca, a.codi_postal, a.ciutat].filter(Boolean).join(', ');
  fill('adreca', esc(adreca || '—'));
  fill('tipus-text', tipusLabel(a.tipus));
  fill('descripcio', esc(a.descripcio || `Aparcament localitzat a ${adreca}.`));

  /* ── Característiques (icones) ───────────────────────────────── */
  setFeature('accessibilitat', Boolean(a.accessibilitat));
  setFeature('carrega_electrica', Boolean(a.carrega_electrica));
  setFeature('videovigilancia', Boolean(a.videovigilancia));
  // setFeature('obert_24h', Boolean(a.obert_24h));

  /* Altura màxima */
  const altMax = a.altura_maxima != null ? `${Number(a.altura_maxima).toFixed(2)} m` : null;
  if (altMax) {
    fill('altura-max', `Altura Màx: ${altMax}`);
    setFeature('altura_maxima', true);
  } else {
    setFeature('altura_maxima', false);
  }

  /* ── Disponibilitat (sidebar) ────────────────────────────────── */
  const totals = a.capacitat_total ?? 0;
  const lliures = a.places_disponibles ?? 0;
  const ocupats = totals > 0
    ? Math.round(((totals - lliures) / totals) * 100)
    : 0;

  fill('places-lliures', lliures);
  fill('places-totals', `Capacitat: ${totals}`);
  fill('ocupacio-pct', `${ocupats}% ple`);
  fill('actualitzacio', 'En temps real');

  /* Barra de progres */
  const progressBar = document.querySelector('[data-detall="progress-bar"]');
  if (progressBar) {
    progressBar.style.width = `${ocupats}%`;
    progressBar.setAttribute('aria-valuenow', ocupats);
    // Color dinàmic: verd < 50%, taronja < 80%, vermell >= 80%
    progressBar.style.backgroundColor =
      ocupats < 50 ? 'var(--bs-success)'
        : ocupats < 80 ? 'var(--bs-warning)'
          : 'var(--bs-danger)';
  }

  /* ── Tarifes ─────────────────────────────────────────────────── */
  fill('tarifa-hora', formatCurrency(a.tarifa_hora));
  fill('tarifa-dia', formatCurrency(a.tarifa_dia));

  /* ── Detalls del servei ──────────────────────────────────────── */

  /* Horari */
  if (a.obert_24h) {
    fill('horari-label', 'Obert 24h');
    fill('horari-detail', 'Dilluns a Diumenge');
  } else {
    const obertura = formatTime(a.horari_obertura);
    const tancament = formatTime(a.horari_tancament);
    if (obertura && tancament) {
      fill('horari-label', `De ${obertura} a ${tancament}`);
      fill('horari-detail', 'Dilluns a Diumenge');
    } else if (obertura) {
      fill('horari-label', `Obre a les ${obertura}`);
      fill('horari-detail', '');
    } else {
      fill('horari-label', 'Consultar horari');
      fill('horari-detail', '');
    }
  }

  /* Tipus (cobert / aire lliure / subterrani…) */
  fill('tipus-icon', `<i class="bi ${tipusIcon(a.tipus)} me-3 fs-4 text-primary"></i>`);
  fill('tipus-label', tipusLabel(a.tipus));
  fill('tipus-detail', esc(a.tipus === 'subterrani'
    ? 'Aparcament soterrat'
    : a.tipus === 'cobert'
      ? 'Cobert i protegit'
      : a.tipus === 'aire_lliure'
        ? 'A l\'aire lliure'
        : ''));

  /* Altura màxima (detalls servei) */
  if (altMax) {
    fill('altura-servei', altMax);
    setFeature('altura-servei', true);
  } else {
    setFeature('altura-servei', false);
  }

  /* Telèfon */
  fill('telefon', esc(a.operador_telefon || a.telefon || '+34 900 000 000'));

  /* ── Botó reserva ─────────────────────────────────────────────── */
  const reservaBtn = document.querySelector('[data-detall="reserva-btn"]');
  if (reservaBtn) {
    reservaBtn.addEventListener('click', () => {
      window.location.href = `/reserva_Aparcament.html?id=${a.id}`;
    });
  }

  /* ── Mapa Leaflet ─────────────────────────────────────────────── */
  const lat = parseFloat(a.latitud);
  const lon = parseFloat(a.longitud);

  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    if (window._detallMap) {
      window._detallMap.remove();
      window._detallMap = null;
    }

    const mapEl = document.getElementById('map-detail');
    if (mapEl) {
      const map = L.map('map-detail', {
        zoomControl: false,
        attributionControl: false,
      }).setView([lat, lon], 16);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.control
        .attribution({ position: 'bottomleft', prefix: false })
        .addTo(map)
        .addAttribution('© OpenStreetMap contributors, © CARTO');

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          subdomains: 'abcd',
          maxZoom: 20,
        },
      ).addTo(map);

      let marker;
      if (a.tipus === 'aire_lliure') {
        const totalCapacity = Number(a.capacitat_total) || 50;
        const radius = Math.max(35, Math.min(95, Math.round(Math.sqrt(totalCapacity) * 3.2)));
        marker = L.circle([lat, lon], {
          radius: radius,
          color: '#b3261e',
          weight: 2,
          fillColor: '#dc3545',
          fillOpacity: 0.24,
          className: 'parking-open-air-area',
        });
      } else {
        const parkingIcon = L.divIcon({
          className: 'parking-marker-wrapper',
          html: '<span class="parking-marker" aria-hidden="true"></span>',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -14],
        });
        marker = L.marker([lat, lon], { icon: parkingIcon });
      }

      marker.addTo(map)
        .bindPopup(`
          <div class="parking-popup text-center">
            <strong class="d-block mb-1 small fw-semibold">${esc(a.nom)}</strong>
            <p class="mb-0 small text-body-secondary"><i class="bi bi-geo-alt me-1"></i>${esc(adreca)}</p>
          </div>
        `, { closeButton: false, autoPanPadding: [30, 30] });

      window._detallMap = map;
    }
  }
  /* ── Valoracions (Ressenyes) ─────────────────────────────────── */
  renderValoracions(a.valoracions || []);
}

/* ------------------------------------------------------------------ */
/*  Disponibilitat en temps real (franja actual)                        */
/* ------------------------------------------------------------------ */

/**
 * Converteix un Date a cadena "YYYY-MM-DD HH:MM" en hora local.
 * @param {Date} d
 * @returns {string}
 */
function toLocalDateTimeString(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    ` ${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/**
 * Crida l'endpoint de disponibilitat per franja i actualitza els elements
 * [data-detall="places-lliures"], "places-totals", "ocupacio-pct" i la barra.
 *
 * Utilitza la franja horària actual (ara → ara+2h) per defecte.
 *
 * @param {string|number} aparcamentId
 */
async function fetchAndUpdateDisponibilitat(aparcamentId) {
  try {
    const now = new Date();
    // Arrodonir als 30 min superiors per coherència amb la pàgina de reserva
    const ms30 = 30 * 60 * 1000;
    const roundedIn = new Date(Math.ceil(now.getTime() / ms30) * ms30);
    const roundedOut = new Date(roundedIn.getTime() + 2 * 60 * 60 * 1000);

    const params = new URLSearchParams({
      data_entrada: toLocalDateTimeString(roundedIn),
      data_sortida: toLocalDateTimeString(roundedOut),
    });

    const res = await pythonApi.get(
      `/api/aparcaments/${encodeURIComponent(aparcamentId)}/disponibilitat?${params}`,
    );

    const lliures = res.places_lliures ?? 0;
    const totals  = res.capacitat_total ?? 0;
    const ocupats = totals > 0
      ? Math.round(((totals - lliures) / totals) * 100)
      : 0;

    fill('places-lliures', lliures);
    fill('places-totals', `Capacitat: ${totals}`);
    fill('ocupacio-pct', `${ocupats}% ple`);

    const progressBar = document.querySelector('[data-detall="progress-bar"]');
    if (progressBar) {
      progressBar.style.width = `${ocupats}%`;
      progressBar.setAttribute('aria-valuenow', ocupats);
      progressBar.style.backgroundColor =
        ocupats < 50 ? 'var(--bs-success)'
          : ocupats < 80 ? 'var(--bs-warning)'
            : 'var(--bs-danger)';
    }
  } catch (err) {
    // En cas d'error mantenim el valor estàtic carregat inicialment
    console.warn('[ParkLive] No s\'ha pogut actualitzar la disponibilitat real (detall):', err);
  }
}

async function initDetallFavoriteButton(aparcamentId) {
  const favoriteBtn = document.querySelector('[data-detall="favorit-btn"]');
  const favoriteIcon = document.querySelector('[data-detall="favorit-icon"]');
  const favoriteText = document.querySelector('[data-detall="favorit-text"]');

  if (!favoriteBtn || !favoriteIcon || !favoriteText) return;

  if (!isAuthenticated()) {
    favoriteBtn.classList.add('d-none');
    return;
  }

  favoriteBtn.classList.remove('d-none');

  const syncUi = (isFavorite) => {
    favoriteIcon.className = `bi ${isFavorite ? 'bi-heart-fill' : 'bi-heart'} me-1`;
    favoriteText.textContent = isFavorite ? 'Treure favorit' : 'Afegir favorit';
    favoriteBtn.setAttribute(
      'aria-label',
      isFavorite ? 'Eliminar aparcament de favorits' : 'Afegir aparcament a favorits',
    );
  };

  try {
    syncUi(await isFavoriteParking(aparcamentId));
  } catch {
    syncUi(false);
  }

  favoriteBtn.addEventListener('click', async () => {
    favoriteBtn.disabled = true;
    try {
      const nextIsFavorite = await toggleFavoriteParking(aparcamentId);
      syncUi(nextIsFavorite);
      showBootstrapAlert(
        'success',
        nextIsFavorite
          ? 'Aparcament afegit a favorits'
          : 'Aparcament eliminat de favorits',
      );
    } catch (error) {
      showBootstrapAlert('danger', error?.message || 'No s\'ha pogut actualitzar el favorit');
    } finally {
      favoriteBtn.disabled = false;
    }
  });
}

/** Renderitza la llista de ressenyes recents */
function renderValoracions(valoracions) {
  const container = document.querySelector('[data-detall-list="valoracions"]');
  const allReviewsModalContainer = document.getElementById('all-reviews-container');
  const btnVeureTotes = document.querySelector('button[data-bs-target="#allReviewsModal"]');
  
  if (!container) return;

  if (!valoracions || valoracions.length === 0) {
    container.innerHTML = `
      <div class="py-4 text-center text-muted">
        <i class="bi bi-chat-left-text fs-2 d-block mb-2"></i>
        <p>Encara no hi ha valoracions per aquest aparcament.</p>
      </div>
    `;
    if (allReviewsModalContainer) allReviewsModalContainer.innerHTML = container.innerHTML;
    if (btnVeureTotes) btnVeureTotes.style.display = 'none';
    return;
  }

  container.innerHTML = ''; // Netejar
  if (allReviewsModalContainer) allReviewsModalContainer.innerHTML = '';
  
  if (btnVeureTotes) {
    btnVeureTotes.style.display = valoracions.length > 3 ? 'inline-block' : 'none';
  }

  valoracions.forEach((v, index) => {
    const data = v.created_at ? new Date(v.created_at).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long' }) : 'Recent';

    const reviewHtml = `
      <div class="border-bottom mb-4 pb-4">
        <div class="d-flex gap-3 mb-2">
          <div class="text-warning small text-nowrap">
            ${buildStars(v.puntuacio)}
          </div>
          <span class="fw-bold">${esc(v.usuari_nom || 'Usuari')}</span>
          <span class="text-muted small">${data}</span>
        </div>
        <p class="mb-0">${esc(v.comentari || '')}</p>
      </div>
    `;
    
    // Mostrem només les 3 primeres a la vista principal
    if (index < 3) {
      container.insertAdjacentHTML('beforeend', reviewHtml);
    }
    
    // Mostrem totes al modal
    if (allReviewsModalContainer) {
      allReviewsModalContainer.insertAdjacentHTML('beforeend', reviewHtml);
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Estat de càrrega / error                                            */
/* ------------------------------------------------------------------ */

function showSkeleton() {
  document.querySelector('[data-detall-state="loading"]').style.display = '';
  document.querySelector('[data-detall-state="content"]').style.display = 'none';
  document.querySelector('[data-detall-state="error"]').style.display = 'none';
}

function showContent() {
  document.querySelector('[data-detall-state="loading"]').style.display = 'none';
  document.querySelector('[data-detall-state="content"]').style.display = '';
}

function showError(msg = "No s'ha pogut carregar l'aparcament.") {
  document.querySelector('[data-detall-state="loading"]').style.display = 'none';
  document.querySelector('[data-detall-state="content"]').style.display = 'none';
  const errorEl = document.querySelector('[data-detall-state="error"]');
  errorEl.style.display = '';
  const msgEl = errorEl.querySelector('[data-detall-error-msg]');
  if (msgEl) msgEl.textContent = msg;
}

/* ------------------------------------------------------------------ */
/*  Gestió del Formulari de Valoració                                   */
/* ------------------------------------------------------------------ */

function initReviewForm(aparcamentId, valoracions = []) {
  const section = document.getElementById('add-review-section');
  const loginSection = document.getElementById('login-to-review');
  if (!section || !loginSection) return;

  if (!isAuthenticated()) {
    section.style.display = 'none';
    loginSection.style.display = 'block';
    return;
  }

  // Comprovar si l'usuari ja ha valorat (per activar mode edició)
  const currentUserId = sessionStorage.getItem('parklive_user_id');
  const existingReview = valoracions.find(v => String(v.usuari_id) === String(currentUserId));
  
  let isEditMode = false;
  let editValoracioId = null;

  if (existingReview) {
    isEditMode = true;
    editValoracioId = existingReview.id;
    // Canviar el títol del botó
    const btn = document.getElementById('btn-submit-review');
    if (btn) btn.textContent = 'Actualitzar valoració';
  }

  section.style.display = 'block';
  loginSection.style.display = 'none';

  const stars = document.querySelectorAll('#form-stars i');
  const ratingInput = document.getElementById('rating-input');
  const form = document.getElementById('review-form');

  // Pre-omplir dades si està en mode edició
  if (isEditMode) {
    ratingInput.value = existingReview.puntuacio;
    document.getElementById('review-comment').value = existingReview.comentari || '';
    updateStarsUI(stars, existingReview.puntuacio);
  } else {
    ratingInput.value = 0;
    document.getElementById('review-comment').value = '';
    updateStarsUI(stars, 0);
  }

  // Gestió de les estrelles (hover i clic)
  stars.forEach((star) => {
    star.addEventListener('mouseover', () => {
      const val = parseInt(star.dataset.value);
      updateStarsUI(stars, val);
    });

    star.addEventListener('mouseout', () => {
      const currentVal = parseInt(ratingInput.value);
      updateStarsUI(stars, currentVal);
    });

    star.addEventListener('click', () => {
      const val = parseInt(star.dataset.value);
      ratingInput.value = val;
      updateStarsUI(stars, val);
    });
  });

  function updateStarsUI(starNodes, value) {
    starNodes.forEach((s) => {
      const sVal = parseInt(s.dataset.value);
      if (sVal <= value) {
        s.classList.replace('bi-star', 'bi-star-fill');
      } else {
        s.classList.replace('bi-star-fill', 'bi-star');
      }
    });
  }

  // Enviament del formulari
  form.onsubmit = async (e) => {
    e.preventDefault();
    const puntuacio = parseInt(ratingInput.value);
    const comentari = document.getElementById('review-comment').value.trim();

    if (puntuacio === 0) {
      showBootstrapAlert('danger', 'Si us plau, selecciona una puntuació.');
      return;
    }

    const btn = document.getElementById('btn-submit-review');
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> ${isEditMode ? 'ACTUALITZANT...' : 'PUBLICANT...'}`;

    try {
      if (isEditMode) {
        await pythonApi.put(`/api/aparcaments/${aparcamentId}/valoracions/${editValoracioId}`, {
          puntuacio,
          comentari
        });
        showBootstrapAlert('success', 'Valoració actualitzada correctament!');
      } else {
        await pythonApi.post(`/api/aparcaments/${aparcamentId}/valoracions`, {
          puntuacio,
          comentari
        });
        showBootstrapAlert('success', 'Ressenya publicada correctament. Has guanyat 10 punts! Gràcies per la teva opinió.');

        // Actualitzar els punts localment a la sessió
        try {
          const raw = sessionStorage.getItem('parklive_user_data');
          if (raw) {
            const userData = JSON.parse(raw);
            userData.punts_gamificacio = (userData.punts_gamificacio || 0) + 10;
            sessionStorage.setItem('parklive_user_data', JSON.stringify(userData));
          }
        } catch(e) {
          console.warn('[ParkLive] No s\'han pogut actualitzar els punts locals', e);
        }
      }

      form.reset();
      ratingInput.value = 0;
      updateStarsUI(stars, 0);
      
      // Recarregar dades de l'aparcament per actualitzar la llista de ressenyes i la mitjana
      const updatedAparcament = await pythonApi.get(`/api/aparcaments/${encodeURIComponent(aparcamentId)}`);
      renderDetall(updatedAparcament);
      initReviewForm(aparcamentId, updatedAparcament.valoracions || []);
    } catch (err) {
      console.error('[ParkLive] Error processant ressenya:', err);
      showBootstrapAlert('danger', err.message || 'No s\'ha pogut processar la ressenya.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  };
}

/* ------------------------------------------------------------------ */
/*  Inicialització pública                                              */
/* ------------------------------------------------------------------ */

export async function initDetallAparcament() {
  const id = getQueryParam('id');

  if (!id) {
    showError("No s'ha especificat cap aparcament. Torna a la pàgina anterior.");
    return;
  }

  showSkeleton();

  try {
    const aparcament = await pythonApi.get(`/api/aparcaments/${encodeURIComponent(id)}`);
    renderDetall(aparcament);
    // Sobreescriu les places lliures estàtiques de la BD amb el càlcul
    // real per franja horària (ara → ara+2h), igual que la pàgina de reserva.
    fetchAndUpdateDisponibilitat(aparcament.id || id);
    await initDetallFavoriteButton(aparcament.id || id);
    initReviewForm(aparcament.id || id, aparcament.valoracions || []);
    showContent();


    if (window._detallMap) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          window._detallMap.invalidateSize();
        });
      });
    }

  } catch (err) {
    console.error('[ParkLive] Error carregant detall aparcament:', err);
    showError(err.message || "Error de connexió amb el servidor.");
  }
}
