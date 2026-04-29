import { showBootstrapAlert } from '../utils.js';

export function initContacte() {
  const mapEl = document.getElementById('contact-map');
  if (!mapEl) return;

  const map = L.map('contact-map', {
    scrollWheelZoom: false,
    zoomControl: false,
    attributionControl: false
  }).setView([41.550611, 2.440444], 16);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  L.control
    .attribution({ position: 'bottomleft', prefix: false })
    .addTo(map)
    .addAttribution('© OpenStreetMap contributors, © CARTO');

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  const parkingIcon = L.divIcon({
    className: 'parking-marker-wrapper',
    html: '<span class="parking-marker" aria-hidden="true"></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14]
  });

  const marker = L.marker([41.550611, 2.440444], { icon: parkingIcon }).addTo(map);

  marker.bindPopup(`
    <div class="parking-popup text-center">
      <strong class="d-block mb-1 small fw-semibold">Institut Thos i Codina</strong>
      <p class="mb-0 small text-body-secondary"><i class="bi bi-geo-alt me-1"></i>Mataró</p>
    </div>
  `, { closeButton: false, autoPanPadding: [30, 30] });

  // Si contact-form necessita afegir listeners, es poden afegir aquí:
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // Placeholder logic for form submission
      showBootstrapAlert('success', 'Missatge enviat correctament! Et contactarem aviat.');
      contactForm.reset();
    });
  }
}
