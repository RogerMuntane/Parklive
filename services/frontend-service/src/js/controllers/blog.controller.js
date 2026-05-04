import { pythonApi } from '../api.js';

/**
 * Utilitat per formatar dates de manera llegible.
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat('ca-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(d);
}

/**
 * Renderitza la llista d'articles a blog.html
 */
function renderBlogList(articles) {
  const container = document.getElementById('blog-container');
  if (!container) return;

  container.innerHTML = '';

  if (articles.length === 0) {
    container.innerHTML = `<div class="col-12 text-center text-muted"><p>No hi ha articles publicats en aquest moment.</p></div>`;
    return;
  }

  articles.forEach(article => {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4';

    const defaultImage = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800';
    const imgSrc = article.imatge_destacada || defaultImage;
    
    col.innerHTML = `
      <div class="card h-100 border-0 shadow-sm rounded-4 overflow-hidden text-decoration-none">
        <a href="/blog-detall.html?slug=${encodeURIComponent(article.slug)}" class="text-decoration-none">
          <img src="${imgSrc}" class="card-img-top object-fit-cover" alt="${article.titol}" style="height: 200px;">
        </a>
        <div class="card-body p-4 d-flex flex-column">
          <div class="mb-2">
            <span class="badge bg-primary rounded-pill text-uppercase">${article.categoria}</span>
          </div>
          <h5 class="card-title fw-bold mb-3">
            <a href="/blog-detall.html?slug=${encodeURIComponent(article.slug)}" class="text-body text-decoration-none text-hover-primary">
              ${article.titol}
            </a>
          </h5>
          <p class="card-text text-muted small flex-grow-1">${article.resum || ''}</p>
          <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top text-muted small">
            <span><i class="bi bi-calendar3 me-1"></i> ${formatDate(article.data_publicacio)}</span>
            <span><i class="bi bi-eye me-1"></i> ${article.visites || 0}</span>
          </div>
        </div>
      </div>
    `;
    container.appendChild(col);
  });
}

/**
 * Renderitza un article concret a blog-detall.html
 */
function renderBlogArticle(article) {
  const container = document.getElementById('blog-detall-container');
  if (!container) return;

  document.title = `ParkLive | ${article.titol}`;

  document.getElementById('article-titol').textContent = article.titol;
  document.getElementById('article-categoria').textContent = article.categoria;
  document.getElementById('article-data').textContent = formatDate(article.data_publicacio);
  document.getElementById('article-autor').textContent = `${article.autor_nom || ''} ${article.autor_cognoms || ''}`.trim() || 'Equip ParkLive';
  document.getElementById('article-visites').textContent = article.visites || 0;

  const defaultImage = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800';
  const imgSrc = article.imatge_destacada || defaultImage;

  const imgEl = document.getElementById('article-imatge');
  if (imgEl) {
    imgEl.src = imgSrc;
    imgEl.classList.remove('d-none');
  }

  // Permet HTML bàsic en el contingut per a negretes, llistes, etc.
  const contentEl = document.getElementById('article-contingut');
  contentEl.innerHTML = article.contingut.replace(/\n/g, '<br>');
}

export async function initBlogList() {
  const loading = document.getElementById('blog-loading');
  const errorEl = document.getElementById('blog-error');
  const container = document.getElementById('blog-container');

  if (!loading || !errorEl || !container) return;

  try {
    const response = await pythonApi.get('/api/blog');
    
    if (response && response.success) {
      renderBlogList(response.data);
      container.classList.remove('d-none');
    } else {
      throw new Error(response.error || 'Error desconegut');
    }
  } catch (err) {
    console.error('[ParkLive] Error carregant el blog:', err);
    errorEl.textContent = 'S\'ha produït un error carregant els articles del blog.';
    errorEl.classList.remove('d-none');
  } finally {
    loading.classList.add('d-none');
  }
}

export async function initBlogDetail() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  const loading = document.getElementById('blog-detall-loading');
  const errorEl = document.getElementById('blog-detall-error');
  const container = document.getElementById('blog-detall-container');

  if (!loading || !errorEl || !container) return;

  if (!slug) {
    loading.classList.add('d-none');
    errorEl.textContent = 'No s\'ha especificat cap article (slug buit).';
    errorEl.classList.remove('d-none');
    return;
  }

  try {
    const response = await pythonApi.get(`/api/blog/${encodeURIComponent(slug)}`);
    
    if (response && response.success) {
      renderBlogArticle(response.data);
      container.classList.remove('d-none');
    } else {
      throw new Error(response.error || 'Error desconegut');
    }
  } catch (err) {
    console.error('[ParkLive] Error carregant l\'article:', err);
    errorEl.textContent = 'Aquest article no existeix o no es pot carregar.';
    errorEl.classList.remove('d-none');
  } finally {
    loading.classList.add('d-none');
  }
}
