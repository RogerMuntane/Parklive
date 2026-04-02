/**
 * ParkLive - Stripe Service
 * Gestiona les crides a l'API del backend de Python per a Stripe.
 */

import { PYTHON_API_URL } from '../../config.js';

const API_STRIPE_URL = `${PYTHON_API_URL}/api/stripe`;

/**
 * Obté el client secret i la clau pública per inicialitzar Stripe Elements.
 * 
 * @param {string} userId - ID de l'usuari.
 * @returns {Promise<Object>} Objecte amb client_secret i stripe_publishable_key.
 */
export async function fetchSetupIntent(userId) {
    const res = await fetch(`${API_STRIPE_URL}/setup-intent?user_id=${userId}`);
    if (!res.ok) throw new Error(`Error ${res.status} en crear SetupIntent`);
    return await res.json();
}

/**
 * Obté els mètodes de pagament de l'usuari des de l'API.
 * 
 * @param {string} userId - ID de l'usuari.
 * @returns {Promise<Array>} Llista de mètodes de pagament.
 */
export async function fetchPaymentMethods(userId) {
    const response = await fetch(`${API_STRIPE_URL}/payment-methods?user_id=${userId}`);
    if (!response.ok) throw new Error('Error obtenint mètodes de pagament');
    return await response.json();
}

/**
 * Elimina un mètode de pagament de Stripe.
 * 
 * @param {string} methodId - ID del mètode (pm_...).
 * @returns {Promise<boolean>} Cert si s'ha eliminat correctament.
 */
export async function deleteStripeCard(methodId) {
    const response = await fetch(`${API_STRIPE_URL}/payment-methods/${methodId}`, {
        method: 'DELETE',
    });
    return response.ok;
}

/**
 * Crea una nova subscripció Premium.
 * 
 * @param {string} userId - ID de l'usuari.
 * @param {string} paymentMethodId - ID de la targeta.
 * @param {boolean} autorenovacio - Si s'activa l'autorenovació.
 * @param {string} planType - 'monthly' o 'annual'.
 * @returns {Promise<Object>} Resposta de Stripe (id, status, clientSecret).
 */
export async function createStripeSubscription(userId, paymentMethodId, autorenovacio, planType = 'monthly') {
    const response = await fetch(`${API_STRIPE_URL}/create-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: userId,
            payment_method_id: paymentMethodId,
            autorenovacio: autorenovacio,
            plan_type: planType
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'error_subscription');
    }
    return await response.json();
}

/**
 * Actualitza l'estat d'autorenovació de la subscripció.
 * 
 * @param {string} userId - ID de l'usuari.
 * @param {boolean} autorenovacio - Nou estat.
 * @returns {Promise<boolean>} Cert si s'ha actualitzat correctament.
 */
export async function updateStripeAutorenewal(userId, autorenovacio) {
    const response = await fetch(`${API_STRIPE_URL}/update-autorenewal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: userId,
            autorenovacio: autorenovacio
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'error_update_autorenewal');
    }
    return true;
}

/**
 * Obté els detalls de la subscripció activa des de Stripe.
 * 
 * @param {string} userId - ID de l'usuari.
 * @returns {Promise<Object>} Detalls de la subscripció.
 */
export async function fetchSubscriptionDetails(userId) {
    const response = await fetch(`${API_STRIPE_URL}/subscription?user_id=${userId}`);
    if (!response.ok) throw new Error('Error obtenint detalls de la subscripció');
    return await response.json();
}
