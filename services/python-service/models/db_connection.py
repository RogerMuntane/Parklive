import mysql.connector
from mysql.connector import Error
import os


class Database:
    def __init__(self):
        self.connection = None

    def connect(self):
        """Configura la connexió amb els paràmetres del fitxer .env"""
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
                buffered=True  # Evita "Commands out of sync" en llegir resultats parcialment
            )
            if self.connection.is_connected():
                # Força charset/collation de sessió per evitar text mal decodificat.
                self.connection.set_charset_collation('utf8mb4', 'utf8mb4_unicode_ci')
                print("Connexió a la base de dades MySQL establerta amb èxit!")
        except Error as e:
            print(f"Error en connectar a MySQL: {e}")

    def close(self):
        """Tanca la connexió"""
        if self.connection is not None and self.connection.is_connected():
            self.connection.close()
            print("Connexió amb MySQL tancada.")


# Crea una instància global reutilitzable del Database
db = Database()


def get_db_connection():
    """
    Retorna la connexió global, reconnectant si és necessari.
    Per evitar 'Commands out of sync' amb peticions concurrent paral·leles,
    es desconnecta i reconnecta sempre que la connexió estigui en mal estat.
    """
    try:
        if db.connection is not None and db.connection.is_connected():
            # Ping per detectar si la connexió és realment usable
            db.connection.ping(reconnect=False)
            return db.connection
    except Exception:
        # Si el ping falla, tanquem i reconnectem
        try:
            db.connection.close()
        except Exception:
            pass
        db.connection = None

    db.connect()
    return db.connection


def get_new_connection():
    """
    Crea i retorna una connexió nova independent.
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
        print(f"[DB] Error creant connexió nova: {e}")
        return None
