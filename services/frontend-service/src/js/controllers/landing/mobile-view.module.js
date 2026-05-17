/**
 * ParkLive – mobile-view.module.js
 *
 * Mòdul que gestiona el toggle mapa/resultats en dispositius mòbils.
 * Persisteix l'estat del mode compacte a sessionStorage i sincronitza
 * el viewport del mapa Leaflet en canviar entre vistes.
 */

const COMPACT_VIEW_STATE_STORAGE_KEY = 'parklive.mobileMapViewVisible';

/**
 * Llegeix l'estat persistit del mode mapa compacte de sessionStorage.
 *
 * @returns {boolean} True si el mapa estava visible en l'última visita.
 */
function readStoredCompactState() {
  try {
    return globalThis.sessionStorage.getItem(COMPACT_VIEW_STATE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Persisteix l'estat del mode mapa compacte a sessionStorage.
 *
 * @param {boolean} mapVisible - True si el mapa és visible.
 * @returns {void}
 */
function writeStoredCompactState(mapVisible) {
  try {
    globalThis.sessionStorage.setItem(COMPACT_VIEW_STATE_STORAGE_KEY, mapVisible ? '1' : '0');
  } catch {
    // Ignore storage failures (private mode / restricted storage).
  }
}

/**
 * Configura el toggle de vista mapa/resultats per a mòbils.
 * Sincronitza l'estat del mapa Leaflet en canviar de vista i
 * persisteix la preferència de l'usuari entre navegacions.
 *
 * @param {Object}   options                      - Opcions de configuració.
 * @param {L.Map}    options.map                   - La instància del mapa Leaflet.
 * @param {L.FeatureGroup} options.markerGroup     - El grup de marcadors del mapa.
 * @param {Function} options.updateOpenPopupsLayout - Funció per refrescar popups oberts.
 * @param {Function} options.ensureValidViewport   - Funció per validar el viewport.
 * @param {number}   [options.compactBreakpoint=991.98] - Amplada màxima per a la vista mòbil (px).
 * @param {Array}    [options.defaultCenter]        - Coordenades per defecte [lat, lng].
 * @param {number}   [options.defaultZoom=14]       - Zoom per defecte.
 * @returns {void}
 */
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
