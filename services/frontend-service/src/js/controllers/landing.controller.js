/**
 * ParkLive – landing.controller.js
 *
 * Controlador principal de la pàgina d'inici (landing).
 * Orquestra la inicialització del mapa, els filtres de cerca, la
 * geolocalització de l'usuari, la càrrega dinàmica d'aparcaments
 * i les contribucions de disponibilitat de carrer.
 */

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

/**
 * Calcula la distància en kilòmetres entre dos punts geogràfics
 * usant la fórmula de Haversine.
 *
 * @param {{lat: number, lon: number}} from - Punt d'origen.
 * @param {{lat: number, lon: number}} to   - Punt de destí.
 * @returns {number} La distància en kilòmetres.
 */
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

/**
 * Obté el context del viewport actual del mapa (centre i radi).
 * Retorna null si el mapa no és vàlid.
 *
 * @param {L.Map} map - La instància del mapa Leaflet.
 * @returns {{center: {lat: number, lon: number}, radiusKm: number}|null}
 */
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

/**
 * Descarrega les contribucions de disponibilitat de carrer des de l'API
 * i les injecta al mapa via `setStreetReports`.
 *
 * @param {Function} setStreetReports - Funció del mapa per actualitzar les contribucions.
 * @returns {Promise<void>}
 */
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

/**
 * Retorna una Promise que es resol amb la posició GPS actual del navegador.
 * Rebutja si la geolocalització no està disponible o la precisió és molt baixa.
 *
 * @returns {Promise<GeolocationPosition>} La posició del dispositiu.
 */
function getCurrentBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!globalThis.navigator?.geolocation) {
      reject(new Error('El navegador no admet geolocalització.'));
      return;
    }

    // Sempre demanem ubicació fresca. No usem caché de sessionStorage
    // perquè una primera lectura dolenta (GPS fred) pot persistir i
    // mostrar ubicacions incorrectes en recàrregues posteriors.
    globalThis.navigator.geolocation.getCurrentPosition(
      (position) => {
        // Descartem ubicacions amb molt mala precisió (sovint basades en IP quan falla el GPS)
        const accuracy = position?.coords?.accuracy;
        if (accuracy && accuracy > 5000) {
          reject(new Error('La precisió de la ubicació és massa baixa. Comprova el GPS.'));
          return;
        }
        resolve(position);
      },
      reject,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Resol la ubicació actual de l'usuari i actualitza el mapa.
 * Si falla la geolocalització, el mapa es mostra amb el centre per defecte.
 *
 * @param {Object}   options                    - Opcions de configuració.
 * @param {L.Map}    options.map                 - La instància del mapa.
 * @param {Function} options.setUserLocation     - Emmagatzema la ubicació de l'usuari.
 * @param {Function} options.setSearchAnchor     - Fixa el punt d'ancoratge de la cerca.
 * @param {Function} options.runSearch           - Executa la cerca d'aparcaments.
 * @param {Function} options.focusUserLocation   - Centra el mapa en la ubicació de l'usuari.
 * @param {Array}    options.fallbackCenter       - Centre de fallback si falla el GPS.
 * @param {number}   options.fallbackZoom         - Zoom de fallback.
 * @param {number}   [options.viewportRadiusKm]   - Radi del viewport per filtrar per distància.
 * @param {boolean}  [options.silent=false]       - Si true, no mostra alertes d'error.
 * @returns {Promise<boolean|void>} True si l'èxit, void si falla.
 */
async function resolveCurrentLocation({
  map,
  setUserLocation,
  setSearchAnchor,
  runSearch,
  focusUserLocation,
  fallbackCenter,
  fallbackZoom,
  viewportRadiusKm = null,
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

    if (typeof setSearchAnchor === 'function') {
      setSearchAnchor({ lat, lon });
    }

    if (map && typeof map.setView === 'function') {
      try {
        map.setView([lat, lon], GEOLOCATION_ZOOM);
        const center = map.getCenter();
        const zoom = map.getZoom();
      } catch (err) {
        console.error('[ParkLive] Error en map.setView:', err);
      }
    } else {
      console.warn('[ParkLive] Map no existe o no tiene función setView');
    }

    if (typeof focusUserLocation === 'function') {
      focusUserLocation({ zoom: GEOLOCATION_ZOOM });
    }

    // Mostrar aparcamientos en el mapa (con preserveViewport para no hacer fitBounds),
    // pero luego volver a centrar en la ubicación del usuario
    await runSearch({ resetPage: true, viewportRadiusKm, preserveViewport: true, centerOnUserLocation: true });

    // Volver a centrar el mapa en la ubicación del usuario INMEDIATAMENTE después de mostrar los aparcamientos
    if (map && typeof map.setView === 'function') {
      map.setView([lat, lon], GEOLOCATION_ZOOM);
    }

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
      // Mostrar aparcamientos manteniendo el viewport
      await runSearch({ viewportRadiusKm, preserveViewport: true });

      // Volver a centrar el mapa en la ubicación por defecto INMEDIATAMENTE después de mostrar aparcamientos
      if (map && fallbackCenterPoint && typeof map.setView === 'function') {
        map.setView(fallbackCenterPoint, fallbackZoomLevel);
      }
    }
  }
}

/**
 * Intenta la geolocalització automàtica en carregar la pàgina.
 * Si falla, el mapa es centra al viewport per defecte i llança la cerca inicial.
 *
 * @param {Object}   options                 - Opcions de configuració.
 * @param {L.Map}    options.map              - La instància del mapa.
 * @param {Function} options.setUserLocation  - Emmagatzema la ubicació de l'usuari.
 * @param {Function} options.runSearch        - Executa la cerca d'aparcaments.
 * @param {Function} options.focusUserLocation - Centra el mapa en la ubicació de l'usuari.
 * @param {Function} options.setSearchAnchor  - Fixa el punt d'ancoratge de la cerca.
 * @returns {void}
 */
function tryAutoLocateAndSearch({ map, setUserLocation, runSearch, focusUserLocation, setSearchAnchor }) {

  // Calcular el viewport inicial para la primera búsqueda
  const initialViewport = getMapViewportContext(map);
  const initialViewportRadiusKm = initialViewport?.radiusKm || null;

  resolveCurrentLocation({
    map,
    setUserLocation,
    setSearchAnchor,
    runSearch,
    focusUserLocation,
    fallbackCenter: map?.options?.center,
    fallbackZoom: map?.options?.zoom,
    viewportRadiusKm: initialViewportRadiusKm,
    silent: true,
  }).catch(async () => {
  }).catch(async () => {

    // Si falla la geolocalización, fijar el punto de búsqueda al centro del mapa por defecto (Barcelona)
    const mapCenter = map?.getCenter();
    if (mapCenter && typeof setSearchAnchor === 'function') {
      setSearchAnchor({ lat: Number(mapCenter.lat), lon: Number(mapCenter.lng) });
    }

    // Si la geolocalización falla, buscar con viewport radius si está disponible
    // Mantener el viewport sin reajustar bounds
    await runSearch({
      viewportRadiusKm: initialViewportRadiusKm,
      preserveViewport: true,
    });
  });
}

/**
 * Punt d'entrada del controlador de la landing page.
 * Inicialitza el mapa, els filtres, el servei de cerca i
 * la càrrega dinàmica de marcadors en moure o fer zoom al mapa.
 * Executa una sola vegada (protecció contra re-inicialització).
 *
 * @returns {void}
 */
export function initLanding() {
  if (landingInitialized) return;

  // 1. Inicialitzem el component central del mapa amb Leaflet (o similar)
  // Això ens retorna l'estat del mapa i les referències de control
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
    hideParkingMarkerById,
    updateOpenPopupsLayout,
    ensureValidViewport,
    defaultCenter,
    defaultZoom,
  } = mapState;

  setStreetReports([]);
  // 2. Comprovem l'estat inicial del filtre per veure si hem de carregar aparcaments estructurals o alertes de carrer
  const initialCategory = document.querySelector('input[name="parkingCategory"]:checked')?.value;
  if (initialCategory !== 'structure') {
    refreshStreetReportsFromApi(setStreetReports);
  }

  // 3. Configurem el controlador global de filtres de cerca avançada
  const toggleFilters = createFiltersController({ map, updateOpenPopupsLayout });

  globalThis.Filtres = toggleFilters;

  initResultsPanelToggle({ map, updateOpenPopupsLayout });
  initFilterPanelControls();
  setupSearchBar({ closeFilters: toggleFilters });
  setupDateMiniSheet();

  // 4. Inicialitzem el servei de cerques interconnectant els controls i l'autocompletar amb el mapa
  const { runSearch, setUserLocation, setSearchAnchor } = initLandingSearch({
    setParkingSpots,
    focusParkingById,
    hideParkingMarkerById,
    closeFilters: toggleFilters,
    setUserLocationMarker,
    onSearchLocationResolved: ({ lat, lon }) => {
      map.setView([lat, lon], SEARCH_LOCATION_ZOOM);
    },
  });

  // 5. Associem el botó "Localitza'm" per fixar les coordenades geolocalitzades del dispositiu i llançar cerca
  setLocateMeAction(() => {
    resolveCurrentLocation({
      map,
      setUserLocation,
      setSearchAnchor,
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

  let isInitializing = true; // Bandera para evitar scheduleMapDynamicLoad durante inicialización
  tryAutoLocateAndSearch({ map, setUserLocation, runSearch, focusUserLocation, setSearchAnchor });

  // Permitir scheduleMapDynamicLoad después de 3 segundos (tiempo suficiente para la carga inicial)
  globalThis.setTimeout(() => {
    isInitializing = false;
  }, 3000);

  let mapDynamicLoadTimerId = null;
  let mapDynamicRequestId = 0;

  const scheduleMapDynamicLoad = () => {
    // No ejecutar durante la inicialización inicial
    if (isInitializing) {
      return;
    }

    if (map.getZoom() < MAP_DYNAMIC_MIN_ZOOM) {
      if (mapDynamicLoadTimerId) {
        globalThis.clearTimeout(mapDynamicLoadTimerId);
        mapDynamicLoadTimerId = null;
      }

      mapDynamicRequestId += 1;
      setParkingSpots([], { fitBounds: false, openFirstPopup: false });
      setStreetReports([]);
      // Limpiar también el panel de resultados cuando zoom es muy bajo
      runSearch({ forceEmptyResults: true });
      return;
    }

    if (mapDynamicLoadTimerId) {
      globalThis.clearTimeout(mapDynamicLoadTimerId);
    }

    mapDynamicLoadTimerId = globalThis.setTimeout(async () => {
      mapDynamicLoadTimerId = null;
      const viewport = getMapViewportContext(map);
      if (!viewport) {
        return;
      }

      const currentRequestId = ++mapDynamicRequestId;

      // Actualitzar el punt de cerca al centre del viewport actual
      const mapCenter = map.getCenter();
      if (mapCenter && typeof mapCenter.lat === 'number' && typeof mapCenter.lng === 'number') {
        setSearchAnchor({
          lat: Number(mapCenter.lat),
          lon: Number(mapCenter.lng),
        });
      }

      await runSearch({
        preservePage: true,
        forceIgnoreCityFilter: true,
        expandRadiusFromUserLocation: false,
        preserveViewport: true,
        viewportRadiusKm: viewport.radiusKm,
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
