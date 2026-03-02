from flask import Blueprint
from controllers.reset_controller import send_reset_code

reset_routes = Blueprint("reset_routes", __name__)


@reset_routes.route("/api/auth/send-reset-code", methods=["POST"])
def route_send_reset_code():
    """Solicitar codi de reset de contrasenya"""
    return send_reset_code()
