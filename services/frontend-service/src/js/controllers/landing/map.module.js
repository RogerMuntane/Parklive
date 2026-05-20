/**
 * ParkLive – map.module.js
 *
 * Mòdul encarregat d'inicialitzar i controlar el mapa Leaflet
 * de la pàgina principal (landing). Gestó: marcadors d'aparcaments,
 * contribucions de carrer, ubicació de l'usuari i controls de navigació.
 */

const DEFAULT_CENTER = [41.3872, 2.1703];
const DEFAULT_ZOOM = 14;
const MIN_ZOOM = 4;
const OPEN_AIR_BASE_RADIUS_METERS = 45;
const REPORT_DISPONIBILITAT_MARKER_RADIUS = 7;

/**
 * Escapa un valor per evitar XSS en els popups del mapa.
 *
 * @param {string} value - La cadena a escapar.
 * @returns {string} La cadena escapada.
 */
function escapeHtml(value) {
  if (!value) return '';
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

/**
 * Comprova si un punt d'aparcament és del tipus aire lliure.
 *
 * @param {Object} spot - L'objecte del punt d'aparcament.
 * @returns {boolean} True si el tipus és 'aire_lliure'.
 */
function isOpenAirParking(spot) {
  return spot?.raw?.tipus === 'aire_lliure';
}

/**
 * Calcula el radi del cercle SVG per a aparcaments d'aire lliure
 * en funció de la capacitat total.
 *
 * @param {Object} spot - L'objecte del punt d'aparcament.
 * @returns {number} El radi en metres per a Leaflet (mínim 35, màxim 95).
 */
function computeOpenAirRadius(spot) {
  const totalCapacity = Number(spot?.raw?.capacitat_total);
  if (!Number.isFinite(totalCapacity) || totalCapacity <= 0) {
    return OPEN_AIR_BASE_RADIUS_METERS;
  }

  return Math.max(35, Math.min(95, Math.round(Math.sqrt(totalCapacity) * 3.2)));
}

/**
 * Normalitza un objecte {lat, lon} a un LatLng de Leaflet.
 * Retorna null si les coordenades no són vàlides.
 *
 * @param {Object} leaflet   - La instància global de Leaflet (L).
 * @param {Object} location  - Objecte amb propietats `lat` i `lon`.
 * @returns {L.LatLng|null}  La instància LatLng o null si invàlid.
 */
function normalizeLatLng(leaflet, location) {
  const lat = Number(location?.lat);
  const lon = Number(location?.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return leaflet.latLng(lat, lon);
}

/**
 * Inicialitza el mapa Leaflet de la landing page.
 * Configura les capes de tiles (CartoDB Voyager), els controls de zoom,
 * escala i localització, i retorna un objecte de control amb funcions
 * per gestionar marcadors, contribucions i la ubicació de l'usuari.
 *
 * @returns {Object|null} Objecte de control del mapa, o null si no es pot inicialitzar.
 * @returns {L.Map}      .map              - La instància del mapa Leaflet.
 * @returns {L.FeatureGroup} .markerGroup  - El grup de marcadors d'aparcaments.
 * @returns {Function}   .setParkingSpots  - Actualitza els marcadors del mapa.
 * @returns {Function}   .setStreetReports - Actualitza les contribucions de carrer.
 * @returns {Function}   .setUserLocationMarker - Posa/actualitza el marcador d'ubicació.
 * @returns {Function}   .focusUserLocation - Centra el mapa a la ubicació de l'usuari.
 * @returns {Function}   .setLocateMeAction - Assigna el callback del botó "Localitza'm".
 * @returns {Function}   .focusParkingById  - Centra el mapa i obre el popup d'un aparcament.
 * @returns {Function}   .hideParkingMarkerById - Amaga un marcador per ID.
 * @returns {Function}   .updateOpenPopupsLayout - Actualitza els popups oberts.
 * @returns {Function}   .fitToParkingSpots - Enquadra el mapa als marcadors actuals.
 * @returns {Function}   .ensureValidViewport - Valida i corregeix el viewport.
 * @returns {Array}      .defaultCenter     - Coordenades per defecte [lat, lng].
 * @returns {number}     .defaultZoom       - Zoom per defecte.
 */
export function initLandingMap() {
  const mapElement = document.getElementById('map');
  const leaflet = globalThis.L;

  if (!mapElement || !leaflet) return null;

  const map = leaflet
    .map('map', {
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      minZoom: MIN_ZOOM,
      zoomSnap: 0.25,
      zoomDelta: 0.25,
      wheelPxPerZoomLevel: 90,
      wheelDebounceTime: 30,
      worldCopyJump: true,
    })
    .setView(DEFAULT_CENTER, DEFAULT_ZOOM);

  globalThis.map = map;

  // Afegim els controls en l'ordre que quedi l'escala a sota de tot
  leaflet.control.scale({ imperial: false, position: 'bottomright' }).addTo(map);
  leaflet.control.zoom({ position: 'bottomright' }).addTo(map);

  let locateMeHandler = null;
  let userLocationMarker = null;

  const locateControl = leaflet.control({ position: 'bottomright' });
  locateControl.onAdd = () => {
    const container = leaflet.DomUtil.create('div', 'leaflet-bar map-locate-control');
    const button = leaflet.DomUtil.create('button', 'map-locate-control__button', container);

    button.type = 'button';
    button.setAttribute('aria-label', 'Anar a la meva ubicació');
    button.setAttribute('title', 'Anar a la meva ubicació');
    button.innerHTML = '<i class="bi bi-crosshair"></i>';

    leaflet.DomEvent.disableClickPropagation(container);
    leaflet.DomEvent.disableScrollPropagation(container);

    button.addEventListener('click', () => {
      if (typeof locateMeHandler === 'function') {
        locateMeHandler();
      }
    });

    return container;
  };
  locateControl.addTo(map);

  leaflet.control
    .attribution({ position: 'bottomleft', prefix: false })
    .addTo(map)
    .addAttribution('© OpenStreetMap contributors, © CARTO');

  leaflet
    .tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        subdomains: 'abcd',
        minZoom: MIN_ZOOM,
        maxZoom: 20,
        keepBuffer: 8,
        updateWhenZooming: true,
        updateInterval: 100,
      },
    )
    .addTo(map);

  const parkingIcon = leaflet.divIcon({
    className: 'parking-marker-wrapper',
    html: '<span class="parking-marker" aria-hidden="true"></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });

  const userLocationIcon = leaflet.divIcon({
    className: 'user-location-marker-wrapper',
    html: `
      <span class="user-location-marker" aria-hidden="true">
        <svg viewBox="0 0 24 24" class="user-location-marker__icon" role="img" focusable="false">
          <path d="M12 2.5c-3.58 0-6.5 2.92-6.5 6.5 0 4.64 6.5 12.5 6.5 12.5s6.5-7.86 6.5-12.5c0-3.58-2.92-6.5-6.5-6.5Zm0 9.2a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4Z" />
        </svg>
      </span>
    `,
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -30],
  });

  const parkingMarkers = new Map();
  const markerGroup = leaflet.featureGroup().addTo(map);
  const reportDisponibilitatLayer = leaflet.layerGroup().addTo(map);
  const userLocationLayer = leaflet.layerGroup().addTo(map);

  const updateMarkerGroup = () => {
    markerGroup.clearLayers();
    parkingMarkers.forEach((marker) => {
      markerGroup.addLayer(marker);
    });
  };

  const renderStreetReportPopup = (report) => {
    const statusLabel = report.status === 'occupied' ? 'Ocupada' : 'Disponible';
    const createdAtDate = Date.parse(report.created_at);
    const createdAtLabel = Number.isFinite(createdAtDate)
      ? new Date(createdAtDate).toLocaleString('ca-ES')
      : 'Ara mateix';
    const comment = String(report.comment || '').trim();

    return `
      <div class="parking-popup">
        <strong class="d-block mb-1 small fw-semibold">Contribució ciutadana</strong>
        <p class="mb-1 small text-body-secondary">Estat reportat: ${escapeHtml(statusLabel)}</p>
        ${comment ? `<p class="mb-1 small text-body">${escapeHtml(comment)}</p>` : ''}
        <span class="small text-body-secondary">${escapeHtml(createdAtLabel)}</span>
      </div>
    `;
  };

  const setStreetReports = (reports = []) => {
    reportDisponibilitatLayer.clearLayers();
    const usedCoords = new Set();

    reports.forEach((report) => {
      let lat = Number(report?.latitud);
      let lon = Number(report?.longitud);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

      // Jitter determinista per evitar solapament i que no es moguin en fer zoom
      const coordKey = `${lat.toFixed(5)},${lon.toFixed(5)}`;
      if (usedCoords.has(coordKey)) {
        const getJitter = (id, seed) => {
          let h = 0;
          const str = String(id) + String(seed);
          for (let i = 0; i < str.length; i++) {
            h = Math.imul(31, h) + str.charCodeAt(i) | 0;
          }
          return (Math.abs(h) % 1000) / 1000 - 0.5;
        };
        lat += getJitter(report?.id, 'lat') * 0.00015;
        lon += getJitter(report?.id, 'lon') * 0.00015;
      }
      usedCoords.add(coordKey);

      const isOccupied = String(report?.status || '').toLowerCase() === 'occupied';
      const marker = leaflet.circleMarker([lat, lon], {
        radius: REPORT_DISPONIBILITAT_MARKER_RADIUS,
        color: isOccupied ? '#b42318' : '#15803d',
        weight: 2,
        fillColor: isOccupied ? '#ef4444' : '#22c55e',
        fillOpacity: 0.85,
      });

      marker.bindPopup(renderStreetReportPopup(report), {
        closeButton: false,
        autoPanPadding: [30, 30],
      });

      reportDisponibilitatLayer.addLayer(marker);
    });
  };

  const clearUserLocationMarker = () => {
    userLocationLayer.clearLayers();
    userLocationMarker = null;
  };

  const setUserLocationMarker = (location) => {
    const latLng = normalizeLatLng(leaflet, location);
    if (!latLng) {
      clearUserLocationMarker();
      return null;
    }

    clearUserLocationMarker();

    userLocationMarker = leaflet.marker(latLng, {
      icon: userLocationIcon,
      zIndexOffset: 1500,
    });

    userLocationMarker.bindPopup('La teva ubicació', {
      closeButton: false,
      autoPanPadding: [30, 30],
    });

    userLocationMarker.addTo(userLocationLayer);
    return userLocationMarker;
  };

  const focusUserLocation = ({ zoom = 16, openPopup = false } = {}) => {
    if (!userLocationMarker) return false;

    const latlng = userLocationMarker.getLatLng();
    const lat = Number(latlng?.lat);
    const lng = Number(latlng?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      // Coordenades invàlides: netegem el marcador i evitem fer flyTo amb NaN
      clearUserLocationMarker();
      return false;
    }

    map.flyTo(userLocationMarker.getLatLng(), zoom, { duration: 0.8 });
    if (openPopup && typeof userLocationMarker.openPopup === 'function') {
      userLocationMarker.openPopup();
    }

    return true;
  };

  const setLocateMeAction = (handler) => {
    locateMeHandler = typeof handler === 'function' ? handler : null;
    const button = mapElement.querySelector('.map-locate-control__button');
    if (button) {
      button.disabled = !locateMeHandler;
    }
  };

  const setParkingSpots = (spots = [], { fitBounds = true, openFirstPopup = true } = {}) => {
    // Cerrar cualquier popup abierto antes de limpiar marcadores
    parkingMarkers.forEach((marker) => {
      if (typeof marker.closePopup === 'function') {
        marker.closePopup();
      }
      map.removeLayer(marker);
    });
    parkingMarkers.clear();

    console.log(`[ParkLive] Rendering ${spots.length} markers on map`);

    spots.forEach((spot) => {
      const marker = isOpenAirParking(spot)
        ? leaflet.circle(spot.coords, {
            radius: computeOpenAirRadius(spot),
            color: '#b3261e',
            weight: 2,
            fillColor: '#dc3545',
            fillOpacity: 0.24,
            className: 'parking-open-air-area',
          })
        : leaflet.marker(spot.coords, { icon: parkingIcon });

      marker.bindPopup(
        `
          <div class="parking-popup">
            <strong class="d-block mb-1 small fw-semibold">${escapeHtml(spot.name)}</strong>
            <p class="mb-2 small text-body-secondary">${escapeHtml(spot.priceLabel)} · ${escapeHtml(spot.distanceLabel)}</p>
            <span class="badge text-bg-success">${escapeHtml(spot.statusLabel || 'Disponible')}</span>
            <a
              href="/detall_Aparcament?id=${encodeURIComponent(String(spot.id))}"
              class="btn btn-danger btn-sm w-100 mt-2"
              aria-label="Veure detall de l'aparcament ${escapeHtml(spot.name)}"
            >
              Veure detall
            </a>
          </div>
        `,
        {
          closeButton: false,
          autoPanPadding: [30, 30],
        },
      );

      parkingMarkers.set(String(spot.id), marker);
    });

    updateMarkerGroup();
    if (fitBounds) {
      fitToParkingSpots();
    }

    const firstMarker = parkingMarkers.values().next().value;
    if (firstMarker && openFirstPopup) {
      firstMarker.openPopup();
    }
  };

  const hideParkingMarkerById = (parkingId) => {
    const marker = parkingMarkers.get(String(parkingId));
    if (marker) {
      map.removeLayer(marker);
      markerGroup.removeLayer(marker);
      parkingMarkers.delete(String(parkingId));
    }
  };

  const focusParkingById = (parkingId) => {
    const marker = parkingMarkers.get(String(parkingId));
    if (!marker) return;

    map.flyTo(marker.getLatLng(), 16, { duration: 0.8 });
    marker.openPopup();
  };
  const fitToParkingSpots = () => {
    if (markerGroup.getLayers().length === 0) {
      return;
    }

    map.fitBounds(markerGroup.getBounds().pad(0.22));
  };

  const ensureValidViewport = () => {
    if (typeof map.getZoom !== 'function' || typeof map.getCenter !== 'function') {
      return;
    }

    const markerBounds = markerGroup.getBounds();
    const isAtMinZoom = map.getZoom() <= map.getMinZoom() + 0.01;
    const isCenterOutsideMarkers = markerBounds.isValid()
      ? !markerBounds.pad(0.3).contains(map.getCenter())
      : false;

    if (isAtMinZoom || isCenterOutsideMarkers) {
      fitToParkingSpots();
    }
  };

  const updateOpenPopupsLayout = () => {
    parkingMarkers.forEach((marker) => {
      if (typeof marker.isPopupOpen !== 'function' || !marker.isPopupOpen()) {
        return;
      }

      const popup = marker.getPopup();
      if (popup && typeof popup.update === 'function') {
        popup.update();
      }
    });
  };

  const openExampleParkingBtn = document.getElementById('openExampleParkingBtn');
  if (openExampleParkingBtn) {
    openExampleParkingBtn.addEventListener('click', () => {
      const firstMarker = parkingMarkers.values().next().value;
      if (!firstMarker) return;
      map.flyTo(firstMarker.getLatLng(), 16, { duration: 0.8 });
      firstMarker.openPopup();
    });
  }

  // El primer renderitzat pot ocórrer abans que el disseny sigui totalment estable; revalidem després de pintar.
  globalThis.requestAnimationFrame(() => {
    globalThis.requestAnimationFrame(() => {
      if (typeof map.invalidateSize === 'function') {
        map.invalidateSize({ pan: false, debounceMoveend: true });
      }
    });
  });

  return {
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
    fitToParkingSpots,
    ensureValidViewport,
    defaultCenter: DEFAULT_CENTER,
    defaultZoom: DEFAULT_ZOOM,
  };
}
