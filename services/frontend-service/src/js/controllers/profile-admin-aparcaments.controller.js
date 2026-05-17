/**
 * ParkLive – profile-admin-aparcaments.controller.js
 *
 * Gestiona el CRUD d'aparcaments per a administradors.
 */

import { pythonApi } from '../api.js';
import { showBootstrapAlert, createMapPicker } from '../utils.js';

const MAX_PARKING_IMAGES = 10;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

let adminMap = null;
let adminMarker = null;

/**
 * Inicialitza el mapa (Leaflet) del modal d'administració d'aparcaments.
 * Permet escollir la ubicació (lat/lng) fent clic al mapa.
 * 
 * @param {number} lat - Latitud inicial.
 * @param {number} lng - Longitud inicial.
 * @returns {void}
 */
function initAdminMap(lat, lng) {
    const latInput = document.getElementById('admin-aparcament-lat');
    const lngInput = document.getElementById('admin-aparcament-lng');
    const mapContainer = document.getElementById('admin-aparcament-map');

    if (!latInput || !lngInput || !mapContainer) return;

    if (lat) latInput.value = lat;
    if (lng) lngInput.value = lng;

    const result = createMapPicker('admin-aparcament-map', latInput, lngInput, 41.3872, 2.1703, adminMap, adminMarker);
    adminMap = result.map;
    adminMarker = result.marker;
}

/**
 * Inicialitza la lògica del CRUD d'aparcaments a l'àrea d'administració.
 * Vincula els esdeveniments dels formularis, buscadors, modals i la pujada d'imatges.
 * 
 * @returns {void}
 */
export function initAdminParkingCRUD() {
    const section = document.getElementById('section-admin-parkings');
    if (!section) return;

    loadParkings();

    // Event listeners
    document.getElementById('btn-refresh-parkings')?.addEventListener('click', () => loadParkings());
    document.getElementById('parking-search')?.addEventListener('input', debounce(() => loadParkings(), 500));
    document.getElementById('filter-parking-type')?.addEventListener('change', () => loadParkings());
    document.getElementById('filter-parking-status')?.addEventListener('change', () => loadParkings());
    document.getElementById('form-parking')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('btn-add-parking')?.addEventListener('click', resetForm);

    document.getElementById('parking-images')?.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > MAX_PARKING_IMAGES) {
            showBootstrapAlert('danger', `Només pots seleccionar fins a ${MAX_PARKING_IMAGES} imatges`);
            e.target.value = '';
        }
    });

    // Validació interactiva: si obert_24h està marcat, deshabilitar horaris
    const check24h = document.getElementById('check-24h');
    if (check24h) {
        check24h.addEventListener('change', (e) => {
            const form = e.target.closest('form');
            const hObertura = form.querySelector('[name="horari_obertura"]');
            const hTancament = form.querySelector('[name="horari_tancament"]');

            if (e.target.checked) {
                hObertura.value = '';
                hTancament.value = '';
                hObertura.disabled = true;
                hTancament.disabled = true;
                hObertura.classList.add('bg-light');
                hTancament.classList.add('bg-light');
            } else {
                hObertura.disabled = false;
                hTancament.disabled = false;
                hObertura.classList.remove('bg-light');
                hTancament.classList.remove('bg-light');
            }
        });
    }

    // Moure modals al body si no hi són per evitar problemes de z-index
    const modalEl = document.getElementById('modal-parking');
    const modalDelEl = document.getElementById('modal-delete-parking');
    if (modalEl && modalEl.parentNode !== document.body) {
        document.body.appendChild(modalEl);
    }
    if (modalDelEl && modalDelEl.parentNode !== document.body) {
        document.body.appendChild(modalDelEl);
    }

    if (modalEl) {
        modalEl.addEventListener('shown.bs.modal', () => {
            if (adminMap) {
                setTimeout(() => {
                    adminMap.invalidateSize();
                }, 100);
            }
        });
    }

    document.getElementById('btn-confirm-delete-parking')?.addEventListener('click', async () => {
        const id = document.getElementById('delete-parking-id').value;
        const btn = document.getElementById('btn-confirm-delete-parking');

        btn.disabled = true;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Eliminant...';

        await performDelete(id);

        btn.disabled = false;
        btn.innerHTML = originalHTML;

        const modalEl = document.getElementById('modal-delete-parking');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    });
}

let currentPage = 1;

/**
 * Carrega la llista d'aparcaments des de l'API (amb paginació i cerca).
 * 
 * @param {number} [page=1] - Pàgina a carregar.
 * @returns {Promise<void>}
 */
async function loadParkings(page = 1) {
    currentPage = page;
    const tableBody = document.getElementById('parkings-table-body');
    const searchTerm = document.getElementById('parking-search')?.value || '';
    const typeFilter = document.getElementById('filter-parking-type')?.value || '';
    const statusFilter = document.getElementById('filter-parking-status')?.value || '';

    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregant...</span></div></td></tr>`;

    try {
        const queryParams = {
            search: searchTerm,
            type: typeFilter,
            status: statusFilter,
            page: currentPage,
            limit: 10
        };

        const result = await pythonApi.get(`/api/admin/aparcaments`, queryParams);

        if (result.success) {
            renderParkings(result.data);
            if (result.pagination) {
                renderPagination(result.pagination);
                document.getElementById('parkings-count-info').innerHTML = `Mostrant <span class="fw-bold">${result.data.length}</span> de <span class="fw-bold">${result.pagination.total}</span> aparcaments`;
            }
        } else {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">${result.error || 'Error al carregar aparcaments'}</td></tr>`;
            document.getElementById('parkings-pagination').innerHTML = '';
        }
    } catch (err) {
        console.error('[ParkLive] Error carregant aparcaments:', err);
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Error de connexió</td></tr>`;
        document.getElementById('parkings-pagination').innerHTML = '';
    }
}

/**
 * Renderitza la taula d'aparcaments a la vista d'administració.
 * 
 * @param {Array<Object>} parkings - Llista d'aparcaments a mostrar.
 * @returns {void}
 */
function renderParkings(parkings) {
    const tableBody = document.getElementById('parkings-table-body');
    if (!tableBody) return;

    if (parkings.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No s\'han trobat aparcaments</td></tr>';
        return;
    }

    tableBody.innerHTML = parkings.map(p => {
        const estatColors = {
            'actiu': 'bg-success text-white',
            'inactiu': 'bg-secondary text-white',
            'manteniment': 'bg-warning text-dark',
            'complet': 'bg-danger text-white'
        };
        const badgeColor = estatColors[p.estat] || 'bg-light text-dark border';

        return `
        <tr>
            <td class="ps-3">
                <div class="fw-bold">${p.nom}</div>
                <div class="text-secondary small text-truncate" style="max-width: 250px;">${p.adreca}</div>
            </td>
            <td>
                <span class="badge bg-light text-dark border x-small fw-medium">
                    ${p.tipus.replace('_', ' ').toUpperCase()}
                </span>
            </td>
            <td class="small">${p.ciutat}</td>
            <td class="small">
                <div class="fw-bold">${p.places_disponibles} / ${p.capacitat_total}</div>
                <div class="text-secondary x-small">places</div>
            </td>
            <td>
                <span class="badge rounded-pill px-2 py-1 x-small fw-medium ${badgeColor}">
                    ${p.estat.toUpperCase()}
                </span>
            </td>
            <td class="text-end pe-3">
                <button class="btn btn-sm btn-outline-primary border-0 me-1" onclick="editParking(${JSON.stringify(p).replace(/"/g, '&quot;')})" title="Editar">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteParking(${p.id})" title="Eliminar">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `}).join('');
}

/**
 * Renderitza els controls de paginació de la taula d'aparcaments.
 * 
 * @param {Object} pagination - Dades de paginació (total, limit, offset, etc.).
 * @returns {void}
 */
function renderPagination(pagination) {
    const paginationContainer = document.getElementById('parkings-pagination');
    if (!paginationContainer) return;

    if (pagination.total_pages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    const { page: currentPage, total_pages: totalPages } = pagination;
    const isPrevDisabled = currentPage === 1;
    const isNextDisabled = currentPage === totalPages;

    let pagesHtml = '';
    for (let i = 1; i <= totalPages; i++) {
        const isActive = i === currentPage;
        pagesHtml += `
            <li class="page-item ${isActive ? 'active' : ''}">
                <button class="page-link" data-page="${i}" ${isActive ? 'aria-current="page"' : ''}>
                    ${i}
                </button>
            </li>`;
    }

    paginationContainer.innerHTML = `
        <li class="page-item ${isPrevDisabled ? 'disabled' : ''}">
            <button class="page-link" data-page="${currentPage - 1}"
                ${isPrevDisabled ? 'disabled aria-disabled="true"' : ''}>
                <i class="bi bi-chevron-left"></i>
            </button>
        </li>
        ${pagesHtml}
        <li class="page-item ${isNextDisabled ? 'disabled' : ''}">
            <button class="page-link" data-page="${currentPage + 1}"
                ${isNextDisabled ? 'disabled aria-disabled="true"' : ''}>
                <i class="bi bi-chevron-right"></i>
            </button>
        </li>
    `;

    paginationContainer.querySelectorAll('button[data-page]:not([disabled])').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const newPage = parseInt(btn.dataset.page);
            if (newPage && newPage !== currentPage && newPage > 0 && newPage <= totalPages) {
                loadParkings(newPage);
            }
        });
    });
}

let isSubmitting = false;

/**
 * Gestiona l'enviament del formulari de creació o edició d'un aparcament.
 * Envia les dades via FormData per incloure la imatge i les coordenades.
 * 
 * @param {Event} e - Objecte de l'esdeveniment (submit).
 * @returns {Promise<void>}
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    // Guardia anti-doble enviament (prevé crear N parkings per N imatges)
    if (isSubmitting) return;

    const form = e.target;
    const btn = document.getElementById('btn-save-parking');
    const originalBtnHtml = btn?.innerHTML;

    const payload = new FormData(form);
    const id = payload.get('parking-id');
    payload.delete('parking-id');

    payload.set('obert_24h', form.querySelector('[name="obert_24h"]').checked ? '1' : '0');
    payload.set('accessibilitat', form.querySelector('[name="accessibilitat"]').checked ? '1' : '0');
    payload.set('carrega_electrica', form.querySelector('[name="carrega_electrica"]').checked ? '1' : '0');
    payload.set('videovigilancia', form.querySelector('[name="videovigilancia"]').checked ? '1' : '0');
    payload.set('verificat', form.querySelector('[name="verificat"]').checked ? '1' : '0');

    // VALIDACIONS CLIENT-SIDE
    const capTotal = parseInt(payload.get('capacitat_total')) || 0;

    if (capTotal < 1) {
        showBootstrapAlert('danger', 'La capacitat total ha de ser d\'almenys 1 plaça');
        return;
    }

    const files = Array.from(form.querySelector('#parking-images')?.files || []);

    if (files.length > MAX_PARKING_IMAGES) {
        showBootstrapAlert('danger', `Només pots pujar fins a ${MAX_PARKING_IMAGES} imatges`);
        return;
    }

    for (const file of files) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            showBootstrapAlert('danger', `Format no permès: ${file.name}. Només JPG, PNG o WebP`);
            return;
        }
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            showBootstrapAlert('danger', `La imatge ${file.name} supera els 5MB`);
            return;
        }
    }

    if (payload.get('obert_24h') === '1') {
        payload.set('horari_obertura', '');
        payload.set('horari_tancament', '');
    } else {
        if (!payload.get('horari_obertura') || !payload.get('horari_tancament')) {
            showBootstrapAlert('danger', 'Si l\'aparcament no és 24h, has d\'especificar l\'horari d\'obertura i tancament');
            return;
        }
    }

    const isEdit = !!id;
    const action = isEdit ? 'update' : 'create';
    const urlParams = `?action=${action}${isEdit ? '&id=' + id : ''}`;

    // Bloquejar enviament i mostrar spinner
    isSubmitting = true;
    if (btn) {
        btn.disabled = true;
        btn.classList.add('disabled', 'opacity-75');
        const imageCount = files.length;
        if (imageCount > 0) {
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Guardant i optimitzant ${imageCount} imatge(s)...`;
        } else {
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Guardant...`;
        }
    }

    try {
        const result = await pythonApi.postForm(`/api/admin/aparcaments${urlParams}`, payload);

        if (result.success) {
            const modalEl = document.getElementById('modal-parking');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            loadParkings();
            showBootstrapAlert('success', result.message || 'Aparcament guardat correctament');
        } else {
            showBootstrapAlert('danger', result.error || 'Error en desar l\'aparcament');
        }
    } catch (err) {
        console.error('[ParkLive] Error en guardar aparcament:', err);
        const errorDetail = err.message || 'Error de connexió al servidor';
        showBootstrapAlert('danger', errorDetail);
    } finally {
        // Sempre restaurar el botó i alliberar el bloqueig
        isSubmitting = false;
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('disabled', 'opacity-75');
            btn.innerHTML = originalBtnHtml;
        }
    }
}

/**
 * Neteja el formulari del modal d'aparcaments (inputs, mapa, imatge, validacions).
 * 
 * @returns {void}
 */
function resetForm() {
    const form = document.getElementById('form-parking');
    if (form) {
        form.reset();
        document.getElementById('parking-id').value = '';
        document.getElementById('modal-parking-title').textContent = 'Afegir Aparcament';
    }
    const modalEl = document.getElementById('modal-parking');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

    // Inicialitzar amb coordenades per defecte (Barcelona)
    initAdminMap();

    modal.show();
}

window.editParking = function (p) {
    const form = document.getElementById('form-parking');
    if (!form) return;

    // Reset modal state
    form.reset();
    document.getElementById('parking-id').value = p.id;
    document.getElementById('modal-parking-title').textContent = 'Editar Aparcament';

    // Omplir camps
    Object.keys(p).forEach(key => {
        const input = form.querySelector(`[name="${key}"]`);
        if (input && input.type !== 'checkbox' && input.type !== 'file') {
            input.value = p[key] || '';
        }
    });

    // Checkboxes
    form.querySelector('[name="obert_24h"]').checked = !!parseInt(p.obert_24h);
    form.querySelector('[name="accessibilitat"]').checked = !!parseInt(p.accessibilitat);
    form.querySelector('[name="carrega_electrica"]').checked = !!parseInt(p.carrega_electrica);
    form.querySelector('[name="videovigilancia"]').checked = !!parseInt(p.videovigilancia);
    form.querySelector('[name="verificat"]').checked = !!parseInt(p.verificat);

    // Activar/Desactivar horaris segons estat 24h
    const hObertura = form.querySelector('[name="horari_obertura"]');
    const hTancament = form.querySelector('[name="horari_tancament"]');
    if (form.querySelector('[name="obert_24h"]').checked) {
        hObertura.disabled = true;
        hTancament.disabled = true;
        hObertura.classList.add('bg-light');
        hTancament.classList.add('bg-light');
    } else {
        hObertura.disabled = false;
        hTancament.disabled = false;
        hObertura.classList.remove('bg-light');
        hTancament.classList.remove('bg-light');
    }

    document.getElementById('parking-id').value = p.id;
    document.getElementById('modal-parking-title').textContent = 'Editar Aparcament';

    form.querySelector('[name="nom"]').value = p.nom;
    form.querySelector('[name="tipus"]').value = p.tipus;
    form.querySelector('[name="adreca"]').value = p.adreca;
    form.querySelector('[name="ciutat"]').value = p.ciutat;
    form.querySelector('[name="codi_postal"]').value = p.codi_postal || '';

    // Configurar mapa
    initAdminMap(p.latitud, p.longitud);

    form.querySelector('[name="capacitat_total"]').value = p.capacitat_total;
    form.querySelector('[name="tarifa_hora"]').value = p.tarifa_hora || '';
    form.querySelector('[name="tarifa_dia"]').value = p.tarifa_dia || '';
    form.querySelector('[name="estat"]').value = p.estat;
    form.querySelector('[name="horari_obertura"]').value = p.horari_obertura || '';
    form.querySelector('[name="horari_tancament"]').value = p.horari_tancament || '';

    form.querySelector('[name="obert_24h"]').checked = !!parseInt(p.obert_24h);
    form.querySelector('[name="accessibilitat"]').checked = !!parseInt(p.accessibilitat);
    form.querySelector('[name="carrega_electrica"]').checked = !!parseInt(p.carrega_electrica);
    form.querySelector('[name="videovigilancia"]').checked = !!parseInt(p.videovigilancia);
    form.querySelector('[name="verificat"]').checked = !!parseInt(p.verificat);

    const modalEl = document.getElementById('modal-parking');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
};

window.deleteParking = function (id) {
    const modalEl = document.getElementById('modal-delete-parking');
    document.getElementById('delete-parking-id').value = id;
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
};

/**
 * Executa la petició HTTP per esborrar un aparcament.
 * 
 * @param {number|string} id - Identificador de l'aparcament.
 * @returns {Promise<void>}
 */
async function performDelete(id) {
    try {
        const result = await pythonApi.post(`/api/admin/aparcaments?action=delete&id=${id}`, {});

        if (result.success) {
            loadParkings();
            showBootstrapAlert('success', result.message || 'Aparcament eliminat correctament');
        } else {
            showBootstrapAlert('danger', result.error || 'Error al eliminar l\'aparcament');
        }
    } catch (error) {
        console.error('Error al eliminar aparcament:', error);
        showBootstrapAlert('danger', 'Error de connexió');
    }
}

/**
 * Executa una funció amb retard (debounce) per evitar l'excés de peticions en cercar.
 * 
 * @param {Function} func - Funció a executar.
 * @param {number} wait - Retard en mil·lisegons.
 * @returns {Function} La funció embolcallada (debounced).
 */
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
