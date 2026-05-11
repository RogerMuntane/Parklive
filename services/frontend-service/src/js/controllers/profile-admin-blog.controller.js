import { pythonApi } from '../api.js';

let articlesData = [];
let modalInstance = null;

function renderBlogTable() {
  const tbody = document.getElementById('admin-blog-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (articlesData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-4">No hi ha cap article registrat.</td>
      </tr>
    `;
    return;
  }

  articlesData.forEach(article => {
    const tr = document.createElement('tr');

    // Formatting date
    let dateStr = '-';
    if (article.data_publicacio) {
      dateStr = new Date(article.data_publicacio).toLocaleDateString('ca-ES');
    } else if (article.created_at) {
      dateStr = new Date(article.created_at).toLocaleDateString('ca-ES');
    }

    const isPublished = article.publicat ? '<span class="badge bg-success">Publicat</span>' : '<span class="badge bg-secondary">Esborrany</span>';

    tr.innerHTML = `
      <td>
        <div class="fw-bold">${article.titol}</div>
        <small class="text-muted text-truncate d-inline-block" style="max-width: 200px;">/${article.slug}</small>
      </td>
      <td><span class="badge bg-primary text-uppercase">${article.categoria}</span></td>
      <td>${isPublished}</td>
      <td>${dateStr}</td>
      <td class="text-end">
        <div class="btn-group btn-group-sm">
<<<<<<< Updated upstream
          <a href="/blog-detall?slug=${encodeURIComponent(article.slug)}" target="_blank" class="btn btn-outline-secondary" title="Veure publicació">
=======
          <a href="/blog-detall.html?slug=${encodeURIComponent(article.slug)}" class="btn btn-outline-secondary" title="Veure publicació">
>>>>>>> Stashed changes
            <i class="bi bi-eye"></i>
          </a>
          <button class="btn btn-outline-primary btn-edit-article" data-id="${article.id}" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger btn-delete-article" data-id="${article.id}" title="Eliminar">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Afegir events als botons de la taula
  document.querySelectorAll('.btn-edit-article').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      openArticleModal(id);
    });
  });

  document.querySelectorAll('.btn-delete-article').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      document.getElementById('delete-blog-id').value = id;
      const modalEl = document.getElementById('modal-delete-blog');
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    });
  });
}

async function loadArticles() {
  const loading = document.getElementById('admin-blog-loading');
  const errorEl = document.getElementById('admin-blog-error');
  const tbody = document.getElementById('admin-blog-tbody');

  if (!loading || !errorEl || !tbody) return;

  loading.classList.remove('d-none');
  errorEl.classList.add('d-none');
  tbody.innerHTML = '';

  try {
    const response = await pythonApi.get('/api/blog');
    if (response && response.success) {
      articlesData = response.data;
      renderBlogTable();
    } else {
      throw new Error(response.error || 'Error desconegut');
    }
  } catch (err) {
    console.error('[ParkLive] Error carregant articles admin:', err);
    errorEl.textContent = 'Error carregant els articles: ' + (err.message || 'Error intern');
    errorEl.classList.remove('d-none');
  } finally {
    loading.classList.add('d-none');
  }
}

function openArticleModal(id = null) {
  const form = document.getElementById('blog-article-form');
  const modalEl = document.getElementById('blogArticleModal');
  const modalLabel = document.getElementById('blogArticleModalLabel');

  if (!form || !modalEl) return;

  form.reset();

  if (id) {
    // Mode Edició
    const article = articlesData.find(a => a.id == id);
    if (!article) return;

    modalLabel.textContent = 'Editar Article';
    document.getElementById('blog-article-id').value = article.id;
    document.getElementById('blog-titol').value = article.titol;
    document.getElementById('blog-slug').value = article.slug;
    document.getElementById('blog-categoria').value = article.categoria;
    document.getElementById('blog-publicat').checked = article.publicat;
    
    document.getElementById('blog-imatge').value = '';
    const imgLink = document.getElementById('blog-current-image');
    if (article.imatge_destacada) {
      let finalHref = article.imatge_destacada;
      if (finalHref.startsWith('/api/')) {
        finalHref = pythonApi.baseURL + finalHref;
      }
      imgLink.href = finalHref;
      imgLink.classList.remove('d-none');
    } else {
      imgLink.classList.add('d-none');
    }

    document.getElementById('blog-resum').value = article.resum || '';
    document.getElementById('blog-contingut').value = article.contingut || '';
  } else {
    // Mode Creació
    modalLabel.textContent = 'Nou Article';
    document.getElementById('blog-article-id').value = '';
    document.getElementById('blog-publicat').checked = false;
    document.getElementById('blog-imatge').value = '';
    document.getElementById('blog-current-image').classList.add('d-none');
  }

  if (!modalInstance) {
    modalInstance = new bootstrap.Modal(modalEl);
  }
  modalInstance.show();
}

async function saveArticle(e) {
  e.preventDefault();

  const id = document.getElementById('blog-article-id').value;
  const publicat = document.getElementById('blog-publicat').checked;

  let data_publicacio = null;
  if (publicat) {
    if (id) {
      const art = articlesData.find(a => a.id == id);
      if (art && art.data_publicacio) {
        data_publicacio = art.data_publicacio;
      } else {
        data_publicacio = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }
    } else {
      data_publicacio = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
  }

  const formData = new FormData();
  formData.append('titol', document.getElementById('blog-titol').value);
  formData.append('slug', document.getElementById('blog-slug').value);
  formData.append('categoria', document.getElementById('blog-categoria').value);
  formData.append('publicat', publicat);
  formData.append('resum', document.getElementById('blog-resum').value);
  formData.append('contingut', document.getElementById('blog-contingut').value);
  if (data_publicacio) {
    formData.append('data_publicacio', data_publicacio);
  }

  const imatgeInput = document.getElementById('blog-imatge');
  if (imatgeInput.files && imatgeInput.files[0]) {
    formData.append('imatge_destacada', imatgeInput.files[0]);
  }

  const btn = document.getElementById('btn-save-article');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardant...';
  btn.disabled = true;

  try {
    let response;
    // La nostra API per defecte assumeix JSON si enviem `{}`. Per enviar FormData cal usar fetch directament
    // o modificar el nostre client d'API si no suporta FormData automàticament.
    // ParkLive pythonApi ja hauria d'acceptar FormData si ho detecta.
    if (id) {
      response = await pythonApi.put(`/api/blog/${id}`, formData);
    } else {
      response = await pythonApi.post('/api/blog', formData);
    }

    if (response && response.success) {
      modalInstance.hide();
      await loadArticles();
      alert('Article desat correctament.');
    } else {
      throw new Error(response.error || 'Error desconegut');
    }
  } catch (err) {
    alert('Error al desar l\'article: ' + (err.message || 'Error intern'));
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

async function deleteArticle(id) {
  try {
    const response = await pythonApi.delete(`/api/blog/${id}`);
    if (response && response.success) {
      await loadArticles();
    } else {
      throw new Error(response.error || 'Error desconegut');
    }
  } catch (err) {
    alert('Error en eliminar: ' + (err.message || 'Error intern'));
  }
}

export function initAdminBlog() {
  const btnAdd = document.getElementById('btn-add-article');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => openArticleModal(null));
  }

  const form = document.getElementById('blog-article-form');
  if (form) {
    form.addEventListener('submit', saveArticle);
  }

  // Generador d'slug automàtic a partir del títol quan es crea
  const titolInput = document.getElementById('blog-titol');
  const slugInput = document.getElementById('blog-slug');
  if (titolInput && slugInput) {
    titolInput.addEventListener('input', () => {
      if (!document.getElementById('blog-article-id').value) {
        // Només autogenerar si estem creant de zero
        let slug = titolInput.value.toLowerCase().trim()
          .replace(/[\s_]+/g, '-')
          .replace(/[^\w-]+/g, '');
        slugInput.value = slug;
      }
    });
  }

  const btnConfirmDelete = document.getElementById('btn-confirm-delete-blog');
  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', async () => {
      const id = document.getElementById('delete-blog-id').value;
      const originalText = btnConfirmDelete.innerHTML;
      btnConfirmDelete.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Eliminant...';
      btnConfirmDelete.disabled = true;

      await deleteArticle(id);

      btnConfirmDelete.innerHTML = originalText;
      btnConfirmDelete.disabled = false;
      const modalEl = document.getElementById('modal-delete-blog');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    });
  }

  loadArticles();
}
