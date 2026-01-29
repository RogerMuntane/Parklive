import hashlib
import os
import random
import string
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from mysql.connector import Error

from models.db_connection import get_db_connection
from models.email_sender import EmailSender


class ResetCodeService:
    """Gestió de codis de recuperació de contrasenya."""

    def __init__(self, ttl_minutes: Optional[int] = None):
        self.ttl_minutes = ttl_minutes or int(
            os.getenv("RESET_CODE_TTL_MINUTES", 30))
        self.email_sender = EmailSender()

    def _generate_code(self, length: int = 6) -> str:
        return "".join(random.choices(string.digits, k=length))

    def _hash_code(self, code: str) -> str:
        return hashlib.sha256(code.encode("utf-8")).hexdigest()

    def _fetch_user(self, email: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        if not conn:
            raise RuntimeError("Base de dades no disponible")

        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, email FROM usuaris WHERE email = %s LIMIT 1", (email,))
        user = cursor.fetchone()
        cursor.close()
        return user

    def create_and_send_code(self, email: str) -> Dict[str, Any]:
        conn = get_db_connection()
        if not conn:
            raise RuntimeError("Base de dades no disponible")

        try:
            user = self._fetch_user(email)
            if not user:
                return {"error": "Usuari no trobat", "status_code": 404}

            code = self._generate_code()
            code_hash = self._hash_code(code)
            expires_at = datetime.utcnow() + timedelta(minutes=self.ttl_minutes)

            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO codis_reset_contrasenya (usuari_id, code_hash, expires_at, used)"
                " VALUES (%s, %s, %s, %s)",
                (user["id"], code_hash, expires_at, False),
            )
            conn.commit()
            verification_id = cursor.lastrowid
            cursor.close()

            self.email_sender.send_reset_code(email, code, self.ttl_minutes)

            return {
                "status": "ok",
                "verification_id": verification_id,
                "code_hash": code_hash,
                "expires_at": expires_at.isoformat() + "Z",
                "status_code": 200,
            }
        except Error:
            return {"error": "Error en accedir a la base de dades", "status_code": 500}
        except Exception as ex:
            # No exposem detalls interns
            return {"error": "Error en enviar el codi", "status_code": 500, "_exception": str(ex)}
