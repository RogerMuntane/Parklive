import { initLandingMap } from './landing/map.module.js';
import { pythonApi } from '../api.js';
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
    const response = await pythonApi.get('/api/reports/street-availability', {
      limit: 500,
    });
    const reports = Array.isArray(response?.reports) ? response.reports : [];
    setStreetReports(reports);
  } catch {
    // Si falla l'API, no actualitzem el mapa.
  }
}

function tryAutoLocateAndSearch({ map, setUserLocation, runSearch }) {
  if (!globalThis.navigator?.geolocation) {
    runSearch();
    return;
  }

  globalThis.navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      const lat = Number(coords?.latitude);
      const lon = Number(coords?.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        await runSearch();
        return;
      }

      setUserLocation({ lat, lon });
      map.setView([lat, lon], GEOLOCATION_ZOOM);
      await runSearch({ resetPage: true });
    },
    async () => {
      await runSearch();
    },
    {
      enableHighAccuracy: false,
      timeout: GEOLOCATION_TIMEOUT_MS,
      maximumAge: 5 * 60 * 1000,
    },
  );
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
    focusParkingById,
    updateOpenPopupsLayout,
    ensureValidViewport,
    defaultCenter,
    defaultZoom,
  } = mapState;

  setStreetReports([]);
  refreshStreetReportsFromApi(setStreetReports);

  const toggleFilters = createFiltersController({ map, updateOpenPopupsLayout });

  globalThis.Filtres = toggleFilters;

  initResultsPanelToggle({ map, updateOpenPopupsLayout });
  initFilterPanelControls();
  setupSearchBar({ closeFilters: toggleFilters });
  setupDateMiniSheet();
  const { runSearch, setUserLocation } = initLandingSearch({
    setParkingSpots,
    focusParkingById,
    closeFilters: toggleFilters,
    onSearchLocationResolved: ({ lat, lon }) => {
      map.setView([lat, lon], SEARCH_LOCATION_ZOOM);
    },
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
  tryAutoLocateAndSearch({ map, setUserLocation, runSearch });

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
      setUserLocation(viewport.center);

      await runSearch({
        resetPage: true,
        forceIgnoreCityFilter: true,
        expandRadiusFromUserLocation: true,
        preserveViewport: true,
      });

      if (currentRequestId !== mapDynamicRequestId) return;
      await refreshStreetReportsFromApi(setStreetReports);
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
