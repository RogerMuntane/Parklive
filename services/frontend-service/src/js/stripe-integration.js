/**
 * ParkLive - Stripe Integration
 * Gestiona la visualització i addició de targetes de crèdit.
 *
 * Flux:
 *  1. loadPaymentMethods(userId)  → carrega i renderitza targetes guardades
 *  2. initStripeButton(userId)    → vincula el botó "Afegir nova targeta"
 *     · Al clic → fetch setup-intent (obté client_secret + publishable_key)
 *     · Munta Stripe PaymentElement dins el modal
 *     · Envia SetupIntent per desar la targeta
 */

const API_PYTHON_URL = 'http://localhost:5000/api/stripe';

let stripeInstance = null;
let elementsInstance = null;
let paymentElementMounted = false;

/* ─── 1. CARREGAR MÈTODES DE PAGAMENT ─────────────────────────────── */

export async function loadPaymentMethods(userId) {
    const container = document.getElementById('payment-methods-container');
    if (!container) return;

    try {
        const response = await fetch(`${API_PYTHON_URL}/payment-methods?user_id=${userId}`);
        if (!response.ok) throw new Error('Error obtenint mètodes de pagament');

        const methods = await response.json();
        renderPaymentMethods(methods, userId);
    } catch (error) {
        console.error('[Stripe] loadPaymentMethods:', error);
        container.innerHTML = `<div class="alert alert-warning small">No s'han pogut carregar les targetes.</div>`;
    }
}

function renderPaymentMethods(methods, userId) {
    const container = document.getElementById('payment-methods-container');
    if (!container) return;

    if (!methods.length) {
        container.innerHTML = `<p class="small text-muted text-center py-3">No tens cap targeta guardada.</p>`;
        return;
    }

    container.innerHTML = methods.map(m => `
        <div class="payment-card-visual mb-3 position-relative">
            <button class="btn btn-sm btn-link text-white position-absolute top-0 end-0 m-2
                           opacity-50 btn-delete-card" data-id="${m.id}" title="Eliminar targeta">
                <i class="bi bi-trash"></i>
            </button>
            <div class="card-chip mb-3"></div>
            <div class="fw-bold mb-2" style="letter-spacing:.2em;">•••• •••• •••• ${m.last4}</div>
            <div class="d-flex justify-content-between small opacity-75">
                <span class="text-uppercase">${m.brand}</span>
                <span>${m.exp_month}/${m.exp_year}</span>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.btn-delete-card').forEach(btn => {
        btn.addEventListener('click', async () => {
            await deleteCard(btn.getAttribute('data-id'), userId);

        });
    });
}

async function deleteCard(methodId, userId) {
    try {
        const response = await fetch(`${API_PYTHON_URL}/payment-methods/${methodId}`, {
            method: 'DELETE',
        });
        if (response.ok) {
            await loadPaymentMethods(userId);
        } else {
            alert('No s\'ha pogut eliminar la targeta.');
        }
    } catch {
        alert('Error de connexió en eliminar la targeta.');
    }
}

/* ─── 2. INICIALITZAR BOTÓ "AFEGIR NOVA TARGETA" ──────────────────── */

/**
 * Vincula el botó #btn-add-card al flux de Stripe.
 * No necessita la publishable_key externament: l'obté del setup-intent.
 *
 * @param {string} userId
 */
export function initStripeButton(userId) {
    const btnAdd = document.getElementById('btn-add-card');
    const modalEl = document.getElementById('addCardModal');
    const form = document.getElementById('payment-form');

    if (!btnAdd || !modalEl || !form) {
        console.warn('[Stripe] Elements del DOM no trobats (btn-add-card / addCardModal / payment-form)');
        return;
    }

    document.body.appendChild(modalEl);
    const modal = new bootstrap.Modal(modalEl);

    // Netejar el PaymentElement quan es tanca el modal per poder remontar-lo
    modalEl.addEventListener('hidden.bs.modal', () => {
        const container = document.getElementById('payment-element');
        if (container) container.innerHTML = '';
        paymentElementMounted = false;
        hideMessage();
    });

    /* ── Clic al botó: obrir modal i muntar Stripe Elements ── */
    btnAdd.addEventListener('click', async () => {
        btnAdd.disabled = true;
        btnAdd.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Carregant...';

        try {
            // Obtenir client_secret i publishable_key en un sol fetch
            const res = await fetch(`${API_PYTHON_URL}/setup-intent?user_id=${userId}`);
            if (!res.ok) throw new Error(`Error ${res.status} en crear SetupIntent`);

            const { client_secret, stripe_publishable_key } = await res.json();

            if (!stripe_publishable_key) throw new Error('Clau pública de Stripe no disponible');
            if (!client_secret) throw new Error('client_secret no disponible');

            // Inicialitzar (o reutilitzar) la instància de Stripe
            if (!stripeInstance) {
                stripeInstance = Stripe(stripe_publishable_key);
            }

            // Crear Elements amb el client_secret del SetupIntent
            elementsInstance = stripeInstance.elements({
                clientSecret: client_secret,
                appearance: {
                    theme: document.documentElement.getAttribute('data-bs-theme') === 'dark'
                        ? 'night'
                        : 'stripe',
                },
            });

            const paymentElement = elementsInstance.create('payment');
            paymentElement.mount('#payment-element');
            paymentElementMounted = true;

            modal.show();
        } catch (err) {
            console.error('[Stripe] Error al obrir modal:', err);
            showMessage('No s\'ha pogut iniciar el formulari de targeta: ' + err.message);
        } finally {
            btnAdd.disabled = false;
            btnAdd.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Afegir nova targeta';
        }
    });

    /* ── Enviament del formulari: confirmar SetupIntent ── */
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!paymentElementMounted) return;

        setLoading(true);
        hideMessage();

        const { error } = await stripeInstance.confirmSetup({
            elements: elementsInstance,
            confirmParams: { return_url: window.location.href },
            redirect: 'if_required',
        });

        if (error) {
            showMessage(error.message);
        } else {
            showMessage('Targeta desada correctament!', 'success');
            setTimeout(() => {
                modal.hide();
                loadPaymentMethods(userId);
            }, 1200);
        }

        setLoading(false);
    });
}

/* ─── HELPERS ──────────────────────────────────────────────────────── */

function setLoading(isLoading) {
    const btn = document.getElementById('submit');
    const spinner = document.getElementById('spinner');
    const text = document.getElementById('button-text');
    if (!btn) return;
    btn.disabled = isLoading;
    spinner?.classList.toggle('d-none', !isLoading);
    if (text) text.textContent = isLoading ? 'Desant...' : 'Desar targeta';
}

function showMessage(msg, type = 'danger') {
    const div = document.getElementById('payment-message');
    if (!div) return;
    div.textContent = msg;
    div.className = `alert alert-${type} mt-3 small`;
    div.classList.remove('d-none');
}

function hideMessage() {
    const div = document.getElementById('payment-message');
    if (div) div.classList.add('d-none');
}
