/**
 * ParkLive – profile.controller.js
 * Controlador per funcionalitats del perfil d'usuari (canvi de contrasenya)
 */

import { hideAllAlerts, setFormLoading } from '../utils.js';
import { PHP_API_URL } from '../config.js';

// Bootstrap-styled alert helper
function showBootstrapAlert(type, message, parent = document.body) {
  hideAllAlerts();
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
  alert.style.zIndex = 9999;
  alert.role = 'alert';
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  parent.appendChild(alert);
  setTimeout(() => {
    alert.classList.remove('show');
    alert.classList.add('hide');
    setTimeout(() => alert.remove(), 500);
  }, 3500);
}

/**
 * Inicialitza el formulari de canvi de contrasenya del perfil
 * Requereix que el HTML tingui els inputs amb id: pass-actual, pass-nova, pass-confirm
 * i un botó amb id: btn-update-password
 */
export function initProfilePasswordForm() {
  const actual = document.getElementById('pass-actual');
  const nova = document.getElementById('pass-nova');
  const confirm = document.getElementById('pass-confirm');
  const btn = document.getElementById('btn-update-password');
  const section = document.getElementById('section-password');
  const strengthFill = document.getElementById('strength-fill');
  const strengthLabel = document.getElementById('strength-label');

  if (!actual || !nova || !confirm || !btn || !section) return;

  // Lògica del mesurador de força de la contrasenya
  if (strengthFill && strengthLabel) {
    nova.addEventListener('input', (e) => {
      const value = e.target.value;
      if (!value) {
        strengthFill.style.width = '0%';
        strengthFill.className = 'strength-fill';
        strengthLabel.textContent = 'Introdueix una contrasenya';
        strengthLabel.className = 'text-secondary mt-1 d-block';
        return;
      }

      let score = 0;
      if (value.length > 7) score++;
      if (value.length > 11) score++;
      if (/[A-Z]/.test(value)) score++;
      if (/[0-9]/.test(value)) score++;
      if (/[^A-Za-z0-9]/.test(value)) score++;

      let width = '0%';
      let colorClass = '';
      let text = '';

      if (score <= 2) {
        width = '30%';
        colorClass = 'bg-danger';
        text = 'Feble';
      } else if (score === 3 || score === 4) {
        width = '50%';
        colorClass = 'bg-warning';
        text = 'Mitjana';
      } else {
        width = '100%';
        colorClass = 'bg-success';
        text = 'Forta';
      }

      strengthFill.style.width = width;
      strengthFill.className = `strength-fill ${colorClass}`;
      strengthLabel.textContent = text;
      strengthLabel.className = `mt-1 d-block text-${colorClass.replace('bg-', '')}`;
    });
  }

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    hideAllAlerts();
    btn.disabled = true;
    setFormLoading(btn, true);

    const contrasenya_actual = actual.value;
    const contrasenya_nova = nova.value;
    const contrasenya_confirmar = confirm.value;

    // Validació bàsica client
    if (!contrasenya_actual || !contrasenya_nova || !contrasenya_confirmar) {
      showBootstrapAlert('danger', 'Tots els camps són obligatoris.', section);
      btn.disabled = false;
      setFormLoading(btn, false);
      return;
    }

    try {
      const res = await fetch(`${PHP_API_URL}/controllers/canvi_contrasenya_perfil.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          contrasenya_actual,
          contrasenya_nova,
          contrasenya_confirmar
        }),
        credentials: 'include' // Envia cookies de sessió PHP
      });
      const data = await res.json();
      if (data.success) {
        showBootstrapAlert('success', data.message || 'Contrasenya actualitzada correctament.', section);
        actual.value = nova.value = confirm.value = '';
      } else {
        showBootstrapAlert('danger', (data.errors && data.errors.join('<br>')) || data.error || 'Error inesperat.', section);
        // Si error OAuth, ocultar secció
        if (data.errors && data.errors.some(e => e.includes('Google') || e.includes('Apple'))) {
          section.style.display = 'none';
        }
      }
    } catch (err) {
      showBootstrapAlert('danger', 'Error de xarxa o servidor.', section);
    } finally {
      btn.disabled = false;
      setFormLoading(btn, false);
    }
  });
}

export async function initProfileInfoForm() {
  const nomInput = document.getElementById('p-nom');
  const cognomsInput = document.getElementById('p-cognoms');
  const emailInput = document.getElementById('p-email');
  const telInput = document.getElementById('p-tel');
  const section = document.getElementById('section-info');

  if (!nomInput || !cognomsInput || !emailInput || !telInput || !section) return;

  // 1. Intentar primer des del sessionStorage (OAuth i login normal)
  let sessionData = null;
  try {
    const raw = sessionStorage.getItem('parklive_user_data');
    if (raw) sessionData = JSON.parse(raw);
  } catch (_) { /* ignore */ }

  if (sessionData) {
    nomInput.value = sessionData.nom || sessionData.given_name || sessionData.name?.split(' ')[0] || '';
    cognomsInput.value = sessionData.cognom || sessionData.cognoms || sessionData.family_name || sessionData.name?.split(' ').slice(1).join(' ') || '';
    emailInput.value = sessionData.email || '';
    telInput.value = sessionData.telefon || sessionData.telefono || '';
    return; // Ja tenim les dades, no cal cridar PHP
  }
}

/**
 * Inicialitza els botons de Desar i Cancel·lar del formulari de dades personals.
 * Envia les dades al PHP i actualitza sessionStorage en cas d'èxit.
 */
export function initProfileInfoSaveForm() {
  const nomInput = document.getElementById('p-nom');
  const cognomsInput = document.getElementById('p-cognoms');
  const emailInput = document.getElementById('p-email');
  const telInput = document.getElementById('p-tel');
  const btnSave = document.getElementById('btn-save-profile');
  const btnCancel = document.getElementById('btn-cancel-profile');
  const section = document.getElementById('section-info');

  if (!nomInput || !cognomsInput || !emailInput || !telInput || !btnSave || !section) return;

  // Guardar valors originals per poder cancel·lar (després d'un petit delay per assegurar-nos que s'han carregat)
  let originalValues = {};
  setTimeout(() => {
    originalValues = {
      nom: nomInput.value,
      cognom: cognomsInput.value,
      email: emailInput.value,
      telefon: telInput.value,
    };
  }, 500);

  // Botó Cancel·lar: restaura els valors originals
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      nomInput.value = originalValues.nom || '';
      cognomsInput.value = originalValues.cognom || '';
      emailInput.value = originalValues.email || '';
      telInput.value = originalValues.telefon || '';
    });
  }

  // Botó Desar
  btnSave.addEventListener('click', async () => {
    const nom = nomInput.value.trim();
    const cognom = cognomsInput.value.trim();
    const email = emailInput.value.trim();
    const telefon = telInput.value.trim();

    // Validació bàsica al client
    if (!nom || !cognom || !email) {
      showBootstrapAlert('danger', 'El nom, cognom i correu electrònic són obligatoris.', section);
      return;
    }

    btnSave.disabled = true;
    const originalText = btnSave.innerHTML;
    btnSave.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Desant…';

    // Obtenir user_id del sessionStorage (necessari per OAuth)
    let userId = null;
    try {
      const raw = sessionStorage.getItem('parklive_user_data');
      if (raw) userId = JSON.parse(raw)?.id;
    } catch (_) {}

    const body = new URLSearchParams({ nom, cognom, email, telefon });
    if (userId) body.append('user_id', userId);

    try {
      const res = await fetch(`${PHP_API_URL}/controllers/update_profile_info.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        credentials: 'include',
      });

      const data = await res.json();

      if (data.success) {
        // Actualitzar sessionStorage amb les noves dades
        try {
          const raw = sessionStorage.getItem('parklive_user_data');
          const userData = raw ? JSON.parse(raw) : {};
          userData.nom = nom;
          userData.cognom = cognom;
          userData.cognoms = cognom;
          userData.email = email;
          userData.telefon = telefon;
          sessionStorage.setItem('parklive_user_data', JSON.stringify(userData));
          
          // Actualitzar originals
          originalValues = { nom, cognom, email, telefon };
        } catch (_) {}

        showBootstrapAlert('success', data.message || 'Canvis desats correctament.', section);
      } else {
        const errMsg = (data.errors && data.errors.join('<br>')) || data.error || 'Error en desar els canvis.';
        showBootstrapAlert('danger', errMsg, section);
      }
    } catch (err) {
      showBootstrapAlert('danger', 'Error de xarxa o servidor.', section);
    } finally {
      btnSave.disabled = false;
      btnSave.innerHTML = originalText;
    }
  });
}

