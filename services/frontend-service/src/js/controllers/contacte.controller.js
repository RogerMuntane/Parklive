import { showBootstrapAlert, getUserId, getUserSession, setFormLoading } from '../utils.js';
import { pythonApi } from '../api.js';

/**
 * initContacte - Funció exportada per a initContacte.
 *
 * @returns {any} Resultat de la funció.
 */
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
    // Autocompletar dades si l'usuari està loguejat
    const user = getUserSession();
    if (user) {
      const nomInput = document.getElementById('nom');
      const emailInput = document.getElementById('email');
      if (nomInput && !nomInput.value) nomInput.value = `${user.nom} ${user.cognoms || ''}`.trim();
      if (emailInput && !emailInput.value) emailInput.value = user.email;
    }

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = {
        nom: document.getElementById('nom').value,
        email: document.getElementById('email').value,
        assumpte: document.getElementById('assumpte').value,
        missatge: document.getElementById('missatge').value,
        usuari_id: getUserId()
      };

      setFormLoading(contactForm, true);

      try {
        const response = await pythonApi.post('/api/suport/contacte', formData);
        
        if (response && response.message) {
          showBootstrapAlert('success', 'Missatge enviat correctament! Et contactarem aviat.');
          contactForm.reset();
        } else {
          throw new Error('Resposta inesperada del servidor');
        }
      } catch (error) {
        console.error('[Contacte] Error enviant missatge:', error);
        showBootstrapAlert('danger', 'No s\'ha pogut enviar el missatge. Torna-ho a provar més tard.');
      } finally {
        setFormLoading(contactForm, false);
      }
    });
  }
}
