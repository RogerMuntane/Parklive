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
import {
  getCachedStreetReports,
  getStreetReportsCacheKey,
  mergeStreetReportsIntoCache,
} from './street-reports-cache.service.js';

let landingInitialized = false;

const GEOLOCATION_ZOOM = 15;
const GEOLOCATION_TIMEOUT_MS = 6000;
const SEARCH_LOCATION_ZOOM = 15;

async function refreshStreetReportsFromApi(setStreetReports) {
  try {
    const response = await pythonApi.get('/api/reports/street-availability', {
      limit: 200,
    });
    const reports = Array.isArray(response?.reports) ? response.reports : [];
    const merged = mergeStreetReportsIntoCache(reports);
    setStreetReports(merged);
  } catch {
    // Si falla l'API, mantenim els reports de cache local.
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

  setStreetReports(getCachedStreetReports());
  refreshStreetReportsFromApi(setStreetReports);

  globalThis.addEventListener('storage', (event) => {
    if (event.key !== getStreetReportsCacheKey()) return;
    setStreetReports(getCachedStreetReports());
  });

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

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      toggleFilters(false);
    }
  });
}
