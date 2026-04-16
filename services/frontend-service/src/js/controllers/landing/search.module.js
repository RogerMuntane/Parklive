import { pythonApi } from '../../api.js';

const PAGE_SIZE = 5;
const MAX_RESULTS_FOR_MAP = 1000;
const DEFAULT_NEARBY_RADIUS_KM = 5;
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/';
const LOCATION_SUGGESTIONS_LIMIT = 4;
const PARKING_SUGGESTIONS_LIMIT = 4;
const SUGGESTIONS_TOTAL_LIMIT = 8;
const SUGGESTIONS_MIN_QUERY_LENGTH = 2;
const SUGGESTIONS_DEBOUNCE_MS = 320;
const SUGGESTIONS_CACHE_TTL_MS = 45 * 1000;
const PARKING_CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
const LOCATION_EXPANSION_RADII_KM = [5, 15, 40, 120, 300];

let userLocation = null;

function setUserLocation(nextLocation) {
  if (
    nextLocation
    && Number.isFinite(nextLocation.lat)
    && Number.isFinite(nextLocation.lon)
  ) {
    userLocation = {
      lat: Number(nextLocation.lat),
      lon: Number(nextLocation.lon),
    };
    return;
  }

  userLocation = null;
}

function buildLocationLabelFromPhotonProperties(properties = {}) {
  const parts = [
    properties.name,
    properties.city || properties.town || properties.village || properties.county,
    properties.state,
    properties.country,
  ].filter(Boolean);

  return parts.join(', ');
}

function normalizeQuery(value) {
  return String(value || '').trim().toLowerCase();
}

function buildLocationLabelFromNominatim(entry = {}) {
  const displayName = String(entry.display_name || '').trim();
  if (!displayName) return '';

  const chunks = displayName
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3);

  return chunks.join(', ');
}

async function geocodeWithNominatim(query) {
  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('q', query);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'es,en',
    },
  });

  if (!response.ok) {
    return null;
  }

  const candidates = await response.json();
  const first = Array.isArray(candidates) ? candidates[0] : null;
  if (!first) return null;

  const lat = Number(first.lat);
  const lon = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return { lat, lon };
}

async function geocodeWithPhoton(query) {
  const url = new URL(PHOTON_ENDPOINT);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '1');
  url.searchParams.set('lang', 'es');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const first = Array.isArray(payload?.features) ? payload.features[0] : null;
  const coordinates = first?.geometry?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const lon = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return { lat, lon };
}

async function fetchLocationSuggestions(query, signal) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery || trimmedQuery.length < 1) return [];

  const url = new URL(PHOTON_ENDPOINT);
  url.searchParams.set('q', trimmedQuery);
  url.searchParams.set('limit', String(LOCATION_SUGGESTIONS_LIMIT));
  url.searchParams.set('lang', 'es');

  const response = await fetch(url.toString(), {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) return [];

  const payload = await response.json();
  const features = Array.isArray(payload?.features) ? payload.features : [];

  return features
    .map((feature) => {
      const coordinates = feature?.geometry?.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

      const lon = Number(coordinates[0]);
      const lat = Number(coordinates[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

      const label = buildLocationLabelFromPhotonProperties(feature?.properties || {});
      if (!label) return null;

      return { type: 'location', label, lat, lon };
    })
    .filter(Boolean);
}

    async function fetchLocationSuggestionsFromNominatim(query, signal) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery || trimmedQuery.length < 1) return [];

  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', String(LOCATION_SUGGESTIONS_LIMIT));
  url.searchParams.set('q', trimmedQuery);

  const response = await fetch(url.toString(), {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'es,en',
    },
  });

  if (!response.ok) return [];

  const rows = await response.json();
  const items = Array.isArray(rows) ? rows : [];

  return items
    .map((row) => {
      const lat = Number(row?.lat);
      const lon = Number(row?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

      const label = buildLocationLabelFromNominatim(row);
      if (!label) return null;

      return { type: 'location', label, lat, lon };
    })
    .filter(Boolean);
}

function scoreParkingSuggestion(item, loweredQuery) {
  const name = normalizeQuery(item?.nom);
  const address = normalizeQuery(item?.adreca);
  const city = normalizeQuery(item?.ciutat);

  if (!name && !address && !city) return -1;

  if (name.startsWith(loweredQuery)) return 0;
  if (city.startsWith(loweredQuery)) return 1;
  if (name.includes(loweredQuery)) return 2;
  if (address.includes(loweredQuery)) return 3;
  if (city.includes(loweredQuery)) return 4;
  return -1;
}

function buildParkingSuggestionLabel(item) {
  const name = String(item?.nom || 'Aparcament').trim();
  const city = String(item?.ciutat || '').trim();
  if (city) return `${name} (${city})`;
  return name;
}

function buildParkingSuggestions(query, parkingCatalog) {
  const loweredQuery = normalizeQuery(query);
  if (!loweredQuery || loweredQuery.length < SUGGESTIONS_MIN_QUERY_LENGTH) return [];

  return parkingCatalog
    .map((item) => {
      const score = scoreParkingSuggestion(item, loweredQuery);
      if (score < 0) return null;

      return {
        type: 'parking',
        label: buildParkingSuggestionLabel(item),
        parkingId: String(item.id),
        parkingRaw: item,
        score,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.label.localeCompare(b.label, 'es', { sensitivity: 'base' });
    })
    .slice(0, PARKING_SUGGESTIONS_LIMIT);
}

function mergeSuggestions(locationItems, parkingItems) {
  const merged = [];

  if (parkingItems.length) {
    merged.push(...parkingItems);
  }

  if (locationItems.length) {
    merged.push(...locationItems.slice(0, LOCATION_SUGGESTIONS_LIMIT));
  }

  return merged.slice(0, SUGGESTIONS_TOTAL_LIMIT);
}

async function geocodeSearchLocation(query) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return null;

  // Primer intentem una API orientada a llocs (ciutats/països), i si falla fem fallback.
  try {
    const photonLocation = await geocodeWithPhoton(trimmedQuery);
    if (photonLocation) return photonLocation;
  } catch {
    // Ignorem l'error i fem fallback a Nominatim.
  }

  try {
    return await geocodeWithNominatim(trimmedQuery);
  } catch {
    return null;
  }
}

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
    distanceKm,
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

function parsePositiveNumber(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
  return numericValue;
}

function addRadiusParam(params, distanceRange, radiusOverrideKm) {
  const overrideRadius = parsePositiveNumber(radiusOverrideKm);
  if (overrideRadius) {
    params.radi_km = overrideRadius;
    return overrideRadius;
  }

  const selectedRadius = parsePositiveNumber(distanceRange);
  if (selectedRadius) {
    params.radi_km = selectedRadius;
    return selectedRadius;
  }

  return null;
}

function addUserLocationParams(params, selectedRadiusKm) {
  if (!userLocation) return;

  params.latitud = userLocation.lat;
  params.longitud = userLocation.lon;

  // Si tenim ubicació, fem servir un radi per defecte per prioritzar aparcaments propers.
  if (!selectedRadiusKm) {
    params.radi_km = DEFAULT_NEARBY_RADIUS_KM;
  }
}

function buildSearchParams({ ignoreCityFilter = false, radiusOverrideKm = null } = {}) {
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

  if (searchTerm && !ignoreCityFilter) {
    params.ciutat = searchTerm;
  }

  const maxPrice = parsePositiveNumber(priceRange);
  if (maxPrice) {
    params.tarifa_hora_max = maxPrice;
  }

  const selectedRadiusKm = addRadiusParam(params, distanceRange, radiusOverrideKm);
  addUserLocationParams(params, selectedRadiusKm);

  if (electricCharging) {
    params.carrega_electrica = true;
  }

  if (availability.length > 0) {
    params.estat = availability[0];
  }

  return { params, searchTerm };
}

async function fetchRecordsByParams(params) {
  const response = await pythonApi.get('/api/aparcaments/cerca', params);
  return Array.isArray(response) ? response : response?.resultats || [];
}

async function fetchRecordsExpandingRadius(ignoreCityFilter) {
  for (const radiusKm of LOCATION_EXPANSION_RADII_KM) {
    const { params } = buildSearchParams({ ignoreCityFilter, radiusOverrideKm: radiusKm });
    const currentRecords = await fetchRecordsByParams(params);
    if (currentRecords.length > 0) {
      return currentRecords;
    }
  }

  return [];
}

async function fallbackToTextSearch(searchTerm) {
  if (!searchTerm) return [];

  const fallback = await pythonApi.get('/api/aparcaments', {
    limite: MAX_RESULTS_FOR_MAP,
    offset: 0,
  });
  const lowered = searchTerm.toLowerCase();

  return (Array.isArray(fallback) ? fallback : []).filter((item) => {
    const haystack = `${item.nom || ''} ${item.adreca || ''} ${item.ciutat || ''}`.toLowerCase();
    return haystack.includes(lowered);
  });
}

async function fallbackToNearestSearch(origin) {
  if (!origin) return [];

  const fallback = await pythonApi.get('/api/aparcaments', {
    limite: MAX_RESULTS_FOR_MAP,
    offset: 0,
  });

  const items = Array.isArray(fallback) ? fallback : [];
  return items
    .map((item) => {
      const lat = Number(item?.latitud);
      const lon = Number(item?.longitud);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

      const distanceKm = computeDistanceKm(origin.lat, origin.lon, lat, lon);
      return { item, distanceKm };
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 100)
    .map((entry) => entry.item);
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
      globalThis.location.href = `/detall_Aparcament.html?id=${encodeURIComponent(id)}`;
    });
  });

  renderPagination(panel, { currentPage, totalPages, onChangePage });
}

async function fetchSearchResults({ ignoreCityFilter = false, expandLocationRadius = false } = {}) {
  const { searchTerm } = buildSearchParams({ ignoreCityFilter });
  const shouldExpandRadius = expandLocationRadius && Boolean(userLocation);

  let records = shouldExpandRadius
    ? await fetchRecordsExpandingRadius(ignoreCityFilter)
    : await fetchRecordsByParams(buildSearchParams({ ignoreCityFilter }).params);

  if (records.length === 0 && searchTerm) {
    records = await fallbackToTextSearch(searchTerm);
  }

  if (records.length === 0 && shouldExpandRadius) {
    records = await fallbackToNearestSearch(userLocation);
  }

  return records;
}

export function initLandingSearch({
  setParkingSpots,
  focusParkingById,
  closeFilters,
  onSearchLocationResolved = () => {},
}) {
  const mapSearchBar = document.getElementById('mapSearchBar');
  const mapSearchInput = document.getElementById('mapSearchInput');
  const applyFiltersBtn = document.querySelector('#filtresSidepanel .btn-danger.w-50');
  let currentPage = 1;

  let suggestionsDebounceTimerId = null;
  let suggestionsRequestSeq = 0;
  let suggestionsAbortController = null;

  const suggestionsCache = new Map();
  let parkingCatalogCache = {
    items: [],
    expiresAt: 0,
    pendingPromise: null,
  };

  const searchMain = mapSearchInput?.closest('.search-main');
  if (searchMain) {
    searchMain.classList.add('position-relative');
  }

  const suggestionsMenu = document.createElement('div');
  suggestionsMenu.className = 'list-group position-absolute w-100 shadow-sm d-none';
  suggestionsMenu.style.top = 'calc(100% + 0.35rem)';
  suggestionsMenu.style.left = '0';
  suggestionsMenu.style.zIndex = '1100';
  suggestionsMenu.setAttribute('aria-label', 'Suggeriments de cerca');
  if (searchMain) {
    searchMain.appendChild(suggestionsMenu);
  }

  const hideSuggestions = () => {
    suggestionsMenu.classList.add('d-none');
    suggestionsMenu.innerHTML = '';
  };

  const getParkingCatalog = async () => {
    const now = Date.now();
    if (parkingCatalogCache.items.length && parkingCatalogCache.expiresAt > now) {
      return parkingCatalogCache.items;
    }

    if (parkingCatalogCache.pendingPromise) {
      return parkingCatalogCache.pendingPromise;
    }

    parkingCatalogCache.pendingPromise = (async () => {
      try {
        const response = await pythonApi.get('/api/aparcaments', {
          limite: MAX_RESULTS_FOR_MAP,
          offset: 0,
        });
        const items = Array.isArray(response) ? response : [];

        parkingCatalogCache = {
          items,
          expiresAt: Date.now() + PARKING_CATALOG_CACHE_TTL_MS,
          pendingPromise: null,
        };

        return items;
      } catch {
        parkingCatalogCache.pendingPromise = null;
        return [];
      }
    })();

    return parkingCatalogCache.pendingPromise;
  };

  const getCachedSuggestions = (query) => {
    const cached = suggestionsCache.get(normalizeQuery(query));
    if (!cached) return null;
    if (cached.expiresAt < Date.now()) {
      suggestionsCache.delete(normalizeQuery(query));
      return null;
    }

    return cached.items;
  };

  const setCachedSuggestions = (query, items) => {
    suggestionsCache.set(normalizeQuery(query), {
      items,
      expiresAt: Date.now() + SUGGESTIONS_CACHE_TTL_MS,
    });
  };

  const renderSuggestionHeader = (text) => {
    const header = document.createElement('div');
    header.className = 'list-group-item py-1 small text-body-secondary fw-semibold bg-body-tertiary';
    header.textContent = text;
    return header;
  };

  const applyLocationSuggestion = async ({ label, lat, lon }) => {
    if (!mapSearchInput) return;
    mapSearchInput.value = label;
    setUserLocation({ lat, lon });
    onSearchLocationResolved({ lat, lon });
    hideSuggestions();
    await runSearch({
      resetPage: true,
      resolveSearchLocation: false,
      centerOnUserLocation: true,
      forceIgnoreCityFilter: true,
      expandRadiusFromUserLocation: true,
    });
  };

  const applyParkingSuggestion = ({ label, parkingId, parkingRaw }) => {
    if (!mapSearchInput) return;

    mapSearchInput.value = label;
    hideSuggestions();

    const lat = Number(parkingRaw?.latitud);
    const lon = Number(parkingRaw?.longitud);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      setUserLocation({ lat, lon });
      onSearchLocationResolved({ lat, lon });
    }

    const normalizedSpot = normalizeParking(parkingRaw, {
      lat: Number.isFinite(lat) ? lat : 0,
      lon: Number.isFinite(lon) ? lon : 0,
    });

    if (normalizedSpot) {
      renderResults({
        spots: [normalizedSpot],
        total: 1,
        currentPage: 1,
        totalPages: 1,
        onFocusParking: focusParkingById,
        onChangePage: () => {},
      });
      setParkingSpots([normalizedSpot]);
    }

    focusParkingById(parkingId);
  };

  const renderSuggestions = (items) => {
    if (!items.length) {
      hideSuggestions();
      return;
    }

    suggestionsMenu.innerHTML = '';

    const parkingItems = items.filter((item) => item.type === 'parking');
    const locationItems = items.filter((item) => item.type === 'location');

    if (parkingItems.length) {
      suggestionsMenu.appendChild(renderSuggestionHeader('Aparcaments'));
      parkingItems.forEach((item) => {
        const optionBtn = document.createElement('button');
        optionBtn.type = 'button';
        optionBtn.className = 'list-group-item list-group-item-action small d-flex align-items-center gap-2';
        optionBtn.innerHTML = `<i class="bi bi-p-square"></i><span>${escapeHtml(item.label)}</span>`;
        optionBtn.addEventListener('click', () => {
          applyParkingSuggestion(item);
        });
        suggestionsMenu.appendChild(optionBtn);
      });
    }

    if (locationItems.length) {
      suggestionsMenu.appendChild(renderSuggestionHeader('Localitats'));
      locationItems.forEach((item) => {
        const optionBtn = document.createElement('button');
        optionBtn.type = 'button';
        optionBtn.className = 'list-group-item list-group-item-action small d-flex align-items-center gap-2';
        optionBtn.innerHTML = `<i class="bi bi-geo-alt"></i><span>${escapeHtml(item.label)}</span>`;
        optionBtn.addEventListener('click', async () => {
          await applyLocationSuggestion(item);
        });
        suggestionsMenu.appendChild(optionBtn);
      });
    }

    suggestionsMenu.classList.remove('d-none');
  };

  const requestSuggestions = async (query) => {
    const requestId = ++suggestionsRequestSeq;
    const normalizedQuery = normalizeQuery(query);

    const cached = getCachedSuggestions(normalizedQuery);
    if (cached) {
      renderSuggestions(cached);
      return;
    }

    if (suggestionsAbortController) {
      suggestionsAbortController.abort();
    }
    suggestionsAbortController = new AbortController();
    const { signal } = suggestionsAbortController;

    try {
      const [parkingCatalog, locationItems] = await Promise.all([
        getParkingCatalog(),
        (async () => {
          try {
            const firstTry = await fetchLocationSuggestions(normalizedQuery, signal);
            if (firstTry.length > 0) return firstTry;
            return await fetchLocationSuggestionsFromNominatim(normalizedQuery, signal);
          } catch {
            if (signal.aborted) return [];
            return [];
          }
        })(),
      ]);

      const parkingItems = buildParkingSuggestions(normalizedQuery, parkingCatalog);
      const items = mergeSuggestions(locationItems, parkingItems);

      if (requestId !== suggestionsRequestSeq) return;
      if (signal.aborted) return;

      setCachedSuggestions(normalizedQuery, items);
      renderSuggestions(items);
    } catch {
      if (requestId !== suggestionsRequestSeq) return;
      if (signal.aborted) return;
      hideSuggestions();
    }
  };

  const runSearch = async ({
    page = 1,
    resetPage = false,
    resolveSearchLocation = false,
    centerOnUserLocation = false,
    forceIgnoreCityFilter = false,
    expandRadiusFromUserLocation = false,
  } = {}) => {
    const targetPage = resetPage ? 1 : page;
    const searchTerm = document.getElementById('mapSearchInput')?.value.trim() || '';

    let ignoreCityFilter = forceIgnoreCityFilter;
    let locationResolvedFromTerm = false;

    if (resolveSearchLocation && searchTerm) {
      try {
        const resolvedLocation = await geocodeSearchLocation(searchTerm);
        if (resolvedLocation) {
          setUserLocation(resolvedLocation);
          onSearchLocationResolved(resolvedLocation);
          ignoreCityFilter = true;
          locationResolvedFromTerm = true;
        }
      } catch {
        // Si la geocodificació falla, continuem amb cerca textual normal.
      }
    }

    try {
      const shouldExpandByLocation = locationResolvedFromTerm || expandRadiusFromUserLocation;
      const records = await fetchSearchResults({
        ignoreCityFilter,
        expandLocationRadius: shouldExpandByLocation,
      });

      let origin = null;
      if (userLocation) {
        origin = {
          lat: Number(userLocation.lat),
          lon: Number(userLocation.lon),
        };
      } else if (records.length > 0) {
        origin = {
          lat: Number(records[0].latitud),
          lon: Number(records[0].longitud),
        };
      }

      const allSpots = records
        .map((item) => normalizeParking(item, origin))
        .filter(Boolean)
        .sort((a, b) => {
          const hasDistanceA = Number.isFinite(a.distanceKm);
          const hasDistanceB = Number.isFinite(b.distanceKm);

          if (hasDistanceA && hasDistanceB) {
            return a.distanceKm - b.distanceKm;
          }

          if (hasDistanceA) return -1;
          if (hasDistanceB) return 1;
          return 0;
        });

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

      const shouldCenterAfterRender = (centerOnUserLocation || locationResolvedFromTerm) && userLocation;
      if (shouldCenterAfterRender) {
        globalThis.requestAnimationFrame(() => {
          onSearchLocationResolved(userLocation);
        });
      }
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
      hideSuggestions();
      await runSearch({
        resetPage: true,
        resolveSearchLocation: true,
        centerOnUserLocation: true,
      });
    });
  }

  if (mapSearchInput) {
    mapSearchInput.addEventListener('input', () => {
      const query = mapSearchInput.value.trim();

      if (suggestionsDebounceTimerId) {
        globalThis.clearTimeout(suggestionsDebounceTimerId);
      }

      if (query.length < SUGGESTIONS_MIN_QUERY_LENGTH) {
        hideSuggestions();
        return;
      }

      suggestionsDebounceTimerId = globalThis.setTimeout(() => {
        requestSuggestions(query);
      }, SUGGESTIONS_DEBOUNCE_MS);
    });

    mapSearchInput.addEventListener('blur', () => {
      globalThis.setTimeout(() => {
        hideSuggestions();
      }, 120);
    });

    mapSearchInput.addEventListener('focus', () => {
      const query = mapSearchInput.value.trim();
      if (query.length >= SUGGESTIONS_MIN_QUERY_LENGTH) {
        requestSuggestions(query);
      }
    });

    document.addEventListener('click', (event) => {
      if (!searchMain) return;
      if (searchMain.contains(event.target)) return;
      hideSuggestions();
    });
  }

  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', async () => {
      await runSearch({ resetPage: true });
      closeFilters(false);
    });
  }

  return {
    setUserLocation,
    runSearch,
  };
}
