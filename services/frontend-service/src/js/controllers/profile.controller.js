/**
 * ParkLive – profile.controller.js
 * Controlador per funcionalitats del perfil d'usuari (canvi de contrasenya)
 */

import { hideAllAlerts, setFormLoading, showBootstrapAlert } from '../utils.js';
import { PHP_API_URL } from '../config.js';


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
  const strengthLabel = document.getElementById('strength-label');

  if (!actual || !nova || !confirm || !btn || !section) return;

  // Lògica del mesurador de força (Segments i Requisits)
  if (nova) {
    nova.addEventListener('input', (e) => {
      const val = e.target.value;
      const segments = document.querySelectorAll('#strength-segments .strength-segment');
      const reqLength = document.getElementById('req-length');
      const reqUpper = document.getElementById('req-upper');
      const reqNumber = document.getElementById('req-number');
      const reqSymbol = document.getElementById('req-symbol');

      if (!val) {
        segments.forEach(s => s.className = 'strength-segment');
        if (strengthLabel) {
            strengthLabel.textContent = '--';
            strengthLabel.className = 'small fw-bold text-secondary';
        }
        [reqLength, reqUpper, reqNumber, reqSymbol].forEach(req => {
            if (req) {
                req.classList.remove('met');
                req.querySelector('i').className = 'bi bi-circle';
            }
        });
        return;
      }

      // 1. Verificar requisits individuals
      const isLength = val.length >= 8;
      const isUpper = /[A-Z]/.test(val);
      const isNumber = /[0-9]/.test(val);
      const isSymbol = /[^A-Za-z0-9]/.test(val);

      const updateReq = (el, met) => {
        if (!el) return;
        if (met) {
          el.classList.add('met');
          el.querySelector('i').className = 'bi bi-check-circle-fill';
        } else {
          el.classList.remove('met');
          el.querySelector('i').className = 'bi bi-circle';
        }
      };

      updateReq(reqLength, isLength);
      updateReq(reqUpper, isUpper);
      updateReq(reqNumber, isNumber);
      updateReq(reqSymbol, isSymbol);

      // 2. Calcular puntuació (0-4)
      let score = 0;
      if (isLength) score++;
      if (isUpper) score++;
      if (isNumber) score++;
      if (isSymbol) score++;

      // 3. Actualitzar segments i label
      let colorClass = '';
      let text = '';
      if (score === 1) { colorClass = 'weak'; text = 'Feble'; }
      else if (score === 2) { colorClass = 'medium'; text = 'Mitjana'; }
      else if (score === 3) { colorClass = 'strong'; text = 'Forta'; }
      else if (score === 4) { colorClass = 'expert'; text = 'Excel·lent'; }

      segments.forEach((s, idx) => {
        s.className = 'strength-segment';
        if (idx < score) {
          s.classList.add('active', colorClass);
        }
      });

      if (strengthLabel) {
        strengthLabel.textContent = text;
        strengthLabel.className = `small fw-bold text-${(colorClass === 'strong') ? 'warning' : (colorClass === 'expert' ? 'success' : 'danger')}`;
        if (colorClass === 'medium') strengthLabel.classList.replace('text-danger', 'text-warning');
      }
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

  // Botó Cancel·lar
  const btnCancel = document.getElementById('btn-cancel-password');
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      actual.value = nova.value = confirm.value = '';
      // Reset targets/requisits
      nova.dispatchEvent(new Event('input'));
    });
  }
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

/**
 * Inicialitza la secció de Mètodes de Pagament
 */
export async function initProfilePaymentSection() {
    const section = document.getElementById('section-payment');
    if (!section) return;

    let user = null;
    try {
        const raw = sessionStorage.getItem('parklive_user_data');
        if (raw) user = JSON.parse(raw);
    } catch (_) {}

    if (!user || !user.id) return;

    const { initProfilePaymentSection: initStripePayment } = await import('./stripe.controller.js');
    initStripePayment(user.id);
}

/**
 * Inicialitza la secció de Gestió del Pla
 */
export async function initProfilePlanSection() {
  const btnUpdate = document.getElementById('btn-update-plan');
  const btnAddCardPlan = document.getElementById('btn-add-card-plan');
  const planSection = document.getElementById('section-plan');

  if (!btnUpdate || !planSection) return;

  // Obtenir user_id
  let user = null;
  try {
    const raw = sessionStorage.getItem('parklive_user_data');
    if (raw) user = JSON.parse(raw);
  } catch (_) {}

  if (!user || !user.id) return;

  // 1. Carregar les targetes guardades per al pla
  const { loadCardsForPlan, createSubscription, initStripeButton, updateSubscriptionAutorenewal } = await import('./stripe.controller.js');
  try {
      await loadCardsForPlan(user.id);
  } catch (err) {
      console.warn('[ParkLive] No s\'han pogut carregar les targetes:', err);
  }

  // 1.0 Lògica del Switcher Mensual/Anual
  const btnMonthly = document.getElementById('btn-monthly-plan');
  const btnAnnual = document.getElementById('btn-annual-plan');
  let currentPlanType = 'monthly';

  if (btnMonthly && btnAnnual && planSection) {
      console.log('[ParkLive] Inicialitzant switcher de plans');
      const updateSwitcherUI = (type) => {
          currentPlanType = type;
          if (type === 'annual') {
              btnAnnual.classList.add('active');
              btnMonthly.classList.remove('active');
              planSection.classList.add('annual-plan-active');
          } else {
              btnMonthly.classList.add('active');
              btnAnnual.classList.remove('active');
              planSection.classList.remove('annual-plan-active');
          }
          console.log('[ParkLive] Pla canviat a:', type);
      };

      btnMonthly.addEventListener('click', (e) => {
          e.preventDefault();
          updateSwitcherUI('monthly');
      });
      btnAnnual.addEventListener('click', (e) => {
          e.preventDefault();
          updateSwitcherUI('annual');
      });
      
      // Forçar estat inicial per si de cas
      updateSwitcherUI('monthly');
  } else {
      console.warn('[ParkLive] No s\'han trobat els elements del switcher:', { btnMonthly: !!btnMonthly, btnAnnual: !!btnAnnual, planSection: !!planSection });
  }

  // 1.1 Lògica del nou Toggle de Renovació Automàtica
  const toggleCard = document.getElementById('autorenovacio-toggle');
  const toggleSwitch = document.getElementById('autorenovacio-switch');
  const toggleCheckbox = document.getElementById('autorenovacio');
  const toggleBadge = document.getElementById('autorenovacio-badge');
  const toggleDesc = document.getElementById('autorenovacio-desc');

  if (toggleCard && toggleSwitch && toggleCheckbox) {
      // Inicialitzar estat segons checkbox (per si ve marcat per defecte o per la BD)
      const updateToggleUI = (isActive) => {
          if (isActive) {
              toggleCard.classList.add('active');
              toggleSwitch.classList.add('on');
              toggleBadge.textContent = 'Actiu';
              toggleBadge.className = 'toggle-badge';
              toggleDesc.textContent = "S'utilitzarà la targeta seleccionada per als cobraments futurs.";
          } else {
              toggleCard.classList.remove('active');
              toggleSwitch.classList.remove('on');
              toggleBadge.textContent = 'Desactivat';
              toggleBadge.className = 'toggle-badge bg-secondary bg-opacity-10 text-secondary';
              toggleDesc.textContent = "La subscripció es cancel·larà al final del període actual.";
          }
      };

      toggleCard.addEventListener('click', async () => {
          const newState = !toggleCheckbox.checked;
          toggleCheckbox.checked = newState;
          updateToggleUI(newState);

          // Si l'usuari ja és premium, sincronitzem en temps real amb Stripe
          if (user.tipus_usuari === 'premium') {
              toggleCard.style.pointerEvents = 'none';
              toggleCard.style.opacity = '0.7';
              
              const result = await updateSubscriptionAutorenewal(user.id, newState);
              
              toggleCard.style.pointerEvents = 'auto';
              toggleCard.style.opacity = '1';

              if (!result.success) {
                  // Revertir si falla
                  toggleCheckbox.checked = !newState;
                  updateToggleUI(!newState);
                  showBootstrapAlert('danger', 'No s\'ha pogut actualitzar la renovació a Stripe.', planSection);
              }
          }
      });
  }

  // 2. Vincular botó d'afegir targeta (obre el modal existent)
  if (btnAddCardPlan) {
    btnAddCardPlan.addEventListener('click', () => {
      // Re-utilitzem el botó amagat o directament el modal de profile-payment si està carregat
      const realBtnAdd = document.getElementById('btn-add-card');
      if (realBtnAdd) {
        realBtnAdd.click();
      } else {
        // Si no està el botó, inicialitzem el modal i el mostrem.
        // Nota: addCardModal s'ha de carregar si s'inclou profile-payment.html
        initStripeButton(user.id);
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('addCardModal'));
        modal.show();
      }
    });

    // Escoltarem quan es tanqui el modal per recarregar les targetes del pla
    const modalEl = document.getElementById('addCardModal');
    if (modalEl) {
      modalEl.addEventListener('hidden.bs.modal', () => {
        loadCardsForPlan(user.id);
      });
    }
  }

  // 3. Lògica d'actualització del pla
  btnUpdate.addEventListener('click', async () => {
    const selectedCard = document.querySelector('input[name="plan-card"]:checked');
    
    // Si no hi ha targeta seleccionada, demanem afegir-ne una
    if (!selectedCard) {
      if (btnAddCardPlan) {
        btnAddCardPlan.click();
      } else {
        showBootstrapAlert('warning', 'Si us plau, afegeix un mètode de pagament primer.', planSection);
      }
      return;
    }

    btnUpdate.disabled = true;
    const originalText = btnUpdate.innerHTML;
    btnUpdate.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Processant...';

    const autorenovacio = document.getElementById('autorenovacio')?.checked ?? true;
    const result = await createSubscription(user.id, selectedCard.value, autorenovacio, currentPlanType);

    if (result.success) {
      // Actualitzar sessionStorage
      try {
        const raw = sessionStorage.getItem('parklive_user_data');
        if (raw) {
          const userData = JSON.parse(raw);
          userData.tipus_usuari = 'premium';
          sessionStorage.setItem('parklive_user_data', JSON.stringify(userData));
        }
      } catch (_) {}

      showBootstrapAlert('success', 'Pla actualitzat a Premium! Gaudeix dels avantatges.', planSection);
      setTimeout(() => window.location.reload(), 1500);
    } else {
      showBootstrapAlert('danger', 'Error en processar la subscripció: ' + result.error, planSection);
    }

    btnUpdate.disabled = false;
    btnUpdate.innerHTML = originalText;
  });
}

