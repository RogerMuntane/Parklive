"""
Servei d'autenticació OAuth 2.0 amb Google.

Verifica els access tokens emesos pel client de Google (initTokenClient),
gestiona el registre o la recuperació d'usuaris al sistema i crea automàticament
el perfil de client a Stripe per a nous registres.
"""

import os
import requests
from models.base_service import BaseService
from shared.serializers import serialize_row
from models.stripe_model import create_stripe_customer


GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


class GoogleAuthService(BaseService):
    """Servei d'autenticació i registre d'usuaris via Google OAuth 2.0."""

    def verify_google_token(self, access_token: str) -> dict:
        """
        Verifica un access_token de Google OAuth 2.0 cridant l'endpoint userinfo.

        Comprova que el token és vàlid i que l'email associat està verificat per Google.
        Retorna les dades pública de l'usuari (email, nom, foto, etc.).

        Flux esperat al client: `initTokenClient()` → `requestAccessToken()` → access_token.

        Args:
            access_token (str): Token d'accés OAuth 2.0 emitat per Google.

        Returns:
            dict: Dades de l'usuari (email, name, given_name, family_name, picture, google_id)
                  o diccionari amb 'error' i 'status_code' si el token no és vàlid.
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
        Busca un usuari existent per email o el crea amb les dades de Google.

        Si l'usuari existeix però no té `stripe_customer_id`, en crea un de nou.
        Si l'usuari no existeix, el registra via el stored procedure `sp_insertar_usuari`
        amb un placeholder de contrasenya (GOOGLE_OAUTH_NO_PASSWORD) i crea el perfil Stripe.

        Args:
            google_data (dict): Dades retornades per `verify_google_token`.

        Returns:
            dict: Diccionari amb 'user' (dades serialitzades) i 'is_new' (bool),
                  o amb 'error' i 'status_code' si falla la creació.
        """
        email = google_data["email"]

        # 1. Buscar si l'usuari ja existeix
        user = self._fetch_user_by_email(email)

        if user:
            # Comprovar si està suspès
            if user.get("estat") == "suspès":
                return {
                    "error": "El teu compte ha estat suspès. Si us plau, contacta amb suport.",
                    "status_code": 403,
                }

            
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
