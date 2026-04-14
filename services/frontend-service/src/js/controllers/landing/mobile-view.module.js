const COMPACT_VIEW_STATE_STORAGE_KEY = 'parklive.mobileMapViewVisible';

function readStoredCompactState() {
  try {
    return globalThis.sessionStorage.getItem(COMPACT_VIEW_STATE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

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
    if (typeof ensureValidViewport === 'function') {
      ensureValidViewport();
      return;
    }

    if (typeof map.getZoom !== 'function') return;

    // If the map has been rendered while hidden, Leaflet can fallback to world zoom.
    if (map.getZoom() <= map.getMinZoom() + 0.01) {
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
