"""
Base class per a serveis que accedeixen a la base de dades.

Aquest mòdul defineix l'abstracció base per a tots els serveis del sistema,
centralitzant la gestió de connexions MySQL, l'obtenció de perfils d'usuari
i el tractament estandarditzat d'excepcions.
"""

from typing import Any, Dict, Optional
from mysql.connector import Error

from models.db_connection import get_db_connection, get_new_connection


class BaseService:
    """
    Classe base que implementa funcionalitats comunes per als serveis de dades.
    
    Proporciona mètodes protegits per facilitar la interacció amb la base de dades
    i garantir una resposta d'error consistent a través de tota l'aplicació.
    """

    def __init__(self):
        """
        Inicialitza el servei gestionant la seva pròpia instància de connexió.
        """
        self.conn = None

    def _get_connection(self):
        """
        Obté o crea una connexió independent per a la instància del servei.
        
        Returns:
            mysql.connector.connection.MySQLConnection: La connexió activa.
        """
        if not self.conn or not self.conn.is_connected():
            self.conn = get_new_connection()
        return self.conn

    def _fetch_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Recupera el perfil complet d'un usuari mitjançant el seu correu electrònic.
        
        Utilitza el procediment emmagatzemat 'sp_obtenir_usuari_per_email' per garantir
        que s'obtenen tots els camps necessaris (incloses dades de rol i estat).

        Args:
            email (str): El correu electrònic a cercar.
            
        Returns:
            Optional[Dict[str, Any]]: Dades de l'usuari o None si no s'ha trobat.
            
        Raises:
            RuntimeError: Si no es pot establir connexió amb el servidor MySQL.
        """
        conn = self._get_connection()
        if not conn:
            raise RuntimeError("Base de dades no disponible")

        cursor = conn.cursor(dictionary=True)
        cursor.callproc("sp_obtenir_usuari_per_email", (email,))

        # Recuperar el primer conjunt de resultats (resultset) del procediment
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
        Normalitza les excepcions en un format de resposta JSON estàndard.
        
        Diferencia entre errors de base de dades (MySQL Error) i excepcions
        generals de Python per oferir missatges més precisos sense exposar
        detalls tècnics sensibles en producció.

        Args:
            error (Exception): L'excepció capturada.
            default_message (str): Missatge descriptiu per a l'usuari final.
            status_code (int): Codi d'estat HTTP recomanat per a la resposta.
            
        Returns:
            Dict[str, Any]: Diccionari amb la clau 'error' i metadades tècniques opcionals.
        """
        if isinstance(error, Error):
            return {
                "error": "Error de comunicació amb la base de dades",
                "status_code": status_code,
            }
        return {
            "error": default_message,
            "status_code": status_code,
            "_exception": str(error),
        }

    def __del__(self):
        """
        Destructor de la classe per assegurar el tancament de recursos.
        """
        if self.conn and self.conn.is_connected():
            self.conn.close()
