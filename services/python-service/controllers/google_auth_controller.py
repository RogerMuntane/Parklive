"""
google_auth_controller.py
Controlador per gestionar l'autenticació via Google OAuth 2.0.
"""

import os
from flask import request, jsonify
from models.google_auth_model import GoogleAuthService


def google_login():
    """
    Endpoint POST per autenticar-se amb Google.

    Body JSON:
    {
        "credential": "<token JWT de Google Identity Services>"
    }

    Retorna les dades de l'usuari si el token és vàlid.
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

        return jsonify({
            "success": True,
            "message": "Registre completat!" if is_new else "Sessió iniciada correctament",
            "user": user,
            "is_new": is_new,
        }), 200

    except Exception as e:
        return jsonify({"error": f"Error en l'autenticació amb Google: {str(e)}"}), 500


def get_google_client_id():
    """
    Endpoint GET que retorna el Google Client ID.
    El frontend el necessita per inicialitzar Google Identity Services.
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")

    if not client_id:
        return jsonify({"error": "GOOGLE_CLIENT_ID no configurat al servidor"}), 503

    return jsonify({"client_id": client_id}), 200
