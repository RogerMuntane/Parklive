from flask import Blueprint
from controllers.stripe_controller import (
    get_payment_methods,
    detach_payment_method,
    get_setup_intent
)

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
