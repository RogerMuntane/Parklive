"""
Rutes de l'API per a la integració amb la plataforma de pagaments Stripe.

Gestiona els mètodes de pagament dels usuaris, subscripcions premium,
autorenovacions i webhooks per a esdeveniments asíncrons.
"""

from flask import Blueprint
from controllers.stripe_controller import get_payment_methods, detach_payment_method, get_setup_intent, handle_create_subscription
from controllers.stripe_webhook_controller import handle_stripe_webhook

stripe_routes = Blueprint("stripe", __name__)

@stripe_routes.route("/api/stripe/payment-methods", methods=["GET"])
def list_methods():
    """
    Obté la llista de mètodes de pagament (targetes) guardats a Stripe per l'usuari.

    Returns:
        Response: JSON amb la llista de mètodes de pagament.
    """
    return get_payment_methods()

@stripe_routes.route("/api/stripe/payment-methods/<string:method_id>", methods=["DELETE"])
def remove_method(method_id):
    """
    Elimina (desvincula) un mètode de pagament guardat de l'usuari.

    Args:
        method_id (str): Identificador de Stripe del mètode de pagament.

    Returns:
        Response: JSON confirmant l'eliminació.
    """
    return detach_payment_method(method_id)

@stripe_routes.route("/api/stripe/setup-intent", methods=["GET"])
def setup_intent():
    """
    Crea un SetupIntent de Stripe per permetre al frontend recollir dades de targeta.

    Returns:
        Response: JSON amb el client_secret del SetupIntent.
    """
    return get_setup_intent()

@stripe_routes.route("/api/stripe/create-subscription", methods=["POST"])
def create_subscription_route():
    """
    Crea una nova subscripció premium mitjançant Stripe.

    Returns:
        Response: JSON amb les dades de la nova subscripció.
    """
    return handle_create_subscription()

@stripe_routes.route("/api/stripe/update-autorenewal", methods=["POST"])
def update_autorenewal_route():
    """
    Activa o desactiva l'autorenovació de la subscripció de l'usuari.

    Returns:
        Response: JSON amb l'estat actualitzat de la subscripció.
    """
    from controllers.stripe_controller import handle_update_autorenewal
    return handle_update_autorenewal()

@stripe_routes.route("/api/stripe/subscription", methods=["GET"])
def subscription_details():
    """
    Obté els detalls actuals de la subscripció de l'usuari autenticat.

    Returns:
        Response: JSON amb els detalls de la subscripció.
    """
    from controllers.stripe_controller import get_subscription_details
    return get_subscription_details()

@stripe_routes.route("/api/stripe/webhook", methods=["POST"])
def stripe_webhook():
    """
    Endpoint per rebre notificacions d'esdeveniments de Stripe (Webhooks).

    Returns:
        Response: Resposta buida amb codi 200 per confirmar la recepció.
    """
    return handle_stripe_webhook()

@stripe_routes.route("/api/stripe/sync-subscription", methods=["POST"])
def sync_subscription_route():
    """
    Sincronitza l'estat local de la subscripció amb la realitat a Stripe.

    Returns:
        Response: JSON amb el resultat de la sincronització.
    """
    from controllers.stripe_controller import handle_sync_subscription
    return handle_sync_subscription()

@stripe_routes.route("/api/stripe/subscription-history", methods=["GET"])
def subscription_history_route():
    """
    Retorna l'historial de pagaments i subscripcions de l'usuari.

    Returns:
        Response: JSON amb el llistat històric.
    """
    from controllers.stripe_controller import get_subscription_history
    return get_subscription_history()
