"""
google_auth_model.py
Servei per verificar tokens de Google OAuth i gestionar usuaris OAuth.
"""

import os
import requests
from models.base_service import BaseService
from shared.serializers import serialize_row
from models.stripe_model import create_stripe_customer


GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


class GoogleAuthService(BaseService):
    """Servei d'autenticació amb Google OAuth 2.0."""

    def verify_google_token(self, access_token: str) -> dict:
        """
        Verifica un access_token de Google OAuth 2.0 cridant l'endpoint
        userinfo de Google. Retorna les dades de l'usuari si el token és vàlid.

        Flux: initTokenClient() → requestAccessToken() → access_token
        """
        try:
            resp = requests.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10,
            )

            if resp.status_code != 200:
                return {
                    "error": "Token de Google invàlid o caducat",
                    "status_code": 401,
                }

            payload = resp.json()

            # Comprovar que l'email està verificat
            if not payload.get("email_verified", False):
                return {
                    "error": "L'email del compte Google no està verificat",
                    "status_code": 401,
                }

            return {
                "email": payload.get("email"),
                "name": payload.get("name", ""),
                "given_name": payload.get("given_name", ""),
                "family_name": payload.get("family_name", ""),
                "picture": payload.get("picture", ""),
                "google_id": payload.get("sub"),
            }

        except requests.RequestException as e:
            return self._handle_error(e, "Error de connexió amb Google", 502)

    def find_or_create_user(self, google_data: dict) -> dict:
        """
        Busca un usuari per email. Si no existeix, el crea amb les dades de Google.
        Retorna les dades de l'usuari serialitzades.
        """
        email = google_data["email"]

        # 1. Buscar si l'usuari ja existeix
        user = self._fetch_user_by_email(email)

        if user:
            
            # Si l'usuari ja existeix, comprovem si té stripe_customer_id
            if not user.get("stripe_customer_id"):
                create_stripe_customer(
                    user["id"],
                    email,
                    google_data.get("name", f"{google_data.get('given_name', '')} {google_data.get('family_name', '')}".strip())
                )
                # Tornar a carregar l'usuari amb el nou stripe_customer_id
                user = self._fetch_user_by_email(email)

            return {
                "user": serialize_row(user),
                "is_new": False,
            }

        # 2. Crear l'usuari amb les dades de Google (sense contrasenya)
        conn = self._get_connection()
        cursor = conn.cursor()

        # Usar el stored procedure existent i capturar els paràmetres de sortida directament
        # Passem un hash buit ja que l'auth és via Google
        google_password_placeholder = "GOOGLE_OAUTH_NO_PASSWORD"
        
        # callproc retorna una tupla amb els arguments (inclosos els OUT actualitzats)
        args = (
            google_data.get("given_name", google_data.get("name", "")),
            google_data.get("family_name", ""),
            email,
            google_password_placeholder,
            "",  # telefon buit
            "basic",  # tipus_usuari
            0,  # OUT p_nou_id (posició 6)
            "",  # OUT p_error_msg (posició 7)
        )
        
        result_args = cursor.callproc("sp_insertar_usuari", args)
        conn.commit()
        cursor.close()

        nou_id = result_args[6]
        error_msg = result_args[7]

        if not nou_id:
            return {
                "error": error_msg or "Error en crear l'usuari",
                "status_code": 400,
            }

        # 3. Crear client de Stripe per al nou usuari
        create_stripe_customer(
            nou_id,
            email,
            google_data.get("name", f"{google_data.get('given_name', '')} {google_data.get('family_name', '')}".strip())
        )

        # 4. Obtenir l'usuari creat
        user = self._fetch_user_by_email(email)

        return {
            "user": serialize_row(user) if user else {"id": nou_id, "email": email},
            "is_new": True,
        }
