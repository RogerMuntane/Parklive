/**
 * ParkLive – profile-admin.controller.js
 * 
 * Gestiona el CRUD d'usuaris per a administradors.
 */

import { PHP_API_URL } from '../config.js';
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

async function loadUsers() {
    const tableBody = document.getElementById('users-table-body');
    const searchTerm = document.getElementById('user-search')?.value || '';
    const roleFilter = document.getElementById('filter-role')?.value || '';

    if (!tableBody) return;

    try {
        const response = await fetch(`${PHP_API_URL}/controllers/AdminUserController.php?search=${encodeURIComponent(searchTerm)}`, {
            credentials: 'include'
        });
        const result = await response.json();

        if (result.success) {
            let users = result.data;

            // Filtre local per rol (si no està implementat al backend)
            if (roleFilter) {
                users = users.filter(u => u.tipus_usuari === roleFilter);
            }

            renderUsers(users);
        } else {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">${result.error || 'Error al carregar usuaris'}</td></tr>`;
        }
    } catch (err) {
        console.error('[ParkLive] Error carregant usuaris:', err);
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Error de connexió</td></tr>`;
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
            ? `<img src="${PHP_API_URL}/uploads/profiles/${user.foto_perfil}" alt="Avatar" class="w-100 h-100 object-fit-cover">`
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

async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const id = formData.get('user-id');
    const data = Object.fromEntries(formData.entries());

    const isEdit = !!id;
    const action = isEdit ? 'update' : 'create';
    const url = `${PHP_API_URL}/controllers/AdminUserController.php?action=${action}${isEdit ? '&id=' + id : ''}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        const result = await response.json();

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

    form.querySelector('[name="nom"]').value = nom;
    form.querySelector('[name="cognoms"]').value = cognoms;
    form.querySelector('[name="email"]').value = email;
    form.querySelector('[name="telefon"]').value = (telefon === 'null' ? '' : telefon);
    form.querySelector('[name="rol"]').value = rol;
    form.querySelector('[name="estat"]').value = estat;
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
        const response = await fetch(`${PHP_API_URL}/controllers/AdminUserController.php?action=delete&id=${id}`, {
            method: 'POST',
            credentials: 'include'
        });
        const result = await response.json();

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
