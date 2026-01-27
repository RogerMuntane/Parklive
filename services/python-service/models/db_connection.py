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
                use_unciode=True
            )
            if self.connection.is_connected():
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

# Mètode per accedir (si vols cridar connect() automàticament)


def get_db_connection():
    if db.connection is None or not db.connection.is_connected():
        db.connect()
    return db.connection
