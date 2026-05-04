import { pythonApi } from '../api.js';

function renderFaqs(faqs) {
  const container = document.getElementById('faq-container');
  if (!container) return;

  // Agrupar les faqs per categoria
  const groupedFaqs = faqs.reduce((acc, faq) => {
    const cat = faq.categoria || 'General';
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(faq);
    return acc;
  }, {});

  let html = '';
  let index = 0;

  for (const [categoria, preguntas] of Object.entries(groupedFaqs)) {
    html += `<h3 class="fw-bold mt-5 mb-3">${categoria}</h3>`;
    html += `<div class="accordion mb-4" id="accordion-${index}">`;
    
    preguntas.forEach((faq, i) => {
      const collapseId = `collapse-${index}-${i}`;
      const headingId = `heading-${index}-${i}`;
      
      html += `
        <div class="accordion-item shadow-sm mb-2 border-0 rounded-3 overflow-hidden">
          <h2 class="accordion-header" id="${headingId}">
            <button class="accordion-button collapsed fw-semibold" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}">
              ${faq.pregunta}
            </button>
          </h2>
          <div id="${collapseId}" class="accordion-collapse collapse" aria-labelledby="${headingId}" data-bs-parent="#accordion-${index}">
            <div class="accordion-body text-muted border-top">
              ${faq.resposta}
            </div>
          </div>
        </div>
      `;
    });
    
    html += `</div>`;
    index++;
  }

  container.innerHTML = html;
}

export async function initFaq() {
  const loading = document.getElementById('faq-loading');
  const errorEl = document.getElementById('faq-error');
  const container = document.getElementById('faq-container');

  if (!loading || !errorEl || !container) return;

  try {
    const response = await pythonApi.get('/api/faqs');
    
    if (response && response.success) {
      const faqs = response.data;
      if (faqs.length === 0) {
        errorEl.textContent = 'No hi ha preguntes freqüents disponibles en aquest moment.';
        errorEl.classList.remove('d-none');
      } else {
        renderFaqs(faqs);
        container.classList.remove('d-none');
      }
    } else {
      throw new Error(response.error || 'Error desconegut');
    }
  } catch (err) {
    console.error('[ParkLive] Error carregant les FAQs:', err);
    errorEl.textContent = 'S\'ha produït un error al servidor carregant les FAQs. Torna a intentar-ho més tard.';
    errorEl.classList.remove('d-none');
  } finally {
    loading.classList.add('d-none');
  }
}
