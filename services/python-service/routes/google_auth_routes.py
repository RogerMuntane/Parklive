"""
Rutes de l'API per a l'autenticació mitjançant Google OAuth 2.0.

Gestiona el login social i proporciona la configuració del client necessària
perquè el frontend iniciï el flux d'autenticació.
"""

from flask import Blueprint
from controllers.google_auth_controller import google_login, get_google_client_id

google_auth_routes = Blueprint("google_auth_routes", __name__)


@google_auth_routes.route("/api/auth/google", methods=["POST"])
def route_google_login():
    """
    Processa el token d'identitat de Google i autentica l'usuari.

    Returns:
        Response: JSON amb les dades de l'usuari i token JWT si és correcte.
    """
    return google_login()


@google_auth_routes.route("/api/config/google-client-id", methods=["GET"])
def route_google_client_id():
    """
    Retorna el Google Client ID configurat al servidor.

    Returns:
        Response: JSON amb el client_id per al frontend.
    """
    return get_google_client_id()
