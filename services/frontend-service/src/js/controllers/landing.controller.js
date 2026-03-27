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
  const { runSearch } = initLandingSearch({
    setParkingSpots,
    focusParkingById,
    closeFilters: toggleFilters,
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
  runSearch();

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      toggleFilters(false);
    }
  });
}
