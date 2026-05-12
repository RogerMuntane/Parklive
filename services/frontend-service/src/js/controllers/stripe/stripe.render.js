/**
 * ParkLive - Stripe Render
 * Gestiona tota la manipulació del DOM i visualització de Stripe.
 */
import { showBootstrapAlert } from '../../utils.js';

/**
 * Formata un timestamp de Stripe (segons) a una cadena de data en català.
 * 
 * @param {number} timestamp - El timestamp Unix (en segons).
 * @param {Object} [options] - Opcions addicionals per a Intl.DateTimeFormat.
 * @returns {string} La data formatada.
 */
export function formatStripeDate(timestamp, options = { day: '2-digit', month: 'long', year: 'numeric' }) {
    if (!timestamp) return '--/--/----';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('ca-ES', options);
}

/**
 * Renderitza la llista de mètodes de pagament en el HTML.
 * 
 * @param {Array} methods - Llista de mètodes de pagament.
 * @param {Function} onDeleteCallback - Callback quan es vol eliminar una targeta.
 */
export function renderPaymentMethods(methods, onDeleteCallback) {
    const container = document.getElementById('payment-methods-container');
    if (!container) return;

    if (!methods.length) {
        container.innerHTML = `<p class="small text-muted text-center py-3">No tens cap targeta guardada.</p>`;
        return;
    }

    let userName = 'ParkLive User';
    try {
        const raw = sessionStorage.getItem('parklive_user_data');
        if (raw) {
            const data = JSON.parse(raw);
            userName = `${data.nom || ''} ${data.cognoms || data.cognom || ''}`.trim() || userName;
        }
    } catch (_) { }

    container.innerHTML = methods.map((m, index) => `
        <div class="col-12 col-xl-6">
            <div class="payment-card-visual h-100 mb-0 ${index === 0 ? 'active-card' : ''}">
                 <div class="card-brand-logo small opacity-75" style="right: 45px !important;">${m.brand}</div>
                 <div class="card-chip mb-3" style="width: 35px; height: 25px;"></div>
                 <div class="card-number mb-3" style="font-size: 1rem; letter-spacing: 0.1em;">
                    •••• •••• •••• ${m.last4}
                 </div>
                 <div class="d-flex justify-content-between align-items-end mt-4">
                    <div class="overflow-hidden me-2">
                        <div class="card-label">Titular</div>
                        <div class="card-value small text-truncate" style="max-width: 100px;">${userName}</div>
                    </div>
                    <div class="text-end">
                        <div class="card-label">Caduca</div>
                        <div class="card-value small">${m.exp_month}/${m.exp_year.toString().slice(-2)}</div>
                    </div>
                 </div>
                 <button class="btn btn-sm btn-link text-white position-absolute top-0 end-0 m-2
                                opacity-50 btn-delete-card p-1" data-id="${m.id}" title="Eliminar targeta"
                                style="z-index: 5;">
                    <i class="bi bi-x-circle fs-5"></i>
                </button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.btn-delete-card').forEach(btn => {
        btn.addEventListener('click', () => onDeleteCallback(btn.getAttribute('data-id')));
    });
}

/**
 * Renderitza les targetes disponibles per ser seleccionades en el flux de compra de Pla.
 * 
 * @param {Array} methods - Llista de mètodes.
 */
export function renderCardsForPlan(methods) {
    const container = document.getElementById('saved-cards-plan');
    if (!container) return;

    if (methods.length > 0) {
        document.getElementById('plan-payment-container')?.classList.remove('d-none');
        container.innerHTML = methods.map((m, index) => `
            <div class="col-12 col-xl-6">
                <div class="card h-100 border-2 card-selection-item ${index === 0 ? 'border-danger bg-danger bg-opacity-10' : ''}" 
                     style="cursor:pointer;" onclick="selectCardForPlan(this, '${m.id}')">
                    <div class="card-body p-3 d-flex align-items-center gap-3">
                        <i class="bi bi-credit-card text-danger fs-4"></i>
                        <div>
                            <div class="small fw-bold text-uppercase">${m.brand} •••• ${m.last4}</div>
                            <div class="text-muted smallest">Expira el ${m.exp_month}/${m.exp_year}</div>
                        </div>
                        <input type="radio" name="plan-card" value="${m.id}" class="ms-auto" ${index === 0 ? 'checked' : ''}>
                    </div>
                </div>
            </div>
        `).join('');

        if (!window.selectCardForPlan) {
            window.selectCardForPlan = function (el, id) {
                document.querySelectorAll('.card-selection-item').forEach(item => {
                    item.classList.remove('border-danger', 'bg-danger', 'bg-opacity-10');
                });
                el.classList.add('border-danger', 'bg-danger', 'bg-opacity-10');
                el.querySelector('input').checked = true;
            };
        }
    } else {
        document.getElementById('plan-payment-container')?.classList.add('d-none');
    }
}

/**
 * Actualitza el resum bàsic del pla en la UI (Mètodes de pagament).
 * 
 * @param {Object} sub - Detalls de la subscripció.
 * @param {Object} primaryCard - Targeta principal.
 */
export function updatePlanSummaryUI(sub, primaryCard) {
    const nextInvoiceDate = document.getElementById('next-invoice-date');
    const activeCardLast4 = document.getElementById('active-card-last4');
    const renewBadge = document.getElementById('renew-badge-ui');

    const nextInvoiceRow = document.getElementById('next-invoice-row');
    if (nextInvoiceRow) {
        nextInvoiceRow.style.setProperty('display', sub.cancel_at_period_end ? 'none' : 'flex', 'important');
    }

    if (nextInvoiceDate) {
        nextInvoiceDate.textContent = formatStripeDate(sub.current_period_end);
    }

    if (renewBadge) {
        if (sub.cancel_at_period_end) {
            renewBadge.className = 'text-warning small fw-semibold';
            renewBadge.innerHTML = '<i class="bi bi-clock-history me-1"></i> Cancel·lació pendent';
        } else {
            renewBadge.className = 'text-success small fw-semibold';
            renewBadge.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Activa';
        }
    }

    if (primaryCard && activeCardLast4) {
        activeCardLast4.textContent = `•••• ${primaryCard.last4}`;
    }

    // Preu i interval dinàmic
    const planAmount = sub.plan_amount ?? 5;
    
    let planInterval = 'mes';
    const intervalRaw = (sub.plan_interval || '').toLowerCase();
    if (intervalRaw === 'year' || intervalRaw === 'anual') {
        planInterval = 'any';
    }

    const price = planAmount.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

    const amountUi = document.getElementById('plan-amount-ui');
    if (amountUi) amountUi.textContent = `${price} / ${planInterval}`;
}

/**
 * Renderitza la interfície per a un usuari amb pla Bàsic.
 */
export function renderBasicPlanUI() {
    const planBadgeUi = document.getElementById('plan-badge-ui');
    const planIconUi = document.getElementById('plan-icon-ui');
    const planTextUi = document.getElementById('plan-text-ui');
    const renewRow = document.getElementById('renew-row');
    const nextInvoiceRow = document.getElementById('next-invoice-row');
    const amountRow = document.getElementById('amount-row');
    const activeCardRow = document.getElementById('active-card-row');
    const btnManageSubscription = document.getElementById('btn-manage-subscription');

    if (planBadgeUi) planBadgeUi.className = 'badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 px-2 py-1 rounded-3';
    if (planIconUi) planIconUi.className = 'bi bi-person me-1';
    if (planTextUi) planTextUi.textContent = 'Bàsic';

    if (renewRow) renewRow.style.display = 'none';
    if (nextInvoiceRow) nextInvoiceRow.style.display = 'none';
    
    if (amountRow) {
        amountRow.style.display = 'flex';
        const amountValue = amountRow.querySelector('span:last-child');
        if (amountValue) amountValue.textContent = '0,00 €';
    }

    if (activeCardRow) activeCardRow.style.display = 'none';
    if (btnManageSubscription) btnManageSubscription.style.display = 'none';
}

/**
 * Gestiona la població dels elements detallats del component de gestió (profile-manage.html).
 * 
 * @param {Object} subscription - Objecte amb dades de subscripció.
 * @param {Object} [primaryCard] - Targeta principal.
 * @param {Object} callbacks - Objecte amb callbacks (onAutorenewChange).
 */
export function updateManageSectionUI(subscription, primaryCard, callbacks) {
    const manageSection = document.getElementById('section-manage');
    if (!manageSection) return;

    const renewalDateStr = formatStripeDate(subscription.current_period_end);

    // Data de creació
    if (subscription.created) {
        const createdShort = formatStripeDate(subscription.created, { day: '2-digit', month: 'short', year: 'numeric' });
        const createdLong  = formatStripeDate(subscription.created);

        const memberSince = document.getElementById('member-since');
        if (memberSince) memberSince.textContent = `Membre des del ${createdLong}`;

        const memberSinceDetail = document.getElementById('member-since-detail');
        if (memberSinceDetail) memberSinceDetail.textContent = createdShort;
    }

    // Estat
    const planStatusDetail = document.getElementById('plan-status-detail');
    const planStatusBadge = document.getElementById('plan-status-badge');
    const planStatusBadgeMini = document.getElementById('plan-status-badge-mini');

    if (subscription.cancel_at_period_end) {
        if (planStatusDetail) {
            planStatusDetail.className = 'fw-bold text-warning';
            planStatusDetail.innerHTML = '<i class="bi bi-clock-history me-1"></i> Cancel·lació pendent';
        }
        if (planStatusBadge) {
            planStatusBadge.className = 'badge bg-warning text-dark px-2 py-1 rounded-pill small fw-semibold';
            planStatusBadge.innerHTML = '<i class="bi bi-clock-history me-1"></i> Cancel·lació pendent';
        }
        if (planStatusBadgeMini) {
            planStatusBadgeMini.className = 'badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50 px-2 py-1 rounded-pill small fw-semibold mb-2 d-inline-block';
            planStatusBadgeMini.innerHTML = '<i class="bi bi-clock-history me-1"></i> Pendent';
        }
    } else {
        if (planStatusDetail) {
            planStatusDetail.className = 'fw-bold text-success';
            planStatusDetail.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Actiu';
        }
        if (planStatusBadge) {
            planStatusBadge.className = 'badge bg-success text-white px-2 py-1 rounded-pill small fw-semibold';
            planStatusBadge.innerHTML = '<i class="bi bi-star-fill me-1"></i> Actiu';
        }
        if (planStatusBadgeMini) {
            planStatusBadgeMini.className = 'badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 px-2 py-1 rounded-pill small fw-semibold mb-2 d-inline-block';
            planStatusBadgeMini.innerHTML = '<i class="bi bi-person-check-fill me-1"></i> Actiu';
        }
    }

    const isVowelStr = /^(1\b|11|agost|octubre|abril)/i.test(renewalDateStr);
    const prefix = isVowelStr ? "l'" : "el ";
    
    const renewalHeader = document.getElementById('renewal-date-header');
    if (renewalHeader) {
        renewalHeader.textContent = subscription.cancel_at_period_end 
            ? `Expira el ${renewalDateStr}` 
            : `Renova ${prefix}${renewalDateStr}`;
    }

    const nextInvoiceRowDetail = document.getElementById('next-invoice-row-detail');
    if (nextInvoiceRowDetail) {
        if (subscription.cancel_at_period_end) {
            nextInvoiceRowDetail.style.setProperty('display', 'none', 'important');
        } else {
            nextInvoiceRowDetail.style.setProperty('display', 'flex', 'important');
        }
    }

    const nextInvoiceDetail = document.getElementById('next-invoice-date-detail');
    if (nextInvoiceDetail) nextInvoiceDetail.textContent = renewalDateStr;

    // Preu
    const planAmount = subscription.plan_amount ?? 5;
    
    // Suport per a intervals de Stripe (year, month) i locals (anual, mensual, trimestral)
    let planInterval = 'mes';
    const intervalRaw = (subscription.plan_interval || '').toLowerCase();
    
    if (intervalRaw === 'year' || intervalRaw === 'anual') {
        planInterval = 'any';
    }
    
    const price = planAmount.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

    const priceHeader = document.getElementById('plan-price-header');
    if (priceHeader) priceHeader.innerHTML = `${price} <span class="fs-6 fw-normal opacity-75">/ ${planInterval}</span>`;

    const priceDetail = document.getElementById('plan-price-detail');
    if (priceDetail) priceDetail.textContent = `${price} / ${planInterval}`;

    const autoRenewIntervalText = document.getElementById('auto-renew-interval-text');
    if (autoRenewIntervalText) {
        autoRenewIntervalText.textContent = `Renovar automàticament cada ${planInterval}`;
    }

    const planIntervalDetail = document.getElementById('plan-interval-detail');
    if (planIntervalDetail) {
        if (planInterval === 'any') planIntervalDetail.textContent = 'Anual';
        else planIntervalDetail.textContent = 'Mensual';
    }

    // Targeta
    if (primaryCard) {
        const cardStr = `${primaryCard.brand} •••• ${primaryCard.last4}`;
        const activeCardDetail = document.getElementById('active-card-detail');
        if (activeCardDetail) activeCardDetail.textContent = cardStr.toUpperCase();

        const autoRenewCardNotice = document.getElementById('auto-renew-card-notice');
        if (autoRenewCardNotice) autoRenewCardNotice.textContent = `S'utilitzarà la ${cardStr.toUpperCase()} per als cobraments futurs.`;
    }

    // Notices
    const autoRenewNotice = document.getElementById('auto-renew-notice');
    if (autoRenewNotice) {
        autoRenewNotice.innerHTML = subscription.cancel_at_period_end
            ? `La subscripció s'aturarà l'<strong>${renewalDateStr}</strong>. Pots tornar a activar la renovació quan vulguis.`
            : `Si desactives la renovació, mantindràs el pla Premium fins a l'<strong>${renewalDateStr}</strong>. Podràs tornar a activar-la quan vulguis.`;
    }



    // Callbacks listeners
    const autoRenewSwitch = document.getElementById('autoRenewSwitch');
    const autoRenewVisual = document.getElementById('autoRenewSwitch-visual');
    
    if (autoRenewSwitch) {
        const isActive = !subscription.cancel_at_period_end;
        autoRenewSwitch.checked = isActive;
        
        // Sincronitzar visualment
        if (autoRenewVisual) {
            autoRenewVisual.classList.toggle('on', isActive);
            
            // Permetre clicar el visual per canviar el checkbox
            autoRenewVisual.onclick = () => {
                const newState = !autoRenewSwitch.checked;
                autoRenewSwitch.checked = newState;
                autoRenewVisual.classList.toggle('on', newState);
                callbacks.onAutorenewChange(newState);
            };
        }

        autoRenewSwitch.onchange = (e) => {
            if (autoRenewVisual) autoRenewVisual.classList.toggle('on', autoRenewSwitch.checked);
            callbacks.onAutorenewChange(autoRenewSwitch.checked);
        };
    }


}

/**
 * Activa o desactiva l'estat de càrrega del botó de pagament.
 * 
 * @param {boolean} isLoading - Si s'ha de mostrar l'spinner.
 */
export function setLoading(isLoading) {
    const btn = document.getElementById('submit');
    const spinner = document.getElementById('spinner');
    const text = document.getElementById('button-text');
    if (!btn) return;
    btn.disabled = isLoading;
    spinner?.classList.toggle('d-none', !isLoading);
    if (text) text.textContent = isLoading ? 'Desant...' : 'Desar targeta';
}

/**
 * Mostra un missatge d'alerta dins el formulari.
 * 
 * @param {string} msg - El missatge a mostrar.
 * @param {string} [type='danger'] - El tipus d'alerta Bootstrap.
 */
export function showMessage(msg, type = 'danger') {
    const div = document.getElementById('payment-message');
    if (!div) return;
    div.textContent = msg;
    div.className = `alert alert-${type} mt-3 small`;
    div.classList.remove('d-none');
}

/**
 * Amaga el missatge d'alerta del formulari.
 */
export function hideMessage() {
    const div = document.getElementById('payment-message');
    if (div) div.classList.add('d-none');
}

/**
 * Mostra una alerta global de Bootstrap.
 * 
 * @param {string} type - 'success' o 'danger'.
 * @param {string} msg - Missatge.
 */
export function showAlert(type, msg) {
    showBootstrapAlert(type, msg);
}
