"""
Controlador per a la gestió de webhooks de Stripe.

Processa els esdeveniments entrants de Stripe verificant la signatura
del webhook. Gestiona els events de pagament, renovació i cancel·lació
de subscripcions, sincronitzant l'estat a la base de dades local.

Events gestionats:
    - invoice.payment_succeeded: Renova la subscripció i el rol premium.
    - invoice.payment_failed: Registra el pagament fallit per a auditoria.
    - customer.subscription.deleted: Marca la subscripció com a caducada.
    - invoice.upcoming: Notificació prèvia a la renovació automàtica.
"""

import stripe
import os
from flask import request, jsonify
from models.stripe_model import update_subscription_status, update_user_premium_status, log_failed_payment
from datetime import datetime


def handle_stripe_webhook():
    """
    POST /api/stripe/webhook - Punt d'entrada per als events de Stripe.

    Verifica la signatura HMAC del webhook usant STRIPE_WEBHOOK_SECRET.
    En entorns de test sense secret configurat, accepta l'event directament
    (no recomanat en producció).

    Returns:
        JSON 200: Processament completat correctament.
        JSON 400: Payload invàlid o signatura incorrecta.
    """
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get('Stripe-Signature')
    endpoint_secret = os.getenv('STRIPE_WEBHOOK_SECRET')

    event = None

    try:
        if endpoint_secret:
            event = stripe.Webhook.construct_event(
                payload, sig_header, endpoint_secret
            )
        else:
            # Per a entorns de test sense secret (no recomanat en producció)
            data = request.get_json()
            event = stripe.Event.construct_from(data, stripe.api_key)
    except ValueError:
        return jsonify({'error': 'Payload invàlid'}), 400
    except stripe.error.SignatureVerificationError:
        return jsonify({'error': 'Signatura invàlida'}), 400

    event_type = event['type']
    data_object = event['data']['object']

    if event_type == 'invoice.payment_succeeded':
        # Renovació correcta o pagament inicial: actualitzar data final i rol
        stripe_sub_id = data_object.get('subscription')
        if stripe_sub_id:
            subscription = stripe.Subscription.retrieve(stripe_sub_id)
            data_final = datetime.fromtimestamp(subscription.current_period_end).strftime('%Y-%m-%d')
            update_subscription_status(stripe_sub_id, 'activa', data_final)
            update_user_premium_status(data_object.get('customer'), True)

    elif event_type == 'invoice.payment_failed':
        # Pagament fallit: registrar per a auditoria
        log_failed_payment(
            data_object.get('customer'),
            data_object.get('id'),
            data_object.get('amount_due') / 100
        )

    elif event_type == 'customer.subscription.deleted':
        # Subscripció cancel·lada o expirada: degradar rol
        stripe_sub_id = data_object.get('id')
        update_subscription_status(stripe_sub_id, 'caducada')
        update_user_premium_status(data_object.get('customer'), False)

    elif event_type == 'invoice.upcoming':
        # Notificació prèvia a la renovació (7 dies per defecte)
        customer_id = data_object.get('customer')
        print(f"[Webhook] Pròxima renovació per al client {customer_id}")

    return jsonify({'status': 'success'}), 200
