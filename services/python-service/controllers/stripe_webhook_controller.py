import stripe
import os
from flask import request, jsonify
from models.stripe_model import update_subscription_status, update_user_premium_status, log_failed_payment
from datetime import datetime

def handle_stripe_webhook():
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
            # Per a entorns de test sense secret (no recomanat)
            data = request.get_json()
            event = stripe.Event.construct_from(data, stripe.api_key)
    except ValueError as e:
        return jsonify({'error': 'Payload invàlid'}), 400
    except stripe.error.SignatureVerificationError as e:
        return jsonify({'error': 'Signatura invàlida'}), 400

    event_type = event['type']
    data_object = event['data']['object']

    if event_type == 'invoice.payment_succeeded':
        # Subscripció renovada correctament o pagament inicial ok
        stripe_sub_id = data_object.get('subscription')
        if stripe_sub_id:
            # Obtenir detalls de la subscripció per saber la nova data final
            subscription = stripe.Subscription.retrieve(stripe_sub_id)
            data_final = datetime.fromtimestamp(subscription.current_period_end).strftime('%Y-%m-%d')
            update_subscription_status(stripe_sub_id, 'activa', data_final)
            update_user_premium_status(data_object.get('customer'), True)

    elif event_type == 'invoice.payment_failed':
        # Pagament fallit
        log_failed_payment(
            data_object.get('customer'),
            data_object.get('id'),
            data_object.get('amount_due') / 100
        )
        # Opcionalment: marcar subscripció com a pendent o fallida

    elif event_type == 'customer.subscription.deleted':
        # Subscripció cancel·lada o finalitzada (per impagament o manualment)
        stripe_sub_id = data_object.get('id')
        update_subscription_status(stripe_sub_id, 'caducada')
        update_user_premium_status(data_object.get('customer'), False)

    elif event_type == 'invoice.upcoming':
        # Notificació de pròxima renovació (7 dies abans per defecte)
        # Aquí enviaríem un email a l'usuari
        customer_id = data_object.get('customer')
        print(f"[Webhook] Pròxima renovació per al client {customer_id}")

    return jsonify({'status': 'success'}), 200
