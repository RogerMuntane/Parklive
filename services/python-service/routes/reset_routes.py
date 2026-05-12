"""
Rutes de l'API per a la recuperació de contrasenyes oblidades.

Gestiona l'enviament de codis de verificació per correu electrònic i el posterior
canvi de contrasenya de l'usuari.
"""

from flask import Blueprint
from controllers.reset_controller import send_reset_code, verify_and_change_password

reset_routes = Blueprint("reset_routes", __name__)


@reset_routes.route("/api/auth/send-reset-code", methods=["POST"])
def route_send_reset_code():
    """
    Genera i envia un codi de seguretat a l'email de l'usuari.

    Returns:
        Response: JSON confirmant l'enviament o error.
    """
    return send_reset_code()


@reset_routes.route("/api/auth/verify-and-change-password", methods=["POST"])
def route_verify_and_change_password():
    """
    Valida el codi de reset i estableix la nova contrasenya.

    Returns:
        Response: JSON amb el resultat de l'actualització.
    """
    return verify_and_change_password()
