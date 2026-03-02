"""
Base class per a serveis que accedeixen a la BD.
Centralitza la lògica comuna de connexió i error handling.
"""

from typing import Any, Dict, Optional
from mysql.connector import Error

from models.db_connection import get_db_connection


class BaseService:
    """Classe base per a tots els serveis que accedeixen a la BD."""

    def __init__(self):
        self.conn = None

    def _get_connection(self):
        """Obté una connexió a la BD, creant-la si és necessari."""
        if not self.conn or not self.conn.is_connected():
            self.conn = get_db_connection()
        return self.conn

    def _fetch_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Obté un usuari per email (via procedure).
        Retorna un diccionari amb les dades de l'usuari, o None si no existeix.
        """
        conn = self._get_connection()
        if not conn:
            raise RuntimeError("Base de dades no disponible")

        cursor = conn.cursor(dictionary=True)
        cursor.callproc("sp_obtenir_usuari_per_email", (email,))

        # Obtenir el primer resultset del procedure
        user = None
        for result in cursor.stored_results():
            user = result.fetchone()
            break

        cursor.close()
        return user

    def _handle_error(
        self,
        error: Exception,
        default_message: str = "Error en processar la solicitud",
        status_code: int = 500,
    ) -> Dict[str, Any]:
        """
        Gestiona errors i retorna un diccionari amb el missatge d'error.
        No exposa detalls interns en producció.
        """
        if isinstance(error, Error):
            return {
                "error": "Error en accedir a la base de dades",
                "status_code": status_code,
            }
        return {
            "error": default_message,
            "status_code": status_code,
            "_exception": str(error),
        }

    def __del__(self):
        """Tanca la connexió quan l'objecte es destrueix."""
        if self.conn and self.conn.is_connected():
            self.conn.close()
