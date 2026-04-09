/**
 * ParkLive - Stripe Controller
 * Orquestra el flux de pagaments i subscripcions utilitzant els mòduls de servei i renderitzat.
 */

import { showBootstrapAlert } from '../utils.js';
import * as stripeService from './stripe/stripe.service.js';
import * as stripeRender from './stripe/stripe.render.js';

let stripeInstance = null;
let elementsInstance = null;
let paymentElementMounted = false;

/* ─── 1. INICIALITZACIÓ ────────────────────────────────────────────── */

/**
 * Inicialitza la instància de Stripe amb la clau pública des del backend.
 * 
 * @param {string} userId - ID de l'usuari.
 * @returns {Promise<Object|null>} Instància de Stripe.
 */
export async function initStripe(userId) {
    if (stripeInstance) return stripeInstance;
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

/**
 * Carrega els mètodes de pagament i els renderitza.
 * 
 * @param {string} userId - ID de l'usuari.
 */
export async function loadPaymentMethods(userId) {
    const container = document.getElementById('payment-methods-container');
    if (!container) return;

    try {
        const methods = await stripeService.fetchPaymentMethods(userId);
        stripeRender.renderPaymentMethods(methods, (methodId) => deleteCard(methodId, userId));
    } catch (error) {
        console.error('[Stripe] loadPaymentMethods:', error);
        container.innerHTML = `<div class="alert alert-warning small">No s'han pogut carregar les targetes.</div>`;
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
export async function updatePlanSummary(userId) {
    const summaryContainer = document.getElementById('payment-plan-summary');
    if (!summaryContainer) return;

    try {
        const raw = sessionStorage.getItem('parklive_user_data');
        const user = raw ? JSON.parse(raw) : null;

        if (!user || user.tipus_usuari !== 'premium') {
            summaryContainer.classList.toggle('d-none', !user);
            if (user) stripeRender.renderBasicPlanUI();
            return;
        }

        summaryContainer.classList.remove('d-none');

        const [sub, methods] = await Promise.all([
            stripeService.fetchSubscriptionDetails(userId),
            stripeService.fetchPaymentMethods(userId)
        ]);

        const primaryCard = methods.length > 0 ? methods[0] : null;

        stripeRender.updatePlanSummaryUI(sub, primaryCard);
        
        stripeRender.updateManageSectionUI(sub, primaryCard, {
            onAutorenewChange: async (newState) => {
                const autoRenewSwitch = document.getElementById('autoRenewSwitch');
                try {
                    autoRenewSwitch.disabled = true;
                    const res = await updateSubscriptionAutorenewal(userId, newState);
                    if (res.success) {
                        showBootstrapAlert('success', newState ? 'Renovació activada' : 'Renovació desactivada');
                        await updatePlanSummary(userId);
                    } else {
                        autoRenewSwitch.checked = !newState;
                        showBootstrapAlert('danger', 'Error al actualitzar la renovació.');
                    }
                } catch (err) {
                    autoRenewSwitch.checked = !newState;
                    showBootstrapAlert('danger', 'Error de connexió.');
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
