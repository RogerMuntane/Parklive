import { pythonApi } from '../api.js';
import { getQueryParam, showBootstrapAlert } from '../utils.js';
import { PHP_API_URL } from '../config.js';

export async function initNovaValoracio() {
  const aparcamentId = getQueryParam('id');
  
  if (!aparcamentId) {
    showBootstrapAlert('danger', 'Error: No s\'ha especificat cap aparcament.');
    return;
  }

  try {
    // Obtenir detalls de l'aparcament per mostrar-ho al form
    const aparcament = await pythonApi.get(`/api/aparcaments/${aparcamentId}`);
    
    document.getElementById('parking-name').textContent = aparcament.nom;
    const adreca = [aparcament.adreca, aparcament.ciutat].filter(Boolean).join(', ');
    document.getElementById('parking-address').textContent = adreca;

    if (aparcament.fotos && aparcament.fotos.length > 0) {
      let url = aparcament.fotos[0].url;
      if (url && !url.startsWith('http') && !url.startsWith('data:')) {
          if (url.startsWith('/')) {
              url = PHP_API_URL + url;
          } else if (!url.includes('/')) {
              url = PHP_API_URL + '/uploads/parkings/' + url;
          } else {
              url = PHP_API_URL + '/' + url;
          }
      }
      document.getElementById('parking-image').src = url;
    }
  } catch (err) {
    console.error('Error carregant dades de l\'aparcament:', err);
  }

  // Preview de fotos
  const fotoInput = document.getElementById('foto-input');
  const previewContainer = document.getElementById('foto-preview-container');
  let selectedFiles = [];

  if (fotoInput) {
    fotoInput.addEventListener('change', (e) => {
      const newFiles = Array.from(e.target.files);
      if (selectedFiles.length + newFiles.length > 3) {
        showBootstrapAlert('warning', 'Només pots pujar fins a 3 fotos.');
        return;
      }
      
      selectedFiles = [...selectedFiles, ...newFiles];
      renderPreviews();
    });
  }

  function renderPreviews() {
    previewContainer.innerHTML = '';
    selectedFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const div = document.createElement('div');
        div.className = 'position-relative';
        div.innerHTML = `
          <div class="position-relative">
            <img src="${e.target.result}" class="rounded-3 object-fit-cover shadow-sm border" style="width: 80px; height: 80px;">
            <button type="button" class="btn btn-dark btn-sm position-absolute top-0 end-0 m-1 rounded-circle d-flex align-items-center justify-content-center" 
              onclick="window.removeFoto(${index})" 
              style="width: 22px; height: 22px; padding: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.2); transition: all 0.2s;">
              <i class="bi bi-x-lg" style="font-size: 10px; color: white;"></i>
            </button>
          </div>
        `;
        previewContainer.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
  }

  window.removeFoto = (index) => {
    selectedFiles.splice(index, 1);
    renderPreviews();
  };

  const form = document.getElementById('form-valoracio');
  const btnSubmit = document.getElementById('btn-submit-review');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // La interfície té estrelles a través de radio buttons (així s'hauria d'haver definit)
      // Però mirem si en l'HTML hi han radio buttons
      const puntuacioInput = document.querySelector('input[name="puntuacio"]:checked');
      
      // IMPORTANT: com que nova_Valoracio originalment feia servir estrelles de bootstrap iterades per JS, si no hi ha radio buttons, mirem si hi ha un hidden input per la puntuació, però jo t'he dit que posessis ràdio buttons
      let puntuacio = puntuacioInput ? puntuacioInput.value : 0;
      
      if (!puntuacio) {
        // Alternative per si les estrelles funcionen amb js i un input ocult com a detall_Aparcament
        const ratingInputH = document.getElementById('rating-input');
        if (ratingInputH) puntuacio = ratingInputH.value;
      }

      if (!puntuacio || puntuacio == 0) {
        showBootstrapAlert('danger', 'Si us plau, selecciona una puntuació.');
        return;
      }

      const comentari = document.getElementById('comentari').value.trim();

      const aspectesInputs = document.querySelectorAll('.aspect-checkbox:checked');
      const aspectes_valorats = Array.from(aspectesInputs).map(cb => cb.value);

      const formData = new FormData();
      formData.append('puntuacio', puntuacio);
      formData.append('comentari', comentari);
      formData.append('aspectes_valorats', JSON.stringify(aspectes_valorats));
      
      selectedFiles.forEach(file => {
        formData.append('fotos_url[]', file); // Array per python getlist
      });

      btnSubmit.disabled = true;
      const originalText = btnSubmit.innerHTML;
      btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Publicant...';

      try {
        const result = await pythonApi.postForm(`/api/aparcaments/${aparcamentId}/valoracions`, formData);
        
        if (result.success) {
          // Punts local
          try {
            const raw = sessionStorage.getItem('parklive_user_data');
            if (raw) {
              const userData = JSON.parse(raw);
              userData.punts_gamificacio = (userData.punts_gamificacio || 0) + 10;
              sessionStorage.setItem('parklive_user_data', JSON.stringify(userData));
            }
          } catch(err) {}

          window.location.href = `/detall_Aparcament.html?id=${aparcamentId}`;
        } else {
          showBootstrapAlert('danger', result.error || 'Error en publicar la valoració');
        }
      } catch (err) {
        console.error('Error publicant valoració:', err);
        showBootstrapAlert('danger', err.message || 'Error de connexió.');
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalText;
      }
    });
  }
}
