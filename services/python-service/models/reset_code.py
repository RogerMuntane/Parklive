import hashlib
import os
import random
import string
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import bcrypt
from mysql.connector import Error

from models.base_service import BaseService
from models.email_sender import EmailSender


class ResetCodeService(BaseService):
    """Gestió de codis de recuperació de contrasenya."""

    def __init__(self, ttl_minutes: Optional[int] = None):
        super().__init__()
        self.ttl_minutes = ttl_minutes or int(
            os.getenv("RESET_CODE_TTL_MINUTES", 30)
        )
        self.email_sender = EmailSender()

    def _generate_code(self, length: int = 6) -> str:
        """Genera un codi alfanuméric aleatori (A-Z, a-z, 0-9)"""
        return "".join(random.choices(string.ascii_letters + string.digits, k=length))

    def _hash_code(self, code: str) -> str:
        """Encripta el codi amb SHA256 per emmagatzemar a BD"""
        return hashlib.sha256(code.encode("utf-8")).hexdigest()

    def create_and_send_code(self, email: str) -> Dict[str, Any]:
        """
        Crea un codi de reset, l'emmagatzema a BD i l'envia per email.
        """
        try:
            conn = self._get_connection()

            # Obtenir l'usuari
            user = self._fetch_user_by_email(email)
            if not user:
                return {"error": "Usuari no trobat", "status_code": 404}

            # Generar codi i hash
            code = self._generate_code()
            code_hash = self._hash_code(code)
            expires_at = datetime.utcnow() + timedelta(minutes=self.ttl_minutes)

            # Emmagatzemar codi a BD
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO codis_reset_contrasenya (usuari_id, code_hash, expires_at, used)"
                " VALUES (%s, %s, %s, %s)",
                (user["id"], code_hash, expires_at, False),
            )
            conn.commit()
            verification_id = cursor.lastrowid
            cursor.close()

            # Enviar email amb el codi
            self.email_sender.send_reset_code(email, code, self.ttl_minutes)

            return {
                "status": "ok",
                "verification_id": verification_id,
                "expires_at": expires_at.isoformat() + "Z",
                "status_code": 200,
            }
        except Error as db_error:
            print(f"ERROR BD: {str(db_error)}")
            return self._handle_error(
                db_error, "Error en enviar el codi de reset", 500
            )
        except Exception as ex:
            print(f"ERROR GENERAL: {type(ex).__name__}: {str(ex)}")
            import traceback
            traceback.print_exc()
            return self._handle_error(ex, "Error en enviar el codi", 500)

    def verify_code_and_reset_password(
        self, email: str, code: str, new_password: str
    ) -> Dict[str, Any]:
        """
        Verifica el codi de reset i canvia la contrasenya.
        Retorna un diccionari amb el resultat (status/error).
        """
        try:
            conn = self._get_connection()

            # Obtenir l'usuari
            user = self._fetch_user_by_email(email)
            if not user:
                return {"error": "Usuari no trobat", "status_code": 404}

            # Obtenir el codi de reset més recent i no usat
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT id, code_hash, expires_at, used FROM codis_reset_contrasenya "
                "WHERE usuari_id = %s AND used = FALSE ORDER BY created_at DESC LIMIT 1",
                (user["id"],),
            )
            reset_record = cursor.fetchone()
            cursor.close()

            if not reset_record:
                return {"error": "No hi ha codi de reset actiu", "status_code": 400}

            # Verificar si ha expirat
            expires_at = reset_record["expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(
                    expires_at.replace("Z", "+00:00")
                )

            if datetime.utcnow() > expires_at:
                return {"error": "El codi ha expirat", "status_code": 400}

            # Verificar el codi introduït
            code_hash = self._hash_code(code)
            if code_hash != reset_record["code_hash"]:
                return {"error": "Codi incorrecte", "status_code": 400}

            # Encriptar la nova contrasenya amb bcrypt
            password_hash = bcrypt.hashpw(
                new_password.encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8")

            # Actualitzar contrasenya i marcar codi com a usat
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE usuaris SET contrasenya_hash = %s WHERE id = %s",
                (password_hash, user["id"]),
            )
            cursor.execute(
                "UPDATE codis_reset_contrasenya SET used = TRUE, used_at = %s WHERE id = %s",
                (datetime.utcnow(), reset_record["id"]),
            )
            conn.commit()
            cursor.close()

            return {
                "status": "ok",
                "message": "Contrasenya canviada correctament",
                "status_code": 200,
            }

        except Error:
            return self._handle_error(
                Error(), "Error en canviar la contrasenya", 500
            )
        except Exception as ex:
            return self._handle_error(ex, "Error en canviar la contrasenya", 500)
