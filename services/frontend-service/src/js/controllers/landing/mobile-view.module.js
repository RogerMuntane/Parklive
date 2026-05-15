const COMPACT_VIEW_STATE_STORAGE_KEY = 'parklive.mobileMapViewVisible';

/**
 * readStoredCompactState - Funció per a readStoredCompactState.
 *
 * @returns {any} Resultat de la funció.
 */
function readStoredCompactState() {
  try {
    return globalThis.sessionStorage.getItem(COMPACT_VIEW_STATE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * writeStoredCompactState - Funció per a writeStoredCompactState.
 *
 * @param {any} mapVisible - Paràmetre mapVisible
 * @returns {any} Resultat de la funció.
 */
function writeStoredCompactState(mapVisible) {
  try {
    globalThis.sessionStorage.setItem(COMPACT_VIEW_STATE_STORAGE_KEY, mapVisible ? '1' : '0');
  } catch {
    // Ignore storage failures (private mode / restricted storage).
  }
}

export function setupMobileMapViewToggle({
  map,
  markerGroup,
  updateOpenPopupsLayout,
  ensureValidViewport,
  compactBreakpoint = 991.98,
  defaultCenter = [41.3872, 2.1703],
  defaultZoom = 14,
}) {
  const toggleBtn = document.getElementById('mobileMapViewBtn');
  const mapEl = document.getElementById('map');
  const resultsPanel = document.querySelector('.parking-results-panel');
  if (!toggleBtn || !mapEl || !resultsPanel || !map) return;

  const syncButtonUi = () => {
    const mapVisible = document.body.classList.contains('mobile-map-view');
    toggleBtn.textContent = mapVisible ? 'Veure resultats' : 'Veure mapa';
    toggleBtn.setAttribute('aria-pressed', String(mapVisible));
  };

  const restoreViewportIfNeeded = () => {
    if (typeof map.getZoom !== 'function') return;

    // Només forcem l'enquadrament si el mapa té un zoom invàlid (zoom de món).
    // Si ja té un zoom vàlid (per exemple, per geolocalització), no fem res.
    if (map.getZoom() <= map.getMinZoom() + 0.01) {
      if (typeof ensureValidViewport === 'function') {
        ensureValidViewport();
        return;
      }

      if (markerGroup && markerGroup.getLayers().length > 0) {
        map.fitBounds(markerGroup.getBounds().pad(0.22));
      } else {
        map.setView(defaultCenter, defaultZoom);
      }
    }
  };

  const refreshMapViewport = () => {
    globalThis.setTimeout(() => {
      if (typeof map.invalidateSize === 'function') {
        map.invalidateSize();
        restoreViewportIfNeeded();
        updateOpenPopupsLayout();
      }
    }, 280);
  };

  let lastCompactMapVisible = readStoredCompactState();

  const applyCompactViewState = (mapVisible) => {
    document.body.classList.toggle('mobile-map-view', mapVisible);
    lastCompactMapVisible = mapVisible;
    writeStoredCompactState(mapVisible);
    syncButtonUi();

    if (mapVisible) {
      refreshMapViewport();
    }
  };

  let wasCompactViewport = null;

  const syncViewport = () => {
    const isCompactViewport = globalThis.innerWidth <= compactBreakpoint;
    const hasBreakpointChanged =
      wasCompactViewport !== null && isCompactViewport !== wasCompactViewport;

    if (isCompactViewport) {
      if (wasCompactViewport === null || hasBreakpointChanged) {
        document.body.classList.toggle('mobile-map-view', lastCompactMapVisible);

        if (lastCompactMapVisible) {
          refreshMapViewport();
        }
      }
    } else {
      const mapVisibleInCompact = document.body.classList.contains('mobile-map-view');
      lastCompactMapVisible = mapVisibleInCompact;
      writeStoredCompactState(mapVisibleInCompact);
      document.body.classList.remove('mobile-map-view');

      if (wasCompactViewport === null || hasBreakpointChanged) {
        refreshMapViewport();
      }
    }

    syncButtonUi();
    wasCompactViewport = isCompactViewport;
  };

  toggleBtn.addEventListener('click', () => {
    if (globalThis.innerWidth > compactBreakpoint) return;

    const mapVisible = document.body.classList.contains('mobile-map-view');
    applyCompactViewState(!mapVisible);
  });

  globalThis.addEventListener('resize', syncViewport);
  syncViewport();
}
