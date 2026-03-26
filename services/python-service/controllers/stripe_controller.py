from flask import jsonify, request
import os
from models.stripe_model import (
    get_user_stripe_id,
    list_user_payment_methods,
    delete_payment_method,
    create_setup_intent
)

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
        card = m.card
        formatted_methods.append({
            'id': m.id,
            'brand': card.brand,
            'last4': card.last4,
            'exp_month': card.exp_month,
            'exp_year': card.exp_year,
            'is_default': False # Stripe no té default nativament per PMs així, caldria Customer info
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
