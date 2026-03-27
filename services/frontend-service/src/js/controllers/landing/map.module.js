const DEFAULT_CENTER = [41.3872, 2.1703];
const DEFAULT_ZOOM = 14;
const MIN_ZOOM = 4;

const PARKING_SPOTS = [
  {
    id: 'parklive-centro',
    name: 'ParkLive Centro',
    coords: [41.3874, 2.1692],
    price: '2,80 €/h',
    distance: '650 m',
    status: 'Disponible',
  },
  {
    id: 'parklive-rambla',
    name: 'ParkLive Rambla',
    coords: [41.3818, 2.173],
    price: '3,10 €/h',
    distance: '1,1 km',
    status: 'Pocas plazas',
  },
  {
    id: 'parklive-sagrada',
    name: 'ParkLive Sagrada',
    coords: [41.4035, 2.1742],
    price: '2,40 €/h',
    distance: '2,0 km',
    status: 'Disponible',
  },
];

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
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
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

  PARKING_SPOTS.forEach((parking) => {
    const marker = leaflet.marker(parking.coords, { icon: parkingIcon });

    marker.bindPopup(
      `
        <div class="parking-popup">
          <strong class="d-block mb-1 small fw-semibold">${parking.name}</strong>
          <p class="mb-2 small text-body-secondary">${parking.price} · ${parking.distance}</p>
          <span class="badge text-bg-success">${parking.status}</span>
        </div>
      `,
      {
        closeButton: false,
        autoPanPadding: [30, 30],
      },
    );

    marker.addTo(map);
    parkingMarkers.set(parking.id, marker);
  });

  const markerGroup = leaflet.featureGroup(Array.from(parkingMarkers.values()));
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

  fitToParkingSpots();

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

  const defaultMarker = parkingMarkers.get('parklive-centro');
  if (defaultMarker) {
    defaultMarker.openPopup();
  }

  const openExampleParkingBtn = document.getElementById('openExampleParkingBtn');
  if (openExampleParkingBtn && defaultMarker) {
    openExampleParkingBtn.addEventListener('click', () => {
      map.flyTo(defaultMarker.getLatLng(), 16, { duration: 0.8 });
      defaultMarker.openPopup();
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
    updateOpenPopupsLayout,
    fitToParkingSpots,
    ensureValidViewport,
    defaultCenter: DEFAULT_CENTER,
    defaultZoom: DEFAULT_ZOOM,
  };
}
