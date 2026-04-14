import { initLandingMap } from './landing/map.module.js';
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
    focusParkingById,
    updateOpenPopupsLayout,
    ensureValidViewport,
    defaultCenter,
    defaultZoom,
  } = mapState;

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
