import stripe
import os
from models.db_connection import get_db_connection

# Configurar Stripe (es pot re-configurar en cada crida si cal)
def _set_stripe_key():
    if not stripe.api_key:
        stripe.api_key = os.getenv('STRIPE_APIPrivada')

def get_user_stripe_id(user_id):
    """Obté el stripe_customer_id d'un usuari des de la BD"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    query = "SELECT stripe_customer_id FROM usuaris WHERE id = %s"
    cursor.execute(query, (user_id,))
    result = cursor.fetchone()
    
    cursor.close()
    return result['stripe_customer_id'] if result else None

def list_user_payment_methods(stripe_customer_id):
    """Llista tots els mètodes de pagament (targetes) d'un client a Stripe"""
    _set_stripe_key()
    if not stripe_customer_id:
        return []
    
    try:
        payment_methods = stripe.PaymentMethod.list(
            customer=stripe_customer_id,
            type="card",
        )
        return payment_methods.data
    except Exception as e:
        print(f"Error llistant mètodes de pagament: {e}")
        return []

def delete_payment_method(payment_method_id):
    """Desvincula un mètode de pagament de Stripe"""
    _set_stripe_key()
    try:
        stripe.PaymentMethod.detach(payment_method_id)
        return True
    except Exception as e:
        print(f"Error eliminant mètode de pagament: {e}")
        return False

def create_stripe_customer(user_id, email, name):
    """Crea un client a Stripe i el vincula a l'usuari a la BD"""
    _set_stripe_key()
    try:
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={'user_id': user_id}
        )
        
        # Actualitzar la BD amb el stripe_customer_id
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.callproc("sp_actualitzar_stripe_customer_id", (user_id, customer.id))
        conn.commit()
        cursor.close()
        
        return customer.id
    except Exception as e:
        print(f"[Stripe] Error creant client: {e}")
        return None

def create_setup_intent(stripe_customer_id):
    """Crea un SetupIntent per permetre desar una nova targeta"""
    _set_stripe_key()
    if not stripe_customer_id:
        return None
    
    try:
        setup_intent = stripe.SetupIntent.create(
            customer=stripe_customer_id,
            automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
        )
        return setup_intent
    except stripe.error.StripeError as e:
        print(f"[Stripe] Error de Stripe en crear SetupIntent: {e.user_message}")
        return None
    except Exception as e:
        print(f"[Stripe] Error inesperat en crear SetupIntent: {e}")
        return None
