"""
Mòdul de gestió de la connexió a la base de dades MySQL.

Aquest mòdul centralitza la configuració i el manteniment de les connexions
amb el servidor MySQL. Proporciona una classe per al cicle de vida de la connexió,
una instància compartida i mètodes per obtenir connexions noves o persistents,
garantint la codificació de caràcters correcta (utf8mb4).
"""

import mysql.connector
from mysql.connector import Error
import os


class Database:
    """
    Classe per a la gestió del cicle de vida de les connexions a MySQL.
    """
    
    def __init__(self):
        """
        Inicialitza la instància amb una connexió inexistent.
        """
        self.connection = None

    def connect(self):
        """
        Estableix una nova connexió utilitzant les variables d'entorn.
        
        Configuracions clau:
        - utf8mb4: Per suportar emojis i caràcters especials.
        - buffered=True: Per permetre múltiples cursors i evitar errors de 
          'Commands out of sync' en llegir resultats.
        """
        try:
            self.connection = mysql.connector.connect(
                host=os.getenv('DB_HOST', 'localhost'),
                port=int(os.getenv('DB_PORT', 3306)),
                user=os.getenv('DB_USER', 'root'),
                password=os.getenv('DB_PASSWORD', ''),
                database=os.getenv('DB_NAME', ''),
                charset='utf8mb4',
                collation='utf8mb4_unicode_ci',
                use_unicode=True,
                buffered=True
            )
            if self.connection.is_connected():
                # Forçar codificació a nivell de sessió
                self.connection.set_charset_collation('utf8mb4', 'utf8mb4_unicode_ci')
                print("[DB] Connexió MySQL establerta correctament.")
        except Error as e:
            print(f"[DB] Error crítica en connectar a MySQL: {e}")

    def close(self):
        """
        Tanca de forma segura la connexió activa si existeix.
        """
        if self.connection is not None and self.connection.is_connected():
            self.connection.close()
            print("[DB] Connexió MySQL tancada.")


# Instància global (Singleton-like) per a ser compartida entre serveis
db = Database()


def get_db_connection():
    """
    Retorna la connexió global compartida, validant-ne l'estat.
    
    Utilitza 'ping' per comprovar si la connexió encara és viva. Si s'ha
    perdut (timeout, error de xarxa), intenta tancar-la i reconnectar de nou.
    
    Returns:
        mysql.connector.connection.MySQLConnection: Connexió activa a la base de dades.
    """
    try:
        if db.connection is not None and db.connection.is_connected():
            # Validar estat real de la connexió
            db.connection.ping(reconnect=False)
            return db.connection
    except Exception:
        # Fallback si el ping falla
        try:
            if db.connection: db.connection.close()
        except: pass
        db.connection = None

    db.connect()
    return db.connection


def get_new_connection():
    """
    Crea i retorna una connexió nova i totalment independent.
    
    Recomanat per a processos asíncrons, transaccions que requereixen aïllament
    o per evitar conflictes de cursors en entorns de molta concurrència.
    
    Returns:
        mysql.connector.connection.MySQLConnection|None: Nova connexió o None si falla.
    """
    try:
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', 3306)),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', ''),
            charset='utf8mb4',
            collation='utf8mb4_unicode_ci',
            use_unicode=True,
            buffered=True
        )
        if conn.is_connected():
            conn.set_charset_collation('utf8mb4', 'utf8mb4_unicode_ci')
        return conn
    except Error as e:
        print(f"[DB] Error creant connexió independent: {e}")
        return None

