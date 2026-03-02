import hashlib
import os
import random
import string
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

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
