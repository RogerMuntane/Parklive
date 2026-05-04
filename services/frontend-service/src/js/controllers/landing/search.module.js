import { pythonApi } from '../../api.js';
import { isAuthenticated, showBootstrapAlert } from '../../utils.js';
import { PHP_API_URL } from '../../config.js';
import {
  loadFavoriteIds,
  toggleFavoriteParking,
} from '../favorits.service.js';

const PAGE_SIZE = 5;
const MAX_RESULTS_FOR_MAP = 1000;
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
/** Peticions seqüencials (1) per evitar errors de concurrència a la BD (Commands out of sync) */
const AVAIL_CONCURRENCY = 1;

let userLocation = null;
let setUserLocationMarker = () => {};
let setSearchAnchor = () => {};
let searchAnchorLocation = null;

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
    setUserLocationMarker(userLocation);
    // NOTE: No toques searchAnchorLocation aquí. Solo actualiza el marcador del usuari.
    // searchAnchorLocation debería actualizar-se SOLO per moviments de mapa.
    return;
  }

  userLocation = null;
  setUserLocationMarker(null);
  // NOTE: No toques searchAnchorLocation aquí tampoc.
}

function updateSearchAnchor(nextLocation) {
  if (
    nextLocation
    && Number.isFinite(nextLocation.lat)
    && Number.isFinite(nextLocation.lon)
  ) {
    searchAnchorLocation = {
      lat: Number(nextLocation.lat),
      lon: Number(nextLocation.lon),
    };
    return;
  }

  searchAnchorLocation = null;
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

function formatAvailabilitySummary() {
  // No usem les dades de la BD (poden ser obsoletes).
  // Retornem un placeholder que serà omplert per enrichDisponibilitatAsync.
  return '<span class="spinner-border spinner-border-sm text-secondary opacity-50" role="status"></span> <small class="text-muted">Calculant...</small>';
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
    availabilitySummary: formatAvailabilitySummary(),
    scheduleLabel: formatSchedule(raw.obert_24h, raw.horari_obertura, raw.horari_tancament),
    ratingSummary: formatRatingSummary(raw.valoracio_mitjana, raw.total_valoracions),
    isAccessible: Boolean(raw.accessibilitat),
    hasCctv: Boolean(raw.videovigilancia),
    imageUrl: (() => {
      let url = raw.foto_principal || raw.imatge_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=900&q=80';
      if (url && !url.startsWith('http') && !url.startsWith('data:')) {
        if (url.startsWith('/')) {
          url = PHP_API_URL + url;
        } else {
          url = PHP_API_URL + '/uploads/parkings/' + url;
        }
      }
      return url;
    })(),
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

function addUserLocationParams(params, forceSearchAnchor = false) {
  const anchor = forceSearchAnchor ? searchAnchorLocation : (searchAnchorLocation || userLocation);
  if (!anchor) {
    console.warn('[ParkLive] No hay ubicación (searchAnchor o userLocation)');
    return;
  }

  params.latitud = anchor.lat;
  params.longitud = anchor.lon;
}

function buildSearchParams({ ignoreCityFilter = false, radiusOverrideKm = null, forceSearchAnchor = false } = {}) {
  const searchTerm = document.getElementById('mapSearchInput')?.value.trim() || '';
  const priceRange = document.getElementById('priceRange')?.value;
  const distanceRange = document.getElementById('distanceRange')?.value;
  const electricCharging = document.getElementById('electricCharging')?.checked;
  const accessibility = document.getElementById('accessibility')?.checked;
  const videovigilancia = document.getElementById('videovigilancia')?.checked;

  const availability = [];
  if (document.getElementById('available')?.checked) availability.push('disponible');
  if (document.getElementById('occupied')?.checked) availability.push('ocupat');

  const params = {
    limite: MAX_RESULTS_FOR_MAP,
    offset: 0,
  };

  if (searchTerm && !ignoreCityFilter) {
    params.ciutat = searchTerm;
  }

  const maxPrice = parsePositiveNumber(priceRange);
  if (maxPrice) {
    params.tarifa_dia_max = maxPrice;
  }

  addRadiusParam(params, distanceRange, radiusOverrideKm);
  addUserLocationParams(params, forceSearchAnchor);

  if (electricCharging) {
    params.carrega_electrica = true;
  }

  if (accessibility) {
    params.accessibilitat = true;
  }

  if (videovigilancia) {
    params.videovigilancia = true;
  }

  if (availability.length > 0) {
    params.disponibilitat = availability.join(',');
  }

  // Categoria d'aparcament
  const parkingCategory = document.querySelector('input[name="parkingCategory"]:checked')?.value;
  if (parkingCategory === 'structure') {
    params.tipus = 'cobert,aire_lliure,subterrani,parking_public,parking_privat';
  } else if (parkingCategory === 'street') {
    params.tipus = 'carrer';
  }

  // Filtre per tipus de vehicle (altura)
  const activeVehicle = document.querySelector('.vehicle-option.active');
  if (activeVehicle) {
    const vehicleType = activeVehicle.dataset.vehicle;
    const heightMap = {
      turismo: 1.9,
      furgoneta: 2.2,
      autocaravana: 3.6,
      autobus: 5,
      camion7: 3.6,
      moto: 2.2,
      camion6: 2.7,
    };
    if (heightMap[vehicleType]) {
      params.altura_min = heightMap[vehicleType];
    }
  }

  // Filtre per dates
  const entryDate = document.getElementById('entryDate')?.value;
  const entryTime = document.getElementById('entryTime')?.value;
  const exitDate = document.getElementById('exitDate')?.value;
  const exitTime = document.getElementById('exitTime')?.value;

  if (entryDate && entryTime) {
    params.data_entrada = `${entryDate} ${entryTime}:00`;
  }
  if (exitDate && exitTime) {
    params.data_sortida = `${exitDate} ${exitTime}:00`;
  }

  return { params, searchTerm };
}

function isFavoritesOnlyFilterEnabled() {
  return document.getElementById('favoritesOnly')?.checked === true;
}

function resolveSearchOrigin(records) {
  const anchor = searchAnchorLocation || userLocation;
  if (anchor) {
    return {
      lat: Number(anchor.lat),
      lon: Number(anchor.lon),
    };
  }

  if (records.length > 0) {
    return {
      lat: Number(records[0].latitud),
      lon: Number(records[0].longitud),
    };
  }

  return null;
}

function normalizeAndSortSpots(records, origin) {
  return records
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
}

async function resolveFavoritesState(favoritesOnly) {
  const favoritesEnabled = isAuthenticated();
  let favoriteIds = new Set();
  let effectiveFavoritesOnly = favoritesOnly;

  if (favoritesOnly && !favoritesEnabled) {
    const favoritesOnlyInput = document.getElementById('favoritesOnly');
    if (favoritesOnlyInput) favoritesOnlyInput.checked = false;
    showBootstrapAlert('warning', 'Inicia sessio per filtrar només per favorits');
    effectiveFavoritesOnly = false;
  }

  if (favoritesEnabled) {
    try {
      favoriteIds = await loadFavoriteIds();
    } catch {
      favoriteIds = new Set();
    }
  }

  return {
    favoritesEnabled,
    favoriteIds,
    effectiveFavoritesOnly,
  };
}

async function fetchRecordsByParams(params) {
  const parkingCategory = document.querySelector('input[name="parkingCategory"]:checked')?.value;
  if (parkingCategory === 'street') {
    return [];
  }
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

  try {
    const fallback = await pythonApi.get('/api/aparcaments/cerca', {
      limite: MAX_RESULTS_FOR_MAP,
      offset: 0,
    });
    const lowered = searchTerm.toLowerCase();
    const items = Array.isArray(fallback) ? fallback : fallback?.resultats || [];

    return items.filter((item) => {
      const haystack = `${item.nom || ''} ${item.adreca || ''} ${item.ciutat || ''}`.toLowerCase();
      return haystack.includes(lowered);
    });
  } catch {
    return [];
  }
}

async function fallbackToNearestSearch(origin) {
  if (!origin) return [];

  try {
    const fallback = await pythonApi.get('/api/aparcaments/cerca', {
      limite: MAX_RESULTS_FOR_MAP,
      offset: 0,
    });

    const items = Array.isArray(fallback) ? fallback : fallback?.resultats || [];
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
  } catch {
    return [];
  }
}

function escapeHtml(value) {
  if (!value) return '';
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

/* ------------------------------------------------------------------ */
/*  Enriquiment de disponibilitat real per les targetes del mapa        */
/* ------------------------------------------------------------------ */

/**
 * Converteix un Date a cadena "YYYY-MM-DD HH:MM" en hora local.
 * @param {Date} d
 * @returns {string}
 */
function toLocalDateTimeStr(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    ` ${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/**
 * Retorna [dataEntrada, dataSortida] per la consulta de disponibilitat.
 * Usa les dates del cercador si estan seleccionades; sinó ara → ara+2h.
 * @returns {[string, string]}
 */
function getDisponibilitatFranja() {
  const entryDate = document.getElementById('entryDate')?.value;
  const entryTime = document.getElementById('entryTime')?.value;
  const exitDate  = document.getElementById('exitDate')?.value;
  const exitTime  = document.getElementById('exitTime')?.value;

  if (entryDate && entryTime && exitDate && exitTime) {
    return [`${entryDate} ${entryTime}`, `${exitDate} ${exitTime}`];
  }

  const now = new Date();
  const ms30 = 30 * 60 * 1000;
  const roundedIn  = new Date(Math.ceil(now.getTime() / ms30) * ms30);
  const roundedOut = new Date(roundedIn.getTime() + 2 * 60 * 60 * 1000);
  return [toLocalDateTimeStr(roundedIn), toLocalDateTimeStr(roundedOut)];
}

/**
 * Enriqueix en segon pla els textos de disponibilitat de les targetes
 * de resultats amb dades en temps real del backend.
 *
 * Fa crides paral·leles a /disponibilitat, en lots de AVAIL_CONCURRENCY,
 * i actualitza els elements [data-avail-spot-id] al DOM.
 *
 * @param {Array} spots - Spots normalitzats ja renderitzats
 */
async function enrichDisponibilitatAsync(spots) {
  if (!spots || spots.length === 0) return;

  const [dataEntrada, dataSortida] = getDisponibilitatFranja();

  for (let i = 0; i < spots.length; i += AVAIL_CONCURRENCY) {
    const batch = spots.slice(i, i + AVAIL_CONCURRENCY);

    // Execució seqüencial dins del batch per seguretat amb MySQL
    for (const spot of batch) {
      try {
        // Petit retard per no saturar el servidor
        await new Promise(resolve => setTimeout(resolve, 50));

        const params = new URLSearchParams({
          data_entrada: dataEntrada,
          data_sortida: dataSortida,
        });
        const res = await pythonApi.get(
          `/api/aparcaments/${encodeURIComponent(spot.id)}/disponibilitat?${params}`,
        );

        const lliures = res.places_lliures ?? 0;
        const totals  = res.capacitat_total ?? 0;
        const ocupacioPct = totals > 0 ? Math.round(((totals - lliures) / totals) * 100) : 0;

        const resum = totals > 0
          ? `<span class="fw-bold">${lliures}</span>/${totals} <small>(${ocupacioPct}% ple)</small>`
          : 'No disponible';

        const el = document.querySelector(`[data-avail-spot-id="${spot.id}"]`);
        if (el) {
          el.innerHTML = resum;
          if (ocupacioPct >= 90) {
              el.parentElement.classList.add('text-danger');
              el.parentElement.classList.remove('text-body');
          }
        }
      } catch (err) {
        console.warn(`[ParkLive] Error enriquint spot ${spot.id}:`, err);
        const el = document.querySelector(`[data-avail-spot-id="${spot.id}"]`);
        if (el) el.textContent = 'Error';
      }
    }
  }
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
  favoritesEnabled = false,
  favoriteIds = new Set(),
  onToggleFavorite = async () => false,
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
    const spotId = String(spot.id);
    const isSpotFavorite = favoriteIds.has(spotId);
    const favoriteStateClass = isSpotFavorite ? 'is-active' : '';
    const favoriteAriaLabel = isSpotFavorite
      ? 'Eliminar de favorits'
      : 'Afegir a favorits';
    const favoriteIconClass = isSpotFavorite
      ? 'bi-heart-fill'
      : 'bi-heart';

    const card = document.createElement('article');
    card.className = 'parking-result-card border rounded-4 overflow-hidden bg-body shadow-sm';
    card.setAttribute('aria-label', `Aparcament ${spot.name}`);
    card.innerHTML = `
      <img
        class="parking-result-image d-block w-100 object-fit-cover"
        src="${escapeHtml(spot.imageUrl)}"
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
          <span class="col d-inline-flex align-items-center gap-1"><i class="bi bi-car-front"></i><span class="fw-medium">Disp:</span> <span data-avail-spot-id="${escapeHtml(String(spot.id))}">${spot.availabilitySummary}</span></span>
          <span class="col d-inline-flex align-items-center gap-1"><i class="bi bi-clock"></i>${escapeHtml(spot.scheduleLabel)}</span>
          <span class="col d-inline-flex align-items-center gap-1"><i class="bi bi-star"></i>${escapeHtml(spot.ratingSummary)}</span>
        </div>
        <div class="parking-result-tags d-flex flex-wrap gap-1 mt-1" aria-label="Serveis del parking">
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
        <div class="parking-result-actions d-flex align-items-center gap-2 mt-2">
          ${favoritesEnabled ? `
            <button
              type="button"
              class="btn parking-favorite-btn btn-sm flex-shrink-0 ${favoriteStateClass}"
              data-action="toggle-favorite"
              data-parking-id="${escapeHtml(spotId)}"
              aria-label="${favoriteAriaLabel}"
              title="${favoriteAriaLabel}"
            >
              <i class="bi ${favoriteIconClass}"></i>
            </button>
          ` : ''}
          <button type="button" class="btn btn-danger btn-sm w-100 parking-detail-btn" data-action="open-parking" data-parking-id="${escapeHtml(spot.id)}">
            Veure detall
          </button>
        </div>
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

  if (favoritesEnabled) {
    panel.querySelectorAll('[data-action="toggle-favorite"]').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.parkingId;
        button.disabled = true;

        try {
          const nextIsFavorite = await onToggleFavorite(id);
          const icon = button.querySelector('i');
          if (icon) {
            icon.className = `bi ${nextIsFavorite ? 'bi-heart-fill' : 'bi-heart'}`;
          }

          button.classList.toggle('is-active', nextIsFavorite);
          button.setAttribute(
            'aria-label',
            nextIsFavorite ? 'Eliminar de favorits' : 'Afegir a favorits',
          );
          button.setAttribute(
            'title',
            nextIsFavorite ? 'Eliminar de favorits' : 'Afegir a favorits',
          );
        } catch (error) {
          showBootstrapAlert('danger', error?.message || 'No s\'ha pogut actualitzar el favorit');
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  renderPagination(panel, { currentPage, totalPages, onChangePage });
}

async function fetchSearchResults({ ignoreCityFilter = false, expandLocationRadius = false, viewportRadiusKm = null } = {}) {
  const forceSearchAnchor = Boolean(viewportRadiusKm);
  console.log('[ParkLive] fetchSearchResults: viewportRadiusKm=%o, forceSearchAnchor=%o', viewportRadiusKm, forceSearchAnchor);
  const { searchTerm } = buildSearchParams({ ignoreCityFilter, radiusOverrideKm: viewportRadiusKm, forceSearchAnchor });
  const shouldExpandRadius = expandLocationRadius && Boolean(searchAnchorLocation || userLocation);

  let records = shouldExpandRadius
    ? await fetchRecordsExpandingRadius(ignoreCityFilter)
    : await fetchRecordsByParams(buildSearchParams({ ignoreCityFilter, radiusOverrideKm: viewportRadiusKm, forceSearchAnchor }).params);

  if (records.length === 0 && searchTerm) {
    records = await fallbackToTextSearch(searchTerm);
  }

  if (records.length === 0 && shouldExpandRadius) {
    records = await fallbackToNearestSearch(searchAnchorLocation || userLocation);
  }

  return records;
}

export function initLandingSearch({
  setParkingSpots,
  focusParkingById,
  closeFilters,
  onSearchLocationResolved = () => {},
  setUserLocationMarker: updateUserLocationMarker = () => {},
}) {
  setUserLocationMarker = updateUserLocationMarker;
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
        const response = await pythonApi.get('/api/aparcaments/cerca', {
          limite: MAX_RESULTS_FOR_MAP,
          offset: 0,
        });
        const items = Array.isArray(response) ? response : response?.resultats || [];

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
    try {
      if (!mapSearchInput) return;
      mapSearchInput.value = label;
      
      const coords = { lat: Number(lat), lon: Number(lon) };
      
      // Actualitzar EXPLÍCITAMENT el viewport per a la búsqueda (no GPS)
      updateSearchAnchor(coords);
      onSearchLocationResolved(coords);
      hideSuggestions();
      
      await runSearch({
        resetPage: true,
        resolveSearchLocation: false,
        centerOnUserLocation: false, // Ja hem centrat a dalt
        forceIgnoreCityFilter: true,
        expandRadiusFromUserLocation: true,
        preserveViewport: true, // No volem que runSearch torni a moure el mapa
      });
    } catch (err) {
      console.error('[ParkLive] Error aplicant suggeriment:', err);
      hideSuggestions();
    }
  };

  const applyParkingSuggestion = async ({ label, parkingId, parkingRaw }) => {
    if (!mapSearchInput) return;

    mapSearchInput.value = label;
    hideSuggestions();

    const lat = Number(parkingRaw?.latitud);
    const lon = Number(parkingRaw?.longitud);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      // Actualitzar EXPLÍCITAMENT el viewport per a la búsqueda (no GPS)
      updateSearchAnchor({ lat, lon });
      onSearchLocationResolved({ lat, lon });
    }

    const normalizedSpot = normalizeParking(parkingRaw, {
      lat: Number.isFinite(lat) ? lat : 0,
      lon: Number.isFinite(lon) ? lon : 0,
    });

    if (normalizedSpot) {
      const favoritesEnabled = isAuthenticated();
      let favoriteIds = new Set();
      if (favoritesEnabled) {
        try {
          favoriteIds = await loadFavoriteIds();
        } catch {
          favoriteIds = new Set();
        }
      }

      renderResults({
        spots: [normalizedSpot],
        total: 1,
        currentPage: 1,
        totalPages: 1,
        onFocusParking: focusParkingById,
        onChangePage: () => {},
        favoritesEnabled,
        favoriteIds,
        onToggleFavorite: async (id) => {
          const nextIsFavorite = await toggleFavoriteParking(id);
          const msg = nextIsFavorite
            ? 'Aparcament afegit a favorits'
            : 'Aparcament eliminat de favorits';
          showBootstrapAlert('success', msg);
          return nextIsFavorite;
        },
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
        optionBtn.addEventListener('mousedown', async (e) => {
          e.preventDefault(); // Evitar que el blur de l'input s'executi abans
          await applyParkingSuggestion(item);
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
        optionBtn.addEventListener('mousedown', async (e) => {
          e.preventDefault(); // Evitar que el blur de l'input s'executi abans
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
    preserveViewport = false,
    viewportRadiusKm = null,
    forceEmptyResults = false,
    skipMapRender = false,
  } = {}) => {
    if (forceEmptyResults) {
      const favoritesOnly = isFavoritesOnlyFilterEnabled();
      const { favoritesEnabled } = await resolveFavoritesState(favoritesOnly);
      renderResults({
        spots: [],
        total: 0,
        currentPage: 1,
        totalPages: 1,
        onFocusParking: focusParkingById,
        onChangePage: () => {},
        favoritesEnabled,
        favoriteIds: new Set(),
        onToggleFavorite: async () => false,
      });
      setParkingSpots([], { fitBounds: false, openFirstPopup: false });
      return;
    }

    const targetPage = resetPage ? 1 : page;
    const searchTerm = document.getElementById('mapSearchInput')?.value.trim() || '';

    let ignoreCityFilter = forceIgnoreCityFilter;
    let locationResolvedFromTerm = false;

    if (resolveSearchLocation && searchTerm) {
      try {
        const resolvedLocation = await geocodeSearchLocation(searchTerm);
        if (resolvedLocation) {
          // Actualitzar EXPLÍCITAMENT el viewport per a la búsqueda (no GPS)
          updateSearchAnchor(resolvedLocation);
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
        viewportRadiusKm,
      });

      const favoritesOnly = isFavoritesOnlyFilterEnabled();
      const origin = resolveSearchOrigin(records);
      const allSpots = normalizeAndSortSpots(records, origin);

      const {
        favoritesEnabled,
        favoriteIds,
        effectiveFavoritesOnly,
      } = await resolveFavoritesState(favoritesOnly);

      let visibleSpots = effectiveFavoritesOnly
        ? allSpots.filter((spot) => favoriteIds.has(String(spot.id)))
        : allSpots;

      const distanceRangeVal = document.getElementById('distanceRange')?.value;
      const maxDistance = parsePositiveNumber(distanceRangeVal);
      if (maxDistance) {
        visibleSpots = visibleSpots.filter(spot => spot.distanceKm !== null && spot.distanceKm <= maxDistance);
      }

      const total = visibleSpots.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      currentPage = Math.min(Math.max(1, targetPage), totalPages);

      const start = (currentPage - 1) * PAGE_SIZE;
      const paginatedSpots = visibleSpots.slice(start, start + PAGE_SIZE);

      renderResults({
        spots: paginatedSpots,
        total,
        currentPage,
        totalPages,
        onFocusParking: focusParkingById,
        onChangePage: (nextPage) => {
          runSearch({ page: nextPage, preserveViewport: true });
        },
        favoritesEnabled,
        favoriteIds,
        onToggleFavorite: async (parkingId) => {
          const nextIsFavorite = await toggleFavoriteParking(parkingId);
          const msg = nextIsFavorite
            ? 'Aparcament afegit a favorits'
            : 'Aparcament eliminat de favorits';
          showBootstrapAlert('success', msg);

          if (effectiveFavoritesOnly && !nextIsFavorite) {
            await runSearch({ page: currentPage, preserveViewport: true });
          }

          return nextIsFavorite;
        },
      });
      // Enriquiment asíncron: sobreescriu la disponibilitat estàtica de la BD
      // amb el càlcul real per franja horària, sense bloquejar el render inicial.
      enrichDisponibilitatAsync(paginatedSpots);

      setParkingSpots(visibleSpots, {
        fitBounds: !preserveViewport,
        openFirstPopup: !preserveViewport,
      });

      const shouldCenterAfterRender = (centerOnUserLocation || locationResolvedFromTerm) && !preserveViewport;
      if (shouldCenterAfterRender) {
        // Prioritzem el punt on s'ha buscat (searchAnchorLocation) sobre el GPS (userLocation)
        const centerPos = searchAnchorLocation || userLocation;
        if (centerPos) {
          globalThis.requestAnimationFrame(() => {
            onSearchLocationResolved(centerPos);
          });
        }
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
      }, 250); // Un poc més de marge
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
    setSearchAnchor: updateSearchAnchor,
  };
}
