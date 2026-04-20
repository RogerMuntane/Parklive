/**
 * ParkLive - Stripe Controller
 * Orquestra el flux de pagaments i subscripcions utilitzant els mòduls de servei i renderitzat.
 */

import { showBootstrapAlert } from '../utils.js';
import * as stripeService from './stripe/stripe.service.js';
import * as stripeRender from './stripe/stripe.render.js';
import { STRIPE_PUBLIC_KEY } from '../config.js';

let stripeInstance = null;
let elementsInstance = null;
let paymentElementMounted = false;

/* ─── 1. INICIALITZACIÓ ────────────────────────────────────────────── */

/**
 * Inicialitza la instància de Stripe amb la clau pública des de la configuració o el backend.
 * 
 * @param {string} userId - ID de l'usuari.
 * @returns {Promise<Object|null>} Instància de Stripe.
 */
export async function initStripe(userId) {
    if (stripeInstance) return stripeInstance;

    // Intentar usar el valor injectat des de l'entorn primer
    if (STRIPE_PUBLIC_KEY && STRIPE_PUBLIC_KEY !== 'undefined' && STRIPE_PUBLIC_KEY !== '') {
        stripeInstance = Stripe(STRIPE_PUBLIC_KEY);
        return stripeInstance;
    }

    try {
        const { stripe_publishable_key } = await stripeService.fetchSetupIntent(userId);
        if (stripe_publishable_key) {
            stripeInstance = Stripe(stripe_publishable_key);
        }
    } catch (err) {
        console.error('[Stripe] initStripe:', err);
    }
    return stripeInstance;
}

export async function loadPaymentMethods(userId) {
    const container = document.getElementById('payment-methods-container');
    if (!container) return [];

    try {
        console.log('[Stripe] Iniciant càrrega de mètodes de pagament per a:', userId);
        const methods = await stripeService.fetchPaymentMethods(userId);
        console.log('[Stripe] Mètodes rebuts:', methods.length);
        stripeRender.renderPaymentMethods(methods, (methodId) => deleteCard(methodId, userId));
        return methods;
    } catch (error) {
        console.error('[Stripe] loadPaymentMethods ERROR:', error);
        if (container) {
            container.innerHTML = `<div class="alert alert-warning small">No s'han pogut carregar les targetes.</div>`;
        }
        return [];
    }
}

/**
 * Elimina una targeta i refresca la llista.
 * 
 * @param {string} methodId - ID de la targeta.
 * @param {string} userId - ID de l'usuari.
 * @private
 */
async function deleteCard(methodId, userId) {
    try {
        const success = await stripeService.deleteStripeCard(methodId);
        if (success) {
            await loadPaymentMethods(userId);
        } else {
            showBootstrapAlert('danger', 'No s\'ha pogut eliminar la targeta.');
        }
    } catch (err) {
        showBootstrapAlert('danger', 'Error de connexió en eliminar la targeta.');
    }
}

/* ─── 2. FORMULARI ADDICIÓ TARGETES ────────────────────────────────── */

/**
 * Configura el botó i el modal per afegir noves targetes.
 * 
 * @param {string} userId - ID de l'usuari.
 */
export function initStripeButton(userId) {
    const btnAdd = document.getElementById('btn-add-card');
    const modalEl = document.getElementById('addCardModal');
    const form = document.getElementById('payment-form');

    if (!btnAdd || !modalEl || !form) return;

    // Moure el modal al final del body per evitar problemes de stacking context amb les seccions (z-index)
    if (modalEl.parentNode !== document.body) {
        document.body.appendChild(modalEl);
    }

    const modal = new bootstrap.Modal(modalEl);

    modalEl.addEventListener('hidden.bs.modal', () => {
        const container = document.getElementById('payment-element');
        if (container) container.innerHTML = '';
        paymentElementMounted = false;
        stripeRender.hideMessage();
    });

    btnAdd.addEventListener('click', async () => {
        btnAdd.disabled = true;
        btnAdd.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Carregant...';

        try {
            const { client_secret } = await stripeService.fetchSetupIntent(userId);
            await initStripe(userId);

            elementsInstance = stripeInstance.elements({
                clientSecret: client_secret,
                appearance: {
                    theme: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'night' : 'stripe',
                    variables: {
                        colorPrimary: '#c1121f',
                    }
                },
            });

            // Configurar el Payment Element per ser més simple i evitar Link si dóna problemes
            const paymentElement = elementsInstance.create('payment', {
                layout: 'tabs',
                paymentMethodOrder: ['card']
            });

            paymentElement.mount('#payment-element');
            paymentElementMounted = true;
            modal.show();
        } catch (err) {
            console.error('[Stripe] initStripeButton Click:', err);
            stripeRender.showMessage('Error al carregar el formulari: ' + err.message);
        } finally {
            btnAdd.disabled = false;
            btnAdd.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Afegir nova targeta';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!paymentElementMounted) return;

        stripeRender.setLoading(true);
        stripeRender.hideMessage();

        const { error } = await stripeInstance.confirmSetup({
            elements: elementsInstance,
            confirmParams: { return_url: window.location.href },
            redirect: 'if_required',
        });

        if (error) {
            stripeRender.showMessage(error.message);
        } else {
            stripeRender.showMessage('Targeta desada correctament!', 'success');
            setTimeout(() => {
                modal.hide();
                loadPaymentMethods(userId);
            }, 1200);
        }
        stripeRender.setLoading(false);
    });
}

/* ─── 3. SUBSCRIPCIÓ AL PLA ────────────────────────────────────────── */

/**
 * Actualitza els botons del sidebar quan es detecta que l'usuari ha passat
 * a premium durant la sessió (sessionStorage estava desactualitzat).
 * @private
 */
function _updateSidebarForPremium() {
    const planBtn = document.querySelector('.sidebar-nav-item[data-section="plan"]');
    const manageBtn = document.querySelector('.sidebar-nav-item[data-section="manage"]');
    const stadisticsBtn = document.querySelector('.sidebar-nav-item[data-section="stadistics"]');

    if (planBtn) planBtn.style.display = 'none';
    if (manageBtn) manageBtn.style.display = '';
    if (stadisticsBtn) stadisticsBtn.style.display = '';
}

/**
 * Carrega targetes per a la compra del pla.
 * 
 * @param {string} userId - ID de l'usuari.
 */
export async function loadCardsForPlan(userId) {
    try {
        const methods = await stripeService.fetchPaymentMethods(userId);
        stripeRender.renderCardsForPlan(methods);
    } catch (err) {
        console.error('[Stripe] loadCardsForPlan:', err);
    }
}

/**
 * Crea una nova subscripció.
 * 
 * @param {string} userId - ID de l'usuari.
 * @param {string} paymentMethodId - ID de la targeta.
 * @param {boolean} autorenovacio - Si s'activa l'autorenovació.
 * @param {string} planType - 'monthly' o 'annual'.
 * @returns {Promise<Object>} Resultat.
 */
export async function createSubscription(userId, paymentMethodId, autorenovacio = true, planType = 'monthly') {
    try {
        const data = await stripeService.createStripeSubscription(userId, paymentMethodId, autorenovacio, planType);

        if (data.clientSecret && data.status === 'incomplete') {
            const stripe = await initStripe(userId);
            const { error } = await stripe.confirmCardPayment(data.clientSecret);
            if (error) throw new Error(error.message);
        }

        return { success: true };
    } catch (err) {
        console.error('[Stripe] createSubscription:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Actualitza l'estat d'autorenovació.
 * 
 * @param {string} userId - ID de l'usuari.
 * @param {boolean} autorenovacio - Nou estat.
 * @returns {Promise<Object>} Resultat.
 */
export async function updateSubscriptionAutorenewal(userId, autorenovacio) {
    try {
        await stripeService.updateStripeAutorenewal(userId, autorenovacio);
        return { success: true };
    } catch (err) {
        console.error('[Stripe] updateSubscriptionAutorenewal:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Actualitza el resum del pla i la secció de gestió.
 * 
 * @param {string} userId - ID de l'usuari.
 */
export async function updatePlanSummary(userId, methods = null) {
    const summaryContainer = document.getElementById('payment-plan-summary');
    if (!summaryContainer) return;

    try {
        console.log('[Stripe] Actualitzant resum del pla per a:', userId);

        // Primer intentem obtenir la subscripció directament de l'API per tenir
        // l'estat real (el sessionStorage pot estar desactualitzat si l'usuari
        // acaba de comprar el pla sense recarregar la sessió).
        let sub = null;
        let fetchedMethods = methods;

        try {
            sub = await stripeService.fetchSubscriptionDetails(userId);
        } catch (_) {
            sub = null;
        }

        const raw = sessionStorage.getItem('parklive_user_data');
        const user = raw ? JSON.parse(raw) : null;

        // Si l'API confirma que té subscripció activa, actualitzem el sessionStorage
        // perquè la resta de la UI (sidebar, etc.) reflecteixi el canvi.
        // Stripe pot retornar 'active', 'trialing' o 'past_due' en subscripcions vigents
        const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'];
        const isPremiumByApi = sub !== null && ACTIVE_STATUSES.includes(sub.status);
        const isPremiumBySession = user && user.tipus_usuari === 'premium';

        if (isPremiumByApi && !isPremiumBySession && user) {
            console.log('[Stripe] Actualitzant sessionStorage: usuari ara és premium.');
            user.tipus_usuari = 'premium';
            sessionStorage.setItem('parklive_user_data', JSON.stringify(user));
            _updateSidebarForPremium();
        }

        const isPremium = isPremiumByApi || isPremiumBySession;

        // Si no hi ha cap subscripció vàlida (404 o error Stripe)
        if (!sub) {
            if (!user) {
                summaryContainer.classList.add('d-none');
                return;
            }
            if (!isPremium) {
                // Usuari bàsic confirmat: mostrem el resum bàsic
                summaryContainer.classList.remove('d-none');
                stripeRender.renderBasicPlanUI();
            } else {
                // Usuari premium en sessió però sense sub vàlida a la BD:
                // Intentem una sincronització automàtica des de Stripe
                console.warn('[Stripe] Subscripció no trobada a la BD. Iniciant sincronització automàtica...');
                summaryContainer.classList.remove('d-none');

                const syncResult = await stripeService.syncSubscription(userId);
                if (syncResult) {
                    console.log('[Stripe] Sincronització completada. Tornant a carregar dades...');
                    // showBootstrapAlert('info', 'Sincronitzant dades de subscripció...');
                    sub = await stripeService.fetchSubscriptionDetails(userId);
                }

                if (!sub) {
                    stripeRender.renderBasicPlanUI();
                    console.error('[Stripe] No s\'ha pogut obtenir la subscripció ni de la BD ni de Stripe.');
                    showBootstrapAlert('warning', ' No s\'han pogut carregar els detalls de la subscripció. Contacta amb suport.');
                    return;
                }

                // Subscripció recuperada post-sync: actualitzem isPremiumByApi
                const ACTIVE_STATUSES_SYNC = ['active', 'trialing', 'past_due'];
                if (!ACTIVE_STATUSES_SYNC.includes(sub.status)) {
                    stripeRender.renderBasicPlanUI();
                    return;
                }
            }

            if (!sub) return; // guard final
        }

        summaryContainer.classList.remove('d-none');

        // Carregem els mètodes de pagament si no s'han passat com a paràmetre
        if (!fetchedMethods) {
            console.log('[Stripe] Carregant mètodes de pagament...');
            try {
                fetchedMethods = await stripeService.fetchPaymentMethods(userId);
            } catch (_) {
                fetchedMethods = [];
            }
        }

        const primaryCard = fetchedMethods && fetchedMethods.length > 0 ? fetchedMethods[0] : null;

        stripeRender.updatePlanSummaryUI(sub, primaryCard);

        stripeRender.updateManageSectionUI(sub, primaryCard, {
            onAutorenewChange: async (newState) => {
                const autoRenewSwitch = document.getElementById('autoRenewSwitch');
                try {
                    autoRenewSwitch.disabled = true;
                    console.log(`[Stripe] Canviant autorenovació a: ${newState}`);
                    const res = await updateSubscriptionAutorenewal(userId, newState);
                    console.log('[Stripe] Resposta autorenovació:', res);
                    if (res.success) {
                        showBootstrapAlert('success', newState ? ' Renovació automàtica activada correctament.' : ' Renovació automàtica desactivada correctament.');
                        await updatePlanSummary(userId);
                    } else {
                        autoRenewSwitch.checked = !newState;
                        showBootstrapAlert('danger', `Error al actualitzar la renovació: ${res.error || 'error desconegut'}`);
                    }
                } catch (err) {
                    autoRenewSwitch.checked = !newState;
                    showBootstrapAlert('danger', `Error de connexió: ${err.message}`);
                } finally {
                    autoRenewSwitch.disabled = false;
                }
            },
            onCancelClick: () => {
                const modalEl = document.getElementById('cancelSubscriptionModal');
                if (modalEl) {
                    const bsModal = new bootstrap.Modal(modalEl);
                    bsModal.show();
                }
            }
        });

        const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
        if (btnConfirmCancel) {
            btnConfirmCancel.onclick = async () => {
                const modalEl = document.getElementById('cancelSubscriptionModal');
                const bsModal = bootstrap.Modal.getInstance(modalEl);
                try {
                    btnConfirmCancel.disabled = true;
                    btnConfirmCancel.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Cancel·lant...';
                    const res = await updateSubscriptionAutorenewal(userId, false);
                    if (bsModal) bsModal.hide();
                    if (res.success) {
                        showBootstrapAlert('success', 'Subscripció modificada.');
                        await updatePlanSummary(userId);
                    } else {
                        showBootstrapAlert('danger', 'No s\'ha pogut cancel·lar.');
                    }
                } catch {
                    if (bsModal) bsModal.hide();
                    showBootstrapAlert('danger', 'Error de connexió.');
                } finally {
                    btnConfirmCancel.disabled = false;
                    btnConfirmCancel.innerHTML = '<i class="bi bi-x-octagon me-2"></i>Sí, cancel·la';
                }
            };
        }

    } catch (err) {
        console.error('[Stripe] updatePlanSummary:', err);
    }
}

/**
 * Inicialitza la secció de pagaments.
 * 
 * @param {string} userId - ID de l'usuari.
 */
export function initProfilePaymentSection(userId) {
    loadPaymentMethods(userId);
    updatePlanSummary(userId);
    initStripeButton(userId);
}
