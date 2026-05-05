from flask import Blueprint
from controllers.stripe_controller import get_payment_methods, detach_payment_method, get_setup_intent, handle_create_subscription
from controllers.stripe_webhook_controller import handle_stripe_webhook

stripe_routes = Blueprint("stripe", __name__)

@stripe_routes.route("/api/stripe/payment-methods", methods=["GET"])
def list_methods():
    return get_payment_methods()

@stripe_routes.route("/api/stripe/payment-methods/<string:method_id>", methods=["DELETE"])
def remove_method(method_id):
    return detach_payment_method(method_id)

@stripe_routes.route("/api/stripe/setup-intent", methods=["GET"])
def setup_intent():
    return get_setup_intent()

@stripe_routes.route("/api/stripe/create-subscription", methods=["POST"])
def create_subscription_route():
    return handle_create_subscription()

@stripe_routes.route("/api/stripe/update-autorenewal", methods=["POST"])
def update_autorenewal_route():
    from controllers.stripe_controller import handle_update_autorenewal
    return handle_update_autorenewal()

@stripe_routes.route("/api/stripe/subscription", methods=["GET"])
def subscription_details():
    from controllers.stripe_controller import get_subscription_details
    return get_subscription_details()

@stripe_routes.route("/api/stripe/webhook", methods=["POST"])
def stripe_webhook():
    return handle_stripe_webhook()

@stripe_routes.route("/api/stripe/sync-subscription", methods=["POST"])
def sync_subscription_route():
    from controllers.stripe_controller import handle_sync_subscription
    return handle_sync_subscription()

@stripe_routes.route("/api/stripe/subscription-history", methods=["GET"])
def subscription_history_route():
    from controllers.stripe_controller import get_subscription_history
    return get_subscription_history()
