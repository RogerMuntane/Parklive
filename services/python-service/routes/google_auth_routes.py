from flask import Blueprint
from controllers.google_auth_controller import google_login, get_google_client_id

google_auth_routes = Blueprint("google_auth_routes", __name__)


@google_auth_routes.route("/api/auth/google", methods=["POST"])
def route_google_login():
    """Autenticació amb Google OAuth 2.0"""
    return google_login()


@google_auth_routes.route("/api/config/google-client-id", methods=["GET"])
def route_google_client_id():
    """Retorna el Google Client ID per al frontend"""
    return get_google_client_id()
