"""
Model per a la gestió de codis de recuperació de contrasenya.

Aquest mòdul gestiona la generació, enviament per correu electrònic i verificació
de codis temporals per restablir la contrasenya dels usuaris. Inclou validacions
de seguretat contra comptes OAuth i la integració amb procediments emmagatzemats
per a l'actualització segura dels hashes de contrasenya.
"""

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
    """
    Servei per a la gestió del cicle de vida dels codis de recuperació.
    
    Aquest servei hereta de BaseService i s'encarrega de tota la lògica
    relacionada amb la pèrdua de contrasenyes, des de la petició inicial
    fins al canvi final.
    """

    def __init__(self, ttl_minutes: Optional[int] = None):
        """
        Inicialitza el servei de recuperació.
        
        Args:
            ttl_minutes (int, optional): Temps de vida del codi en minuts.
                                         Per defecte s'agafa de RESET_CODE_TTL_MINUTES o 30.
        """
        super().__init__()
        self.ttl_minutes = ttl_minutes or int(
            os.getenv("RESET_CODE_TTL_MINUTES", 30)
        )
        self.email_sender = EmailSender()

    def _generate_code(self, length: int = 6) -> str:
        """
        Genera un codi alfanumèric aleatori.
        
        Args:
            length (int): Longitud del codi a generar.
            
        Returns:
            str: Codi generat (p. ex: "A1b2C3").
        """
        return "".join(random.choices(string.ascii_letters + string.digits, k=length))

    def _hash_code(self, code: str) -> str:
        """
        Encripta el codi amb SHA256 per a l'emmagatzematge segur a la BD.
        
        Args:
            code (str): Codi en text pla.
            
        Returns:
            str: Hash SHA256 del codi.
        """
        return hashlib.sha256(code.encode("utf-8")).hexdigest()

    def create_and_send_code(self, email: str) -> Dict[str, Any]:
        """
        Genera un codi de recuperació, el guarda a la BD i l'envia per correu.
        
        El mètode verifica que l'usuari existeixi i que no sigui un compte
        creat mitjançant proveïdors externs (OAuth), ja que aquests no tenen
        contrasenya gestionada per Parklive.

        Args:
            email (str): Correu electrònic de l'usuari.
            
        Returns:
            dict: Resposta amb l'estat de l'operació, l'ID de verificació i data d'expiració.
        """
        try:
            conn = self._get_connection()

            # Obtenir l'usuari
            user = self._fetch_user_by_email(email)
            if not user:
                return {"error": "Usuari no trobat", "status_code": 404}

            # Validar que el compte no sigui OAuth (Google / Apple)
            OAUTH_PLACEHOLDERS = {
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
        Verifica la validesa d'un codi i actualitza la contrasenya de l'usuari.
        
        Aquest mètode realitza múltiples comprovacions:
        1. Validació de formats i coincidència de contrasenyes.
        2. Existència del registre de recuperació i l'usuari associat.
        3. Comprovació que el codi no hagi estat usat prèviament.
        4. Verificació de la data d'expiració (TTL).
        5. Validació del hash del codi introduït.
        6. Actualització de la contrasenya a la BD mitjançant un 'stored procedure'.
        7. Marcatge del codi com a utilitzat per evitar reús.

        Args:
            email (str): Correu de l'usuari.
            code (str): Codi rebut per l'usuari.
            verification_id (int): ID de la petició de reset.
            new_password (str): Nova contrasenya desitjada.
            confirm_password (str): Confirmació de la nova contrasenya.
            
        Returns:
            dict: Resultat de l'operació amb missatge d'èxit o error detallat.
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
                # Agafar l'últim codi actiu de l'usuari (fallback)
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

