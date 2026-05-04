/**
 * ParkLive – profile.controller.js
 * Controlador per funcionalitats del perfil d'usuari (canvi de contrasenya)
 */

import { hideAllAlerts, setFormLoading, showBootstrapAlert, formatDate, formatCurrency, getUserId } from '../utils.js';
import { obtenirReservesUsuari } from './reserves.controller.js';
import { PHP_API_URL } from '../config.js';
import { pythonApi, phpApi } from '../api.js';


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
      const data = await phpApi.post('/api/profile/password', {
        contrasenya_actual,
        contrasenya_nova,
        contrasenya_confirmar
      });
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
      console.error('[ParkLive] Error canvi contrasenya:', err);
      if (err.message && err.message.includes('token d\'autenticació ha caducat')) {
        showBootstrapAlert('warning', '<strong>Sessió caducada</strong><br>La teva sessió ha finalitzat per seguretat. Torna a iniciar sessió per canviar la contrasenya.', document.body);
      } else {
        showBootstrapAlert('danger', 'Error de xarxa o servidor al canviar la contrasenya.', section);
      }
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

    // Mostrar imatge de perfil si existeix
    if (sessionData.foto_perfil) {
      const avatarContainer = document.getElementById('profile-avatar-container');
      if (avatarContainer) {
        const imageUrl = `${PHP_API_URL}/uploads/profiles/${sessionData.foto_perfil}`;
        avatarContainer.innerHTML = `<img src="${imageUrl}" alt="Avatar" class="w-100 h-100 object-fit-cover">`;
      }
    }
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
    } catch (_) { }

    const body = new URLSearchParams({ nom, cognom, email, telefon });
    if (userId) body.append('user_id', userId);

    try {
      const data = await phpApi.post('/api/profile', {
        nom,
        cognom,
        email,
        telefon,
        user_id: userId
      });

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
        } catch (_) { }

        showBootstrapAlert('success', data.message || 'Canvis desats correctament.', section);
      } else {
        const errMsg = (data.errors && data.errors.join('<br>')) || data.error || 'Error en desar els canvis.';
        showBootstrapAlert('danger', errMsg, section);
      }
    } catch (err) {
      console.error('[ParkLive] Error desant dades personals:', err);
      if (err.message && err.message.includes('token d\'autenticació ha caducat')) {
        showBootstrapAlert('warning', '<strong>Sessió caducada</strong><br>La teva sessió ha finalitzat per seguretat. Torna a iniciar sessió per desar els canvis.', document.body);
      } else {
        showBootstrapAlert('danger', 'Error de xarxa o servidor al desar les dades.', section);
      }
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
  } catch (_) { }

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
  } catch (_) { }

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
        } else {
          showBootstrapAlert('success', newState ? 'Renovació automàtica activada correctament.' : 'Renovació automàtica desactivada correctament.', planSection);
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
      } catch (_) { }

      showBootstrapAlert('success', 'Pla actualitzat a Premium! Gaudeix dels avantatges.', planSection);
      setTimeout(() => window.location.reload(), 1500);
    } else {
      showBootstrapAlert('danger', 'Error en processar la subscripció: ' + result.error, planSection);
    }

    btnUpdate.disabled = false;
    btnUpdate.innerHTML = originalText;
  });
}


/**
 * Inicialitza l'historial de reserves del perfil
 */
export function initProfileHistorySection() {
  const tableBody = document.getElementById('history-table-body');
  const searchInput = document.getElementById('input-search-history');
  const statusSelect = document.getElementById('select-status-history');
  const searchBtn = document.getElementById('btn-search-history-submit');
  const paginationContainer = document.getElementById('history-pagination-container');

  if (!tableBody) return;

  let currentPage = 1;
  let currentSearch = '';
  const limit = 5;

  const renderPagination = (paginacio) => {
    if (!paginationContainer) return;
    if (!paginacio || paginacio.total_pagines <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    const isPrevDisabled = paginacio.pagina_actual === 1;
    const isNextDisabled = paginacio.pagina_actual === paginacio.total_pagines;

    // Generar ítems de pàgina numerats
    let pagesHtml = '';
    for (let i = 1; i <= paginacio.total_pagines; i++) {
      const isActive = i === paginacio.pagina_actual;
      pagesHtml += `
                <li class="page-item ${isActive ? 'active' : ''}">
                    <button class="page-link" data-page="${i}" ${isActive ? 'aria-current="page"' : ''}>
                        ${i}
                    </button>
                </li>`;
    }

    // Estructura Bootstrap <ul class="pagination">
    paginationContainer.innerHTML = `
            <nav aria-label="Navegació historial de reserves">
                <ul class="pagination pagination-sm mb-0">
                    <li class="page-item ${isPrevDisabled ? 'disabled' : ''}">
                        <button class="page-link" data-page="${paginacio.pagina_actual - 1}"
                            ${isPrevDisabled ? 'disabled aria-disabled="true"' : ''}
                            aria-label="Pàgina anterior">
                            <i class="bi bi-chevron-left"></i>
                        </button>
                    </li>
                    ${pagesHtml}
                    <li class="page-item ${isNextDisabled ? 'disabled' : ''}">
                        <button class="page-link" data-page="${paginacio.pagina_actual + 1}"
                            ${isNextDisabled ? 'disabled aria-disabled="true"' : ''}
                            aria-label="Pàgina següent">
                            <i class="bi bi-chevron-right"></i>
                        </button>
                    </li>
                </ul>
            </nav>
        `;

    // Afegir esdeveniments (només als botons no deshabitats)
    paginationContainer.querySelectorAll('button[data-page]:not([disabled])').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const newPage = parseInt(btn.dataset.page);
        if (newPage && newPage !== currentPage && newPage > 0 && newPage <= paginacio.total_pagines) {
          currentPage = newPage;
          fetchHistory();
        }
      });
    });
  };

  const fetchHistory = async () => {
    tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5 text-muted">
                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    Carregant historial...
                </td>
            </tr>`;

    try {
      const userId = getUserId();
      if (!userId) return;

      const offset = (currentPage - 1) * limit;

      // Agafem l'estat del select o per defecte els d'historial
      const estatFiltre = statusSelect ? statusSelect.value : 'completada,cancelada';

      const params = {
        estat: estatFiltre,
        limit: limit,
        offset: offset,
        returnFullData: true
      };

      if (currentSearch.trim() !== '') {
        params.search = currentSearch.trim();
      }

      const data = await obtenirReservesUsuari(params);
      const reserves = data.reserves || [];

      renderPagination(data.paginacio);

      if (reserves.length === 0) {
        tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center py-5 text-muted">
                            <i class="bi bi-info-circle me-1"></i> No s'han trobat reserves a l'historial.
                        </td>
                    </tr>`;
        return;
      }

      // Renderitzar files
      tableBody.innerHTML = reserves.map(r => {
        const dataFmt = formatDate(r.data_entrada);
        const desc = `Aparcament – ${r.aparcament?.nom || 'Pàrquing'}`;
        const preu = formatCurrency(r.preu_total);

        const estat = (r.estat || '').toLowerCase();
        let badgeClass = 'bg-secondary';
        let labelText = 'Desconegut';
        let icon = 'bi-question-circle';
        let potVeureTiquet = false;

        if (estat === 'completada') {
          badgeClass = 'status-ok';
          labelText = 'Completat';
          icon = 'bi-check-circle-fill';
          potVeureTiquet = true;
        } else if (estat === 'cancelada') {
          badgeClass = 'status-err';
          labelText = 'Cancel·lat';
          icon = 'bi-x-circle-fill';
          potVeureTiquet = false;
        }

        return `
                    <tr>
                        <td class="text-body-secondary small">${dataFmt}</td>
                        <td class="fw-medium">${desc}</td>
                        <td><span class="badge bg-light text-dark border px-2 py-1">${preu}</span></td>
                        <td>
                            <span class="status-badge ${badgeClass}">
                                <i class="bi ${icon}"></i> ${labelText}
                            </span>
                        </td>
                        <td class="text-end">
                            ${potVeureTiquet ?
            `<a href="/tiquet_Aparcament.html?id=${r.id}" class="btn btn-outline-primary btn-sm rounded-pill px-3" title="Veure tiquet PDF">
                                    <i class="bi bi-file-earmark-pdf me-1"></i> PDF
                                 </a>` :
            `<button class="btn btn-outline-secondary btn-sm rounded-pill px-3 opacity-25" disabled title="Tiquet no disponible">
                                    <i class="bi bi-file-earmark-pdf me-1"></i> PDF
                                 </button>`
          }
                        </td>
                    </tr>`;
      }).join('');

    } catch (err) {
      console.error('[ParkLive] Error carregant historial:', err);

      // Error personalitzat per sessió caducada (més amigable per l'usuari)
      if (err.message && err.message.includes('token d\'autenticació ha caducat')) {
        showBootstrapAlert('warning', '<strong>Sessió caducada</strong><br>La teva sessió ha finalitzat per seguretat. Torna a iniciar sessió per veure el teu historial.', document.body);
        tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-5 text-warning">
                        <i class="bi bi-clock-history me-1"></i> La sessió ha caducat. Torna a iniciar sessió.
                    </td>
                </tr>`;
      } else {
        tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-5 text-danger">
                        <i class="bi bi-exclamation-triangle me-1"></i> Error al carregar les dades.
                    </td>
                </tr>`;
      }
      if (paginationContainer) paginationContainer.innerHTML = '';
    }
  };

  // Events de cerca
  const performSearch = () => {
    if (searchInput) currentSearch = searchInput.value;
    currentPage = 1;
    fetchHistory();
  };

  if (searchBtn) {
    searchBtn.addEventListener('click', performSearch);
  }

  if (searchInput) {
    searchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') performSearch();
    });
  }

  // Càrrega inicial
  fetchHistory();
}

/**
 * Inicialitza la secció de favorits del perfil
 */
export async function initProfileFavoritesSection() {
  const listEl = document.getElementById('favorites-list');
  if (!listEl) return;

  const userId = getUserId();
  if (!userId) {
    listEl.innerHTML = `
      <div class="text-center py-4 text-muted">
        <i class="bi bi-person-lock fs-4 d-block mb-2"></i>
        Inicia sessió per veure els teus favorits.
      </div>
    `;
    return;
  }

  const renderEmpty = () => {
    listEl.innerHTML = `
      <div class="text-center py-4 text-muted border rounded-3">
        <i class="bi bi-heart fs-4 d-block mb-2"></i>
        Encara no tens aparcaments favorits.
      </div>
    `;
  };

  const renderItems = (items) => {
    if (!Array.isArray(items) || items.length === 0) {
      renderEmpty();
      return;
    }

    listEl.innerHTML = '';
    const fragment = document.createDocumentFragment();

    items.forEach((item) => {
      const parkingId = String(item.id || '');
      const article = document.createElement('article');
      article.className = 'border rounded-3 p-3 bg-body';

      const nom = item.nom || 'Aparcament';
      const adreca = [item.adreca, item.ciutat].filter(Boolean).join(', ') || 'Adreça no disponible';
      const tarifaHora = (item.tarifa_hora === null || item.tarifa_hora === undefined)
        ? 'Tarifa no disponible'
        : `${Number(item.tarifa_hora).toFixed(2).replace('.', ',')} €/h`;

      article.innerHTML = `
        <div class="d-flex justify-content-between align-items-start gap-3">
          <div class="min-w-0">
            <h3 class="h6 fw-bold mb-1 text-truncate">${nom}</h3>
            <p class="small text-body-secondary mb-1">${adreca}</p>
            <p class="small mb-0">${tarifaHora}</p>
          </div>
          <div class="d-flex align-items-center gap-2">
            <a class="btn btn-outline-secondary btn-sm" href="/detall_Aparcament.html?id=${encodeURIComponent(parkingId)}">
              Veure
            </a>
            <button
              type="button"
              class="btn btn-outline-danger btn-sm"
              data-action="remove-favorite"
              data-parking-id="${parkingId}"
              aria-label="Eliminar de favorits"
            >
              <i class="bi bi-heartbreak"></i>
            </button>
          </div>
        </div>
      `;

      fragment.appendChild(article);
    });

    listEl.appendChild(fragment);

    listEl.querySelectorAll('[data-action="remove-favorite"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const parkingId = btn.dataset.parkingId;
        if (!parkingId) return;

        btn.disabled = true;
        try {
          await pythonApi.delete(`/api/usuari/favorits/${encodeURIComponent(parkingId)}?usuari_id=${encodeURIComponent(String(userId))}`);
          await loadFavorites();
          showBootstrapAlert('success', 'Aparcament eliminat de favorits.');
        } catch (error) {
          showBootstrapAlert('danger', error?.message || 'No s\'ha pogut eliminar el favorit.');
          btn.disabled = false;
        }
      });
    });
  };

  const loadFavorites = async () => {
    try {
      const response = await pythonApi.get('/api/usuari/favorits', {
        usuari_id: userId,
        limit: 200,
        offset: 0,
      });
      renderItems(response?.favorits || []);
    } catch (error) {
      console.error('[ParkLive] Error carregant favorits del perfil:', error);

      if (error.message && error.message.includes('token d\'autenticació ha caducat')) {
        showBootstrapAlert('warning', '<strong>Sessió caducada</strong><br>La teva sessió ha finalitzat per seguretat. Torna a iniciar sessió per veure els teus favorits.', document.body);
        listEl.innerHTML = `
          <div class="alert alert-warning mb-0" role="alert">
            <i class="bi bi-clock-history me-1"></i> La sessió ha caducat. Torna a iniciar sessió.
          </div>
        `;
      } else {
        listEl.innerHTML = `
          <div class="alert alert-danger mb-0" role="alert">
            No s'han pogut carregar els favorits.
          </div>
        `;
      }
    }
  };

  await loadFavorites();
}

/**
 * Inicialitza la càrrega d'imatge de perfil
 */
export function initProfileImageUpload() {
  const uploadInput = document.getElementById('profile-upload-input');
  const uploadBtn = document.getElementById('btn-upload-avatar');
  const avatarContainer = document.getElementById('profile-avatar-container');
  const sidebarAvatarContainer = document.getElementById('sidebar-avatar-container');

  if (!uploadInput || !uploadBtn || !avatarContainer) return;

  uploadBtn.addEventListener('click', () => uploadInput.click());

  uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validació client
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showBootstrapAlert('danger', 'Tipus de fitxer no permès. Només JPG, PNG i WebP.', avatarContainer.closest('.card-body'));
      return;
    }
    if (file['size'] > 2 * 1024 * 1024) {
      showBootstrapAlert('danger', 'La imatge és massa gran. Màxim 2MB.', avatarContainer.closest('.card-body'));
      return;
    }

    const formData = new FormData();
    formData.append('profile_image', file);

    // Obtenir user_id del sessionStorage (necessari per OAuth)
    let userId = null;
    try {
      const raw = sessionStorage.getItem('parklive_user_data');
      if (raw) userId = JSON.parse(raw)?.id;
    } catch (_) { }
    if (userId) formData.append('user_id', userId);

    uploadBtn.disabled = true;
    const originalContent = uploadBtn.innerHTML;
    uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Pujant…';

    try {
      const data = await phpApi.postForm('/api/profile/picture', formData);

      if (data.success) {
        const imageUrl = `${PHP_API_URL}/uploads/profiles/${data.foto_perfil}`;

        // Actualitzar imatges a la UI
        const imgHtml = `<img src="${imageUrl}" alt="Avatar" class="w-100 h-100 object-fit-cover">`;
        avatarContainer.innerHTML = imgHtml;
        if (sidebarAvatarContainer) sidebarAvatarContainer.innerHTML = imgHtml;

        // Actualitzar sessionStorage
        try {
          const raw = sessionStorage.getItem('parklive_user_data');
          const userData = raw ? JSON.parse(raw) : {};
          userData.foto_perfil = data.foto_perfil;
          sessionStorage.setItem('parklive_user_data', JSON.stringify(userData));
        } catch (_) { }

        showBootstrapAlert('success', 'Imatge de perfil actualitzada.', avatarContainer.closest('.card-body'));
      } else {
        showBootstrapAlert('danger', data.error || 'Error al pujar la imatge.', avatarContainer.closest('.card-body'));
      }
    } catch (err) {
      console.error('[ParkLive] Error al pujar imatge:', err);
      if (err.message && err.message.includes('token d\'autenticació ha caducat')) {
        showBootstrapAlert('warning', '<strong>Sessió caducada</strong><br>La teva sessió ha finalitzat per seguretat. Torna a iniciar sessió per pujar la imatge.', document.body);
      } else {
        showBootstrapAlert('danger', 'Error de xarxa al pujar la imatge.', avatarContainer.closest('.card-body'));
      }
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = originalContent;
      uploadInput.value = '';
    }
  });
}
