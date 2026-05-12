"""
Controlador per a l'autenticació d'usuaris via Google OAuth 2.0.

Gestiona el flux d'autenticació amb access tokens de Google: verifica el token,
crea o recupera l'usuari a la BD local, genera el JWT de sessió i retorna
el perfil de client de Stripe si ja existia. També exposa el Google Client ID
per a la inicialització del client de Google Identity Services al frontend.
"""

import os
from flask import request, jsonify
from models.google_auth_model import GoogleAuthService


def google_login():
    """
    POST /api/auth/google - Autentica o registra un usuari via Google OAuth 2.0.

    Verifica l'access_token amb l'endpoint userinfo de Google, crea o recupera
    l'usuari a la BD local, i retorna un JWT de sessió compatible amb el sistema.

    Body JSON:
        access_token (str): Access token obtingut pel client via Google Identity Services.

    Returns:
        JSON 200: success, message, user (perfil), token (JWT) i is_new (bool).
        JSON 400: Si falta 'access_token' o el token no és vàlid.
        JSON 401: Si l'email del compte Google no està verificat.
        JSON 500: Error intern en el procés d'autenticació.
    """
    try:
        if not request.is_json:
            return jsonify({"error": "El contingut ha de ser JSON"}), 400

        data = request.get_json()
        access_token = data.get("access_token", "").strip()

        if not access_token:
            return jsonify({"error": "Falta el camp 'access_token'"}), 400

        service = GoogleAuthService()

        # 1. Verificar l'access token amb Google userinfo
        google_data = service.verify_google_token(access_token)

        if "error" in google_data:
            status = google_data.pop("status_code", 401)
            return jsonify(google_data), status

        # 2. Trobar o crear l'usuari a la BD
        result = service.find_or_create_user(google_data)

        if "error" in result:
            status = result.pop("status_code", 400)
            return jsonify(result), status

        user = result["user"]
        is_new = result["is_new"]

        # Marca el provider com a google
        if user:
            user["provider"] = "google"

        # Generar el token JWT
        from middleware.jwt_auth import generate_jwt_token
        token = generate_jwt_token(user)

        return jsonify({
            "success": True,
            "message": "Registre completat!" if is_new else "Sessió iniciada correctament",
            "user": user,
            "token": token,
            "is_new": is_new,
        }), 200

    except Exception as e:
        return jsonify({"error": f"Error en l'autenticació amb Google: {str(e)}"}), 500


def get_google_client_id():
    """
    GET /api/auth/google/client-id - Retorna el Google Client ID públic.

    El frontend el necessita per inicialitzar Google Identity Services
    (`initTokenClient`) abans de sol·licitar l'accés a l'usuari.

    Returns:
        JSON 200: client_id configurat al servidor.
        JSON 503: Si GOOGLE_CLIENT_ID no està configurat a l'entorn.
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")

    if not client_id:
        return jsonify({"error": "GOOGLE_CLIENT_ID no configurat al servidor"}), 503

    return jsonify({"client_id": client_id}), 200
