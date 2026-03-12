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

            # Validar que el compte no sigui OAuth (Google / Apple)
            OAUTH_PLACEHOLDERS = {
                # TODO ffer funcional el de apple i modificar-ho
                "GOOGLE_OAUTH_NO_PASSWORD", "APPLE_OAUTH_NO_PASSWORD"}
            pwd = user.get("contrasenya_hash", "")
            if pwd in OAUTH_PLACEHOLDERS:
                provider = "Google" if "GOOGLE" in pwd else "Apple"
                return {
                    "error": f"Aquest compte s'ha creat amb {provider}. "
                    f"Inicia sessió amb {provider} directament.",
                    "status_code": 400,
                }

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

    def verify_code_and_change_password(
        self,
        email: str,
        code: str,
        verification_id: int,
        new_password: str,
        confirm_password: str,
    ) -> Dict[str, Any]:
        """
        Verifica el codi de reset i canvia la contrasenya en un sol pas.
        """
        try:
            conn = self._get_connection()

            # 1. Validar camps obligatoris
            if not email or not code or not new_password or not confirm_password:
                return {"error": "Tots els camps són obligatoris", "status_code": 400}

            if new_password != confirm_password:
                return {"error": "Les contrasenyes no coincideixen", "status_code": 400}

            if len(new_password) < 8:
                return {
                    "error": "La contrasenya ha de tenir almenys 8 caràcters",
                    "status_code": 400,
                }

            # 2. Obtenir l'usuari
            user = self._fetch_user_by_email(email)
            if not user:
                return {"error": "Usuari no trobat", "status_code": 404}

            # 3. Obtenir el registre de reset
            cursor = conn.cursor(dictionary=True)

            if verification_id:
                cursor.execute(
                    "SELECT id, usuari_id, code_hash, expires_at, used "
                    "FROM codis_reset_contrasenya "
                    "WHERE id = %s AND usuari_id = %s LIMIT 1",
                    (verification_id, user["id"]),
                )
            else:
                # Agafar l'últim codi actiu de l'usuari
                cursor.execute(
                    "SELECT id, usuari_id, code_hash, expires_at, used "
                    "FROM codis_reset_contrasenya "
                    "WHERE usuari_id = %s AND used = 0 "
                    "ORDER BY created_at DESC LIMIT 1",
                    (user["id"],),
                )

            reset_record = cursor.fetchone()
            cursor.close()

            if not reset_record:
                return {"error": "No s'ha trobat cap codi de reset actiu", "status_code": 400}

            if reset_record.get("used"):
                return {"error": "Aquest codi ja ha estat utilitzat", "status_code": 400}

            # 4. Comprovar expiració
            expires_at = reset_record.get("expires_at")
            if expires_at and datetime.utcnow() > expires_at:
                return {"error": "El codi ha caducat. Demana'n un de nou.", "status_code": 400}

            # 5. Verificar el hash del codi
            expected_hash = reset_record.get("code_hash", "")
            code_hash = self._hash_code(code)
            if not expected_hash or code_hash != expected_hash:
                return {"error": "El codi introduït no és correcte", "status_code": 400}

            # 6. Canviar la contrasenya via stored procedure
            password_hash = bcrypt.hashpw(
                new_password.encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8")

            cursor = conn.cursor()
            cursor.execute('SET @actualitzat = 0, @error_msg = ""')
            cursor.execute(
                "CALL sp_actualitzar_contrasenya(%s, %s, @actualitzat, @error_msg)",
                (email, password_hash),
            )
            cursor.execute(
                "SELECT @actualitzat AS actualitzat, @error_msg AS error_msg"
            )
            out_row = cursor.fetchone()
            conn.commit()
            cursor.close()

            actualitzat = out_row[0] if out_row else False
            error_msg = out_row[1] if out_row else None

            if not actualitzat:
                return {
                    "error": error_msg or "Error al actualitzar la contrasenya",
                    "status_code": 500,
                }

            # 7. Marcar el codi com a usat
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE codis_reset_contrasenya SET used = 1, used_at = UTC_TIMESTAMP() WHERE id = %s",
                (reset_record["id"],),
            )
            conn.commit()
            cursor.close()

            return {
                "success": True,
                "message": "Contrasenya canviada correctament",
                "status_code": 200,
            }

        except Error as db_error:
            print(f"ERROR BD (verify): {str(db_error)}")
            return self._handle_error(db_error, "Error en verificar el codi", 500)
        except Exception as ex:
            print(f"ERROR GENERAL (verify): {type(ex).__name__}: {str(ex)}")
            import traceback
            traceback.print_exc()
            return self._handle_error(ex, "Error en canviar la contrasenya", 500)
