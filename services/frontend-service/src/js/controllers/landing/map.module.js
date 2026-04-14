const DEFAULT_CENTER = [41.3872, 2.1703];
const DEFAULT_ZOOM = 14;
const MIN_ZOOM = 4;
const OPEN_AIR_BASE_RADIUS_METERS = 45;

function escapeHtml(value) {
  if (!value) return '';
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function isOpenAirParking(spot) {
  return spot?.raw?.tipus === 'aire_lliure';
}

function computeOpenAirRadius(spot) {
  const totalCapacity = Number(spot?.raw?.capacitat_total);
  if (!Number.isFinite(totalCapacity) || totalCapacity <= 0) {
    return OPEN_AIR_BASE_RADIUS_METERS;
  }

  return Math.max(35, Math.min(95, Math.round(Math.sqrt(totalCapacity) * 3.2)));
}

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
    })
    .setView(DEFAULT_CENTER, DEFAULT_ZOOM);

  globalThis.map = map;

  leaflet.control.zoom({ position: 'bottomright' }).addTo(map);
  leaflet.control.scale({ imperial: false, position: 'bottomright' }).addTo(map);

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

  const parkingMarkers = new Map();
  const markerGroup = leaflet.featureGroup().addTo(map);

  const updateMarkerGroup = () => {
    markerGroup.clearLayers();
    parkingMarkers.forEach((marker) => {
      markerGroup.addLayer(marker);
    });
  };

  const setParkingSpots = (spots = []) => {
    parkingMarkers.forEach((marker) => {
      map.removeLayer(marker);
    });
    parkingMarkers.clear();

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
              href="/detall_Aparcament.html?id=${encodeURIComponent(String(spot.id))}"
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

      marker.addTo(map);
      parkingMarkers.set(String(spot.id), marker);
    });

    updateMarkerGroup();
    fitToParkingSpots();

    const firstMarker = parkingMarkers.values().next().value;
    if (firstMarker) {
      firstMarker.openPopup();
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
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
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

  // First render can occur before the layout is fully stable; re-validate after paint.
  globalThis.requestAnimationFrame(() => {
    globalThis.requestAnimationFrame(() => {
      if (typeof map.invalidateSize === 'function') {
        map.invalidateSize({ pan: false, debounceMoveend: true });
      }
      ensureValidViewport();
    });
  });

  return {
    map,
    markerGroup,
    setParkingSpots,
    focusParkingById,
    updateOpenPopupsLayout,
    fitToParkingSpots,
    ensureValidViewport,
    defaultCenter: DEFAULT_CENTER,
    defaultZoom: DEFAULT_ZOOM,
  };
}
