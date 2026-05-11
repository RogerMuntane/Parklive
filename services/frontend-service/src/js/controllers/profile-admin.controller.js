/**
 * ParkLive – profile-admin.controller.js
 * 
 * Gestiona el CRUD d'usuaris per a administradors.
 */

import { PHP_API_URL } from '../config.js';
import { phpApi } from '../api.js';
import { showBootstrapAlert } from '../utils.js';

export function initAdminUserCRUD() {
    const section = document.getElementById('section-admin-users');
    if (!section) return;

    loadUsers();

    // Event listeners
    document.getElementById('btn-refresh-users')?.addEventListener('click', loadUsers);
    document.getElementById('user-search')?.addEventListener('input', debounce(loadUsers, 500));
    document.getElementById('filter-role')?.addEventListener('change', loadUsers);
    document.getElementById('form-user')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('btn-add-user')?.addEventListener('click', resetForm);

    ['modal-user', 'modal-delete-user'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.parentElement !== document.body) {
            document.body.appendChild(el);
        }
    });

    document.getElementById('btn-confirm-delete')?.addEventListener('click', async () => {
        const id = document.getElementById('delete-user-id').value;
        const btn = document.getElementById('btn-confirm-delete');

        btn.disabled = true;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Eliminant...';

        await performDelete(id);

        btn.disabled = false;
        btn.innerHTML = originalHTML;

        const modalEl = document.getElementById('modal-delete-user');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    });
}

let currentPage = 1;

async function loadUsers(page = 1) {
    currentPage = page;
    const tableBody = document.getElementById('users-table-body');
    const searchTerm = document.getElementById('user-search')?.value || '';
    const roleFilter = document.getElementById('filter-role')?.value || '';

    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregant...</span></div></td></tr>`;

    try {
        const result = await phpApi.get('/api/admin/users', {
            search: searchTerm,
            role: roleFilter,
            page: currentPage,
            limit: 10
        });

        if (result.success) {
            renderUsers(result.data);
            if (result.pagination) {
                renderPagination(result.pagination);
            }
        } else {
            console.warn('[ParkLive] Error d\'API:', result.error);
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">${result.error || 'Error al carregar usuaris'}</td></tr>`;
            document.getElementById('users-pagination').innerHTML = '';
        }
    } catch (err) {
        console.error('[ParkLive] Error de connexió o de parseig JSON:', err);
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Error de connexió (Veure consola)</td></tr>`;
        document.getElementById('users-pagination').innerHTML = '';
    }
}

function renderUsers(users) {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) return;

    if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No s\'han trobat usuaris</td></tr>';
        return;
    }

    tableBody.innerHTML = users.map(user => `
        <tr>
            <td class="ps-3">
                <div class="d-flex align-items-center gap-3">
                    <div class="bg-light rounded-circle d-flex align-items-center justify-content-center overflow-hidden" style="width: 38px; height: 38px;">
                        ${user.foto_perfil
            ? `<img src="${PHP_API_URL}/storage/profiles/${user.foto_perfil}" alt="Avatar" class="w-100 h-100 object-fit-cover">`
            : `<i class="bi bi-person text-secondary"></i>`
        }
                    </div>
                    <div>
                        <div class="fw-bold">${user.nom} ${user.cognoms}</div>
                        <div class="text-secondary small">ID: #${user.id}</div>
                    </div>
                </div>
            </td>
            <td class="small">${user.email}</td>
            <td class="small">${user.telefon || '-'}</td>
            <td>
                <span class="badge rounded-pill px-2 py-1 x-small fw-medium badge-${user.tipus_usuari}">
                    ${user.tipus_usuari.toUpperCase()}
                </span>
            </td>
            <td>
                <span class="badge rounded-pill px-2 py-1 x-small fw-medium badge-${user.estat}">
                    ${user.estat.toUpperCase()}
                </span>
            </td>
            <td class="text-end pe-3">
                <button class="btn btn-sm btn-outline-primary border-0 me-1" onclick="editUser(${user.id}, '${user.nom}', '${user.cognoms}', '${user.email}', '${user.telefon}', '${user.tipus_usuari}', '${user.estat}')" title="Editar usuari">
                    <i class="bi bi-pencil"></i>
                </button>
                ${user.tipus_usuari !== 'admin'
                    ? `<button class="btn btn-sm btn-outline-danger border-0" onclick="deleteUser(${user.id})" title="Eliminar usuari">
                        <i class="bi bi-trash"></i>
                       </button>`
                    : `<button class="btn btn-sm btn-outline-secondary border-0 opacity-25" disabled title="No es pot eliminar un administrador">
                        <i class="bi bi-trash"></i>
                       </button>`
                }
            </td>
        </tr>
    `).join('');
}

function renderPagination(pagination) {
    const paginationContainer = document.getElementById('users-pagination');
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
                ${isPrevDisabled ? 'disabled aria-disabled="true"' : ''}
                aria-label="Pàgina anterior">
                <i class="bi bi-chevron-left"></i>
            </button>
        </li>
        ${pagesHtml}
        <li class="page-item ${isNextDisabled ? 'disabled' : ''}">
            <button class="page-link" data-page="${currentPage + 1}"
                ${isNextDisabled ? 'disabled aria-disabled="true"' : ''}
                aria-label="Pàgina següent">
                <i class="bi bi-chevron-right"></i>
            </button>
        </li>
    `;

    // Add event listeners to buttons
    paginationContainer.querySelectorAll('button[data-page]:not([disabled])').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const newPage = parseInt(btn.dataset.page);
            if (newPage && newPage !== currentPage && newPage > 0 && newPage <= totalPages) {
                loadUsers(newPage);
            }
        });
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const id = formData.get('user-id');
    const data = Object.fromEntries(formData.entries());

    const isEdit = !!id;
    const action = isEdit ? 'update' : 'create';
    try {
        const result = await phpApi.post(`/api/admin/users?action=${action}${isEdit ? '&id=' + id : ''}`, data);

        if (result.success) {
            // Tancar modal
            const modalEl = document.getElementById('modal-user');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();

            // Recarregar llista
            loadUsers();
            showBootstrapAlert('success', result.message || 'Usuari guardat correctament');
        } else {
            showBootstrapAlert('danger', result.error || (result.errors && result.errors.join(', ')) || 'Error en desar l\'usuari');
        }
    } catch (err) {
        console.error('[ParkLive] Error en guardar usuari:', err);
    }
}

function resetForm() {
    const form = document.getElementById('form-user');
    if (form) {
        form.reset();
        document.getElementById('user-id').value = '';
        document.getElementById('modal-user-title').textContent = 'Afegir Usuari';
        document.getElementById('password-group').style.display = 'block';
        document.getElementById('estat-group').style.display = 'none';
        form.querySelector('[name="contrasenya"]').required = true;
    }
}

// Exposar funcions al window per a que les cridin els botons de la taula
window.editUser = function (id, nom, cognoms, email, telefon, rol, estat) {
    resetForm();
    const form = document.getElementById('form-user');
    document.getElementById('user-id').value = id;
    document.getElementById('modal-user-title').textContent = 'Editar Usuari';
    document.getElementById('password-group').style.display = 'none';
    document.getElementById('estat-group').style.display = 'block';

    form.querySelector('[name="nom"]').value = nom || '';
    form.querySelector('[name="cognoms"]').value = cognoms || '';
    form.querySelector('[name="email"]').value = email || '';
    form.querySelector('[name="telefon"]').value = (telefon === 'null' || !telefon ? '' : telefon);
    
    // Normalitzar a minúscules per coincidir amb els valors de les <option>
    if (rol) form.querySelector('[name="rol"]').value = rol.toLowerCase();
    if (estat) form.querySelector('[name="estat"]').value = estat.toLowerCase();
    
    form.querySelector('[name="contrasenya"]').required = false;

    const modalEl = document.getElementById('modal-user');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
};

window.deleteUser = function (id) {
    const modalEl = document.getElementById('modal-delete-user');
    document.getElementById('delete-user-id').value = id;
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
};

async function performDelete(id) {
    try {
        const result = await phpApi.post(`/api/admin/users?action=delete&id=${id}`);

        if (result.success) {
            loadUsers();
            showBootstrapAlert('success', result.message || 'Usuari eliminat correctament');
        } else {
            showBootstrapAlert('danger', result.error || 'Error al eliminar l\'usuari');
        }
    } catch (error) {
        console.error('Error al eliminar usuari:', error);
        showBootstrapAlert('danger', 'Error de connexió al servidor');
    }
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
