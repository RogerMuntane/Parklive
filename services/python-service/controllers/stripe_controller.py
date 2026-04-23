from flask import jsonify, request
import os
from models.stripe_model import get_user_stripe_id, list_user_payment_methods, delete_payment_method, create_setup_intent, create_subscription

def get_payment_methods():
    """Endpoint per obtenir les targetes guardades d'un usuari"""
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'L\'ID d\'usuari és obligatori'}), 400
    
    stripe_id = get_user_stripe_id(user_id)
    if not stripe_id:
        return jsonify({'error': 'L\'usuari no té compte de Stripe associat'}), 404
    
    methods = list_user_payment_methods(stripe_id)
    
    # Formatejar la resposta per al frontend
    formatted_methods = []
    for m in methods:
        card = getattr(m, 'card', None)
        if not card: continue
        
        formatted_methods.append({
            'id': m.id,
            'brand': getattr(card, 'brand', 'unknown'),
            'last4': getattr(card, 'last4', '****'),
            'exp_month': getattr(card, 'exp_month', 0),
            'exp_year': getattr(card, 'exp_year', 0),
            'is_default': False
        })
        
    return jsonify(formatted_methods), 200

def detach_payment_method(method_id):
    """Endpoint per eliminar una targeta"""
    if not method_id:
        return jsonify({'error': 'L\'ID del mètode de pagament és obligatori'}), 400
    
    success = delete_payment_method(method_id)
    if success:
        return jsonify({'message': 'Targeta eliminada correctament'}), 200
    else:
        return jsonify({'error': 'No s\'ha pogut eliminar la targeta'}), 500

def get_setup_intent():
    """Endpoint per crear un SetupIntent client secret"""
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'L\'ID d\'usuari és obligatori'}), 400
    
    stripe_id = get_user_stripe_id(user_id)
    if not stripe_id:
        return jsonify({'error': 'L\'usuari no té compte de Stripe associat'}), 404
    
    setup_intent = create_setup_intent(stripe_id)
    if setup_intent:
        return jsonify({
            'client_secret': setup_intent.client_secret,
            'stripe_publishable_key': os.getenv('STRIPE_APIPublica', '')
        }), 200
    else:
        return jsonify({'error': 'No s\'ha pogut crear el SetupIntent. Revisa els logs del servidor.'}), 500

def handle_create_subscription():
    """Endpoint per crear una subscripció"""
    data = request.get_json()
    user_id = data.get('user_id')
    payment_method_id = data.get('payment_method_id')
    autorenovacio = data.get('autorenovacio', True)
    plan_type = data.get('plan_type', 'monthly')

    if not user_id:
        return jsonify({'error': 'L\'ID d\'usuari és obligatori'}), 400

    stripe_id = get_user_stripe_id(user_id)
    if not stripe_id:
        return jsonify({'error': 'L\'usuari no té compte de Stripe associat'}), 404

    subscription = create_subscription(stripe_id, payment_method_id, user_id, autorenovacio, plan_type)
    
    if subscription:
        return jsonify({
            'subscriptionId': subscription.id,
            'clientSecret': subscription.latest_invoice.payment_intent.client_secret if subscription.latest_invoice.payment_intent else None,
            'status': subscription.status
        }), 200
    else:
        return jsonify({'error': 'No s\'ha pogut crear la subscripció'}), 500

def handle_update_autorenewal():
    """Endpoint per actualitzar l'autorenovació d'una subscripció existent"""
    data = request.get_json()
    user_id = data.get('user_id')
    autorenovacio = data.get('autorenovacio')

    if not user_id or autorenovacio is None:
        return jsonify({'error': 'L\'ID d\'usuari i l\'estat d\'autorenovació són obligatoris'}), 400

    from models.stripe_model import update_subscription_autorenewal
    success = update_subscription_autorenewal(user_id, autorenovacio)
    
    if success:
        return jsonify({'message': 'Autorenovació actualitzada correctament'}), 200
    else:
        return jsonify({'error': 'No s\'ha pogut actualitzar l\'autorenovació'}), 500

def get_subscription_details():
    """Endpoint per obtenir els detalls de la subscripció activa"""
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'L\'ID d\'usuari és obligatori'}), 400
    
    from models.stripe_model import get_active_subscription
    sub = get_active_subscription(user_id)
    
    if not sub:
        return jsonify({'error': 'No s\'ha trobat cap subscripció activa'}), 404
    
    return jsonify({
        'subscription_id': sub['id'] if isinstance(sub, dict) else sub.id,
        'status': sub['status'] if isinstance(sub, dict) else sub.status,
        'current_period_end': sub['current_period_end'] if isinstance(sub, dict) else sub.current_period_end,
        'cancel_at_period_end': sub['cancel_at_period_end'] if isinstance(sub, dict) else sub.cancel_at_period_end,
        'plan_amount': (sub['plan'].amount if isinstance(sub, dict) else sub.plan.amount) / 100,
        'plan_interval': sub['plan'].interval if isinstance(sub, dict) else sub.plan.interval,
        'created': sub['created'] if isinstance(sub, dict) else (sub.start_date if hasattr(sub, 'start_date') and sub.start_date else sub.created)
    }), 200


def handle_sync_subscription():
    """Sincronitza la subscripció activa de Stripe amb la BD local.
    Útil quan _persist_subscription_to_db va fallar en una compra anterior."""
    import stripe
    data = request.get_json()
    user_id = data.get('user_id') if data else request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'L\'ID d\'usuari és obligatori'}), 400

    stripe_id = get_user_stripe_id(user_id)
    if not stripe_id:
        return jsonify({'error': 'L\'usuari no té compte de Stripe associat'}), 404

    try:
        # Buscar subscripcions actives a Stripe per al customer
        subscriptions = stripe.Subscription.list(
            customer=stripe_id,
            status='active',
            limit=1
        )

        if not subscriptions.data:
            # Provar amb 'trialing' i 'past_due' també
            for status in ['trialing', 'past_due', 'incomplete']:
                subs = stripe.Subscription.list(customer=stripe_id, status=status, limit=1)
                if subs.data:
                    subscriptions = subs
                    break

        if not subscriptions.data:
            return jsonify({'error': 'No s\'hi ha trobat cap subscripció activa a Stripe per a aquest client'}), 404

        sub = subscriptions.data[0]
        print(f"[Sync] Subscripció trobada a Stripe: id={sub.id}, status={sub.status}")

        # Comprovar si ja existeix a la BD
        from models.stripe_model import get_new_connection
        conn = get_new_connection()
        if conn:
            try:
                cursor = conn.cursor(dictionary=True)
                cursor.execute(
                    "SELECT id FROM subscripcions WHERE stripe_subscription_id = %s",
                    (sub.id,)
                )
                existing = cursor.fetchone()
                cursor.close()
            finally:
                conn.close()

            if existing:
                return jsonify({'message': 'La subscripció ja existia a la BD', 'subscription_id': sub.id}), 200

        # Persistir si no existia
        from models.stripe_model import _persist_subscription_to_db
        autorenovacio = not sub.cancel_at_period_end
        _persist_subscription_to_db(user_id, sub, autorenovacio)
        print(f"[Sync] Subscripció {sub.id} persistida per a l'usuari {user_id}")

        return jsonify({
            'message': 'Subscripció sincronitzada correctament',
            'subscription_id': sub.id,
            'status': sub.status
        }), 200

    except Exception as e:
        print(f"[Sync] Error en sincronitzar: {e}")
        return jsonify({'error': str(e)}), 500
