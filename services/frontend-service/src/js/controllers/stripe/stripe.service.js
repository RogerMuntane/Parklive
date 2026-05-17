/**
 * ParkLive - Stripe Service
 * Gestiona les crides a l'API del backend de Python per a Stripe.
 */

import { pythonApi } from '../../api.js';

const API_STRIPE_PATH = '/api/stripe';

/**
 * Obté el client secret i la clau pública per inicialitzar Stripe Elements.
 * 
 * @param {string} userId - ID de l'usuari.
 * @returns {Promise<Object>} Objecte amb client_secret i stripe_publishable_key.
 */
export async function fetchSetupIntent(userId) {
    try {
        return await pythonApi.get(`${API_STRIPE_PATH}/setup-intent`, { user_id: userId });
    } catch (err) {
        if (err.status === 404) return { client_secret: null, stripe_publishable_key: null };
        throw new Error(`Error ${err.status} en crear SetupIntent`);
    }
}

/**
 * Obté els mètodes de pagament de l'usuari des de l'API.
 * 
 * @param {string} userId - ID de l'usuari.
 * @returns {Promise<Array>} Llista de mètodes de pagament.
 */
export async function fetchPaymentMethods(userId) {
    try {
        return await pythonApi.get(`${API_STRIPE_PATH}/payment-methods`, { user_id: userId, t: Date.now() });
    } catch (err) {
        if (err.status === 404) return [];
        throw new Error('Error obtenint mètodes de pagament');
    }
}

/**
 * Elimina un mètode de pagament de Stripe.
 * 
 * @param {string} methodId - ID del mètode (pm_...).
 * @returns {Promise<boolean>} Cert si s'ha eliminat correctament.
 */
export async function deleteStripeCard(methodId) {
    try {
        await pythonApi.delete(`${API_STRIPE_PATH}/payment-methods/${methodId}`);
        return true;
    } catch (err) {
        return false;
    }
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
    try {
        return await pythonApi.post(`${API_STRIPE_PATH}/create-subscription`, {
            user_id: userId,
            payment_method_id: paymentMethodId,
            autorenovacio: autorenovacio,
            plan_type: planType
        });
    } catch (err) {
        throw new Error(err.data?.error || 'error_subscription');
    }
}

/**
 * Actualitza l'estat d'autorenovació de la subscripció.
 * 
 * @param {string} userId - ID de l'usuari.
 * @param {boolean} autorenovacio - Nou estat.
 * @returns {Promise<boolean>} Cert si s'ha actualitzat correctament.
 */
export async function updateStripeAutorenewal(userId, autorenovacio) {
    try {
        await pythonApi.post(`${API_STRIPE_PATH}/update-autorenewal`, {
            user_id: userId,
            autorenovacio: autorenovacio
        });
        return true;
    } catch (err) {
        throw new Error(err.data?.error || 'error_update_autorenewal');
    }
}

/**
 * Obté els detalls de la subscripció activa des de Stripe.
 * 
 * @param {string} userId - ID de l'usuari.
 * @returns {Promise<Object>} Detalls de la subscripció.
 */
export async function fetchSubscriptionDetails(userId) {
    try {
        return await pythonApi.get(`${API_STRIPE_PATH}/subscription`, { 
            user_id: userId,
            t: Date.now() 
        });
    } catch (err) {
        if (err.status === 404 || err.status === 204) return null;
        throw new Error('Error obtenint detalls de la subscripció');
    }
}

/**
 * Sincronitza la subscripció activa de Stripe amb la BD local.
 * Útil quan _persist_subscription_to_db va fallar en la compra inicial.
 *
 * @param {string} userId - ID de l'usuari.
 * @returns {Promise<Object|null>} Resultat de la sincronització.
 */
export async function syncSubscription(userId) {
    try {
        return await pythonApi.post(`${API_STRIPE_PATH}/sync-subscription`, { 
            user_id: userId 
        });
    } catch (err) {
        return null;
    }
}
