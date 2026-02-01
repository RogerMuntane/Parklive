from flask import Blueprint
from controllers.reset_controller import send_reset_code, verify_and_reset_password

reset_routes = Blueprint("reset_routes", __name__)


@reset_routes.route("/api/auth/send-reset-code", methods=["POST"])
def route_send_reset_code():
    """Solicitar codi de reset de contrasenya"""
    return send_reset_code()


@reset_routes.route("/api/auth/verify-and-reset-password", methods=["POST"])
def route_verify_and_reset_password():
    """Verificar codi i canviar contrasenya"""
    return verify_and_reset_password()
