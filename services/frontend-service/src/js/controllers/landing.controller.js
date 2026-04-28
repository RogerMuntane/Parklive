import { initLandingMap } from './landing/map.module.js';
import { pythonApi } from '../api.js';
import { showBootstrapAlert } from '../utils.js';
import { initResultsPanelToggle } from './landing/results-panel.module.js';
import {
  createFiltersController,
  initFilterPanelControls,
  setupSearchBar,
} from './landing/filters.module.js';
import { setupDateMiniSheet } from './landing/date-sheet.module.js';
import { setupMobileMapViewToggle } from './landing/mobile-view.module.js';
import { initLandingSearch } from './landing/search.module.js';

let landingInitialized = false;

const GEOLOCATION_ZOOM = 15;
const GEOLOCATION_TIMEOUT_MS = 6000;
const SEARCH_LOCATION_ZOOM = 15;
const MAP_DYNAMIC_LOAD_DEBOUNCE_MS = 380;
const MAP_DYNAMIC_MIN_ZOOM = 12;

function computeDistanceKm(from, to) {
  const earthRadiusKm = 6371;
  const toRad = (value) => (value * Math.PI) / 180;

  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);

  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function getMapViewportContext(map) {
  if (!map || typeof map.getCenter !== 'function' || typeof map.getBounds !== 'function') {
    return null;
  }

  const center = map.getCenter();
  const bounds = map.getBounds();
  if (!center || !bounds) return null;

  const northEast = bounds.getNorthEast();
  const centerPoint = { lat: Number(center.lat), lon: Number(center.lng) };
  const northEastPoint = { lat: Number(northEast.lat), lon: Number(northEast.lng) };

  const radiusKm = computeDistanceKm(centerPoint, northEastPoint);
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) return null;

  return {
    center: centerPoint,
    radiusKm: Math.max(0.3, Math.min(radiusKm, 50)),
  };
}

async function refreshStreetReportsFromApi(setStreetReports) {
  try {
    const response = await pythonApi.get('/api/reports/disponibilitat', {
      limit: 500,
    });
    const reports = Array.isArray(response?.reports) ? response.reports : [];
    setStreetReports(reports);
  } catch {
    // Si falla l'API, no actualitzem el mapa.
  }
}

function getCurrentBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!globalThis.navigator?.geolocation) {
      reject(new Error('El navegador no admet geolocalització.'));
      return;
    }

    globalThis.navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
}

async function resolveCurrentLocation({
  map,
  setUserLocation,
  runSearch,
  focusUserLocation,
  fallbackCenter,
  fallbackZoom,
  silent = false,
} = {}) {
  try {
    const position = await getCurrentBrowserLocation();
    const lat = Number(position?.coords?.latitude);
    const lon = Number(position?.coords?.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new TypeError('No s\'ha pogut determinar la teva ubicació actual.');
    }

    setUserLocation({ lat, lon });
    if (map && typeof map.setView === 'function') {
      map.setView([lat, lon], GEOLOCATION_ZOOM);
    }

    if (typeof focusUserLocation === 'function') {
      focusUserLocation({ zoom: GEOLOCATION_ZOOM });
    }

    await runSearch({ resetPage: true });
    return true;
  } catch (error) {
    const fallbackCenterPoint = Array.isArray(fallbackCenter) && fallbackCenter.length >= 2
      ? fallbackCenter
      : null;
    const fallbackZoomLevel = Number.isFinite(fallbackZoom) ? fallbackZoom : 14;

    if (map && fallbackCenterPoint && typeof map.setView === 'function') {
      map.setView(fallbackCenterPoint, fallbackZoomLevel);
    }

    if (!silent) {
      showBootstrapAlert(
        'warning',
        `${error?.message || 'No s\'ha pogut obtenir la teva ubicació.'} T\'hem mostrat el mapa per defecte.`,
      );
    }

    if (typeof runSearch === 'function') {
      await runSearch();
    }

    return false;
  }
}

function tryAutoLocateAndSearch({ map, setUserLocation, runSearch, focusUserLocation }) {
  resolveCurrentLocation({
    map,
    setUserLocation,
    runSearch,
    focusUserLocation,
    fallbackCenter: map?.options?.center,
    fallbackZoom: map?.options?.zoom,
    silent: true,
  }).catch(async () => {
    await runSearch();
  });
}

export function initLanding() {
  if (landingInitialized) return;

  const mapState = initLandingMap();
  if (!mapState) return;

  landingInitialized = true;

  const {
    map,
    markerGroup,
    setParkingSpots,
    setStreetReports,
    setUserLocationMarker,
    focusUserLocation,
    setLocateMeAction,
    focusParkingById,
    updateOpenPopupsLayout,
    ensureValidViewport,
    defaultCenter,
    defaultZoom,
  } = mapState;

  setStreetReports([]);
  const initialCategory = document.querySelector('input[name="parkingCategory"]:checked')?.value;
  if (initialCategory !== 'structure') {
    refreshStreetReportsFromApi(setStreetReports);
  }

  const toggleFilters = createFiltersController({ map, updateOpenPopupsLayout });

  globalThis.Filtres = toggleFilters;

  initResultsPanelToggle({ map, updateOpenPopupsLayout });
  initFilterPanelControls();
  setupSearchBar({ closeFilters: toggleFilters });
  setupDateMiniSheet();
  const { runSearch: originalRunSearch, setUserLocation } = initLandingSearch({
    setParkingSpots,
    focusParkingById,
    closeFilters: toggleFilters,
    setUserLocationMarker,
    onSearchLocationResolved: ({ lat, lon }) => {
      map.setView([lat, lon], SEARCH_LOCATION_ZOOM);
    },
  });

  setLocateMeAction(() => {
    resolveCurrentLocation({
      map,
      setUserLocation,
      runSearch,
      focusUserLocation,
      fallbackCenter: defaultCenter,
      fallbackZoom: defaultZoom,
      silent: false,
    });
  });
  setupMobileMapViewToggle({
    map,
    markerGroup,
    updateOpenPopupsLayout,
    ensureValidViewport,
    defaultCenter,
    defaultZoom,
  });

  toggleFilters(false);
  tryAutoLocateAndSearch({ map, setUserLocation, runSearch, focusUserLocation });

  let mapDynamicLoadTimerId = null;
  let mapDynamicRequestId = 0;

  const scheduleMapDynamicLoad = () => {
    if (map.getZoom() < MAP_DYNAMIC_MIN_ZOOM) {
      if (mapDynamicLoadTimerId) {
        globalThis.clearTimeout(mapDynamicLoadTimerId);
        mapDynamicLoadTimerId = null;
      }

      mapDynamicRequestId += 1;
      setParkingSpots([], { fitBounds: false, openFirstPopup: false });
      setStreetReports([]);
      return;
    }

    if (mapDynamicLoadTimerId) {
      globalThis.clearTimeout(mapDynamicLoadTimerId);
    }

    mapDynamicLoadTimerId = globalThis.setTimeout(async () => {
      mapDynamicLoadTimerId = null;
      const viewport = getMapViewportContext(map);
      if (!viewport) return;

      const currentRequestId = ++mapDynamicRequestId;

      await runSearch({
        resetPage: true,
        forceIgnoreCityFilter: true,
        expandRadiusFromUserLocation: true,
        preserveViewport: true,
      });

      if (currentRequestId !== mapDynamicRequestId) return;

      const parkingCategory = document.querySelector('input[name="parkingCategory"]:checked')?.value;
      if (parkingCategory === 'structure') {
        setStreetReports([]);
      } else {
        await refreshStreetReportsFromApi(setStreetReports);
      }
    }, MAP_DYNAMIC_LOAD_DEBOUNCE_MS);
  };

  map.on('zoomend', scheduleMapDynamicLoad);
  map.on('moveend', scheduleMapDynamicLoad);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      toggleFilters(false);
    }
  });
}
