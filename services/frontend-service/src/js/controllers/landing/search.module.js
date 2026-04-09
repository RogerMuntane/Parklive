import { pythonApi } from '../../api.js';

const PAGE_SIZE = 5;
const MAX_RESULTS_FOR_MAP = 1000;

function formatEuroPerHour(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return `${amount.toFixed(2).replace('.', ',')} €/h`;
}

function formatParkingType(value) {
  const typeMap = {
    carrer: 'Carrer',
    cobert: 'Cobert',
    aire_lliure: 'Aire lliure',
    subterrani: 'Subterrani',
    parking_public: 'Públic',
    parking_privat: 'Privat',
  };

  return typeMap[value] || 'No indicat';
}

function formatMaxHeight(value) {
  const height = Number(value);
  if (!Number.isFinite(height) || height <= 0) return 'No indicada';
  return `${height.toFixed(2).replace('.', ',')} m`;
}

function formatAvailabilitySummary(available, total, percent) {
  const availableNum = Number(available);
  const totalNum = Number(total);
  const percentNum = Number(percent);

  if (!Number.isFinite(availableNum) || !Number.isFinite(totalNum) || totalNum <= 0) {
    return 'No disponible';
  }

  if (Number.isFinite(percentNum)) {
    return `${availableNum}/${totalNum} (${Math.round(percentNum)}%)`;
  }

  return `${availableNum}/${totalNum}`;
}

function formatSchedule(open24h, openingTime, closingTime) {
  if (open24h) return '24 h';
  if (!openingTime || !closingTime) return 'No indicat';
  return `${String(openingTime).slice(0, 5)}-${String(closingTime).slice(0, 5)}`;
}

function formatRatingSummary(avgRating, totalRatings) {
  const avg = Number(avgRating);
  const count = Number(totalRatings);

  if (!Number.isFinite(avg) || !Number.isFinite(count) || count <= 0) {
    return 'Sense valoracions';
  }

  return `${avg.toFixed(1).replace('.', ',')} (${count})`;
}

function computeDistanceKm(fromLat, fromLon, toLat, toLon) {
  const earthRadiusKm = 6371;
  const toRadians = (value) => (value * Math.PI) / 180;

  const dLat = toRadians(toLat - fromLat);
  const dLon = toRadians(toLon - fromLon);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function normalizeParking(raw, origin = null) {
  const lat = Number(raw.latitud);
  const lon = Number(raw.longitud);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  const distanceKm = origin
    ? computeDistanceKm(origin.lat, origin.lon, lat, lon)
    : null;

  const status = raw.estat || 'actiu';
  let statusLabel = 'Disponible';
  if (status === 'complet') {
    statusLabel = 'Ocupat';
  } else if (status === 'manteniment') {
    statusLabel = 'Poques places';
  } else if (status === 'inactiu') {
    statusLabel = 'Inactiu';
  }

  let distanceLabel = '—';
  if (distanceKm != null) {
    if (distanceKm < 1) {
      distanceLabel = `${Math.round(distanceKm * 1000)} m`;
    } else {
      distanceLabel = `${distanceKm.toFixed(1).replace('.', ',')} km`;
    }
  }

  return {
    id: String(raw.id),
    name: raw.nom || 'Aparcament',
    address: [raw.adreca, raw.ciutat].filter(Boolean).join(', '),
    coords: [lat, lon],
    priceLabel: formatEuroPerHour(raw.tarifa_hora),
    distanceLabel,
    statusLabel,
    hasEv: Boolean(raw.carrega_electrica),
    typeLabel: formatParkingType(raw.tipus),
    maxHeightLabel: formatMaxHeight(raw.altura_maxima),
    availabilitySummary: formatAvailabilitySummary(
      raw.places_disponibles,
      raw.capacitat_total,
      raw.percentatge_disponibilitat,
    ),
    scheduleLabel: formatSchedule(raw.obert_24h, raw.horari_obertura, raw.horari_tancament),
    ratingSummary: formatRatingSummary(raw.valoracio_mitjana, raw.total_valoracions),
    isAccessible: Boolean(raw.accessibilitat),
    hasCctv: Boolean(raw.videovigilancia),
    raw,
  };
}

function buildSearchParams() {
  const searchTerm = document.getElementById('mapSearchInput')?.value.trim() || '';
  const priceRange = document.getElementById('priceRange')?.value;
  const distanceRange = document.getElementById('distanceRange')?.value;
  const electricCharging = document.getElementById('electricCharging')?.checked;

  const availability = [];
  if (document.getElementById('available')?.checked) availability.push('actiu');
  if (document.getElementById('halfOccupied')?.checked) availability.push('manteniment');
  if (document.getElementById('occupied')?.checked) availability.push('complet');

  const params = {
    limite: MAX_RESULTS_FOR_MAP,
    offset: 0,
  };

  if (searchTerm) {
    params.ciutat = searchTerm;
  }

  const maxPrice = Number(priceRange);
  if (Number.isFinite(maxPrice) && maxPrice > 0) {
    params.tarifa_hora_max = maxPrice;
  }

  const radiusKm = Number(distanceRange);
  if (Number.isFinite(radiusKm) && radiusKm > 0) {
    params.radi_km = radiusKm;
  }

  if (electricCharging) {
    params.carrega_electrica = true;
  }

  if (availability.length > 0) {
    params.estat = availability[0];
  }

  return { params, searchTerm };
}

function escapeHtml(value) {
  if (!value) return '';
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function renderPagination(panel, {
  currentPage,
  totalPages,
  onChangePage,
}) {
  panel.querySelectorAll('[data-role="parking-pagination"]').forEach((node) => node.remove());

  if (totalPages <= 1) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'd-flex align-items-center justify-content-between gap-2 mt-3';
  wrapper.dataset.role = 'parking-pagination';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'btn btn-outline-secondary btn-sm';
  prevBtn.textContent = 'Anterior';
  prevBtn.disabled = currentPage <= 1;

  const pageInfo = document.createElement('span');
  pageInfo.className = 'small text-body-secondary fw-semibold';
  pageInfo.textContent = `Pàgina ${currentPage} de ${totalPages}`;

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'btn btn-outline-secondary btn-sm';
  nextBtn.textContent = 'Següent';
  nextBtn.disabled = currentPage >= totalPages;

  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) onChangePage(currentPage - 1);
  });

  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) onChangePage(currentPage + 1);
  });

  wrapper.append(prevBtn, pageInfo, nextBtn);
  panel.appendChild(wrapper);
}

function renderResults({
  spots,
  total,
  currentPage,
  totalPages,
  onFocusParking,
  onChangePage,
}) {
  const panel = document.querySelector('.parking-results-panel');
  const subtitle = document.querySelector('.parking-results-subtitle');
  if (!panel) return;

  panel.querySelectorAll('.parking-result-card').forEach((card) => card.remove());
  panel.querySelectorAll('[data-role="parking-pagination"]').forEach((node) => node.remove());

  if (subtitle) {
    subtitle.textContent = total === 1 ? '1 aparcament trobat' : `${total} aparcaments trobats`;
  }

  if (spots.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'parking-result-card border rounded-4 p-3 bg-body shadow-sm';
    empty.innerHTML = '<p class="mb-0 text-body-secondary">No s\'han trobat aparcaments.</p>';
    panel.appendChild(empty);
    renderPagination(panel, { currentPage, totalPages, onChangePage });
    return;
  }

  const fragment = document.createDocumentFragment();

  spots.forEach((spot) => {
    const card = document.createElement('article');
    card.className = 'parking-result-card border rounded-4 overflow-hidden bg-body shadow-sm';
    card.setAttribute('aria-label', `Aparcament ${spot.name}`);
    card.innerHTML = `
      <img
        class="parking-result-image d-block w-100 object-fit-cover"
        src="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=900&q=80"
        alt="Foto de l'aparcament ${escapeHtml(spot.name)}"
        loading="lazy"
      />
      <div class="parking-result-content p-2">
        <h3 class="parking-result-name h6 mb-1 fw-bold text-body">${escapeHtml(spot.name)}</h3>
        <p class="parking-result-address mb-1 small text-body-secondary text-truncate">${escapeHtml(spot.address || 'Adreça no disponible')}</p>
        <div class="parking-result-meta row row-cols-2 g-1 mt-1 small text-body" aria-label="Dades resumides del parking">
          <span class="col d-inline-flex align-items-center gap-1"><i class="bi bi-currency-euro"></i>${escapeHtml(spot.priceLabel)}</span>
          <span class="col d-inline-flex align-items-center gap-1"><i class="bi bi-geo-alt"></i>${escapeHtml(spot.distanceLabel)}</span>
          <span class="col d-inline-flex align-items-center gap-1"><i class="bi bi-house-door"></i>${escapeHtml(spot.typeLabel)}</span>
          <span class="col d-inline-flex align-items-center gap-1"><i class="bi bi-grid-3x3-gap"></i>Disp: ${escapeHtml(spot.availabilitySummary)}</span>
          <span class="col d-inline-flex align-items-center gap-1"><i class="bi bi-clock"></i>${escapeHtml(spot.scheduleLabel)}</span>
          <span class="col d-inline-flex align-items-center gap-1"><i class="bi bi-star"></i>${escapeHtml(spot.ratingSummary)}</span>
        </div>
        <div class="d-flex flex-wrap gap-1 mt-1" aria-label="Serveis del parking">
          <span class="badge rounded-pill text-bg-light border fw-normal">Alt: ${escapeHtml(spot.maxHeightLabel)}</span>
          ${spot.hasEv
            ? '<span class="badge rounded-pill text-bg-light border fw-normal">Elèctric</span>'
            : ''}
          ${spot.isAccessible
            ? '<span class="badge rounded-pill text-bg-light border fw-normal">Accessible</span>'
            : ''}
          ${spot.hasCctv
            ? '<span class="badge rounded-pill text-bg-light border fw-normal">CCTV</span>'
            : ''}
        </div>
        <button type="button" class="btn btn-danger btn-sm w-100 mt-2" data-action="open-parking" data-parking-id="${escapeHtml(spot.id)}">
          Veure detall
        </button>
      </div>
    `;

    fragment.appendChild(card);
  });

  panel.appendChild(fragment);

  panel.querySelectorAll('[data-action="open-parking"]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.parkingId;
      onFocusParking(id);
      window.location.href = `/detall_Aparcament.html?id=${encodeURIComponent(id)}`;
    });
  });

  renderPagination(panel, { currentPage, totalPages, onChangePage });
}

async function fetchSearchResults(page = 1) {
  const { params, searchTerm } = buildSearchParams();
  const response = await pythonApi.get('/api/aparcaments/cerca', params);

  let records = Array.isArray(response) ? response : response?.resultats || [];

  if (records.length === 0 && searchTerm) {
    const fallback = await pythonApi.get('/api/aparcaments', {
      limite: MAX_RESULTS_FOR_MAP,
      offset: 0,
    });
    const lowered = searchTerm.toLowerCase();
    records = (Array.isArray(fallback) ? fallback : []).filter((item) => {
      const haystack = `${item.nom || ''} ${item.adreca || ''} ${item.ciutat || ''}`.toLowerCase();
      return haystack.includes(lowered);
    });
  }

  return records;
}

export function initLandingSearch({ setParkingSpots, focusParkingById, closeFilters }) {
  const mapSearchBar = document.getElementById('mapSearchBar');
  const applyFiltersBtn = document.querySelector('#filtresSidepanel .btn-danger.w-50');
  let currentPage = 1;

  const runSearch = async ({ page = 1, resetPage = false } = {}) => {
    const targetPage = resetPage ? 1 : page;

    try {
      const records = await fetchSearchResults();

      const origin = records.length > 0
        ? {
            lat: Number(records[0].latitud),
            lon: Number(records[0].longitud),
          }
        : null;

      const allSpots = records
        .map((item) => normalizeParking(item, origin))
        .filter(Boolean);

      const total = allSpots.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      currentPage = Math.min(Math.max(1, targetPage), totalPages);

      const start = (currentPage - 1) * PAGE_SIZE;
      const paginatedSpots = allSpots.slice(start, start + PAGE_SIZE);

      renderResults({
        spots: paginatedSpots,
        total,
        currentPage,
        totalPages,
        onFocusParking: focusParkingById,
        onChangePage: (nextPage) => {
          runSearch({ page: nextPage });
        },
      });
      setParkingSpots(allSpots);
    } catch (error) {
      console.error('[ParkLive] Error cercant aparcaments:', error);
      renderResults({
        spots: [],
        total: 0,
        currentPage: 1,
        totalPages: 1,
        onFocusParking: focusParkingById,
        onChangePage: () => {},
      });
      setParkingSpots([]);
    }
  };

  if (mapSearchBar) {
    mapSearchBar.addEventListener('submit', async (event) => {
      event.preventDefault();
      await runSearch({ resetPage: true });
    });
  }

  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', async () => {
      await runSearch({ resetPage: true });
      closeFilters(false);
    });
  }

  return {
    runSearch,
  };
}
