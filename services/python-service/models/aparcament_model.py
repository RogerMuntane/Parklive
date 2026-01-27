from models.db_connection import get_db_connection


def get_all_aparcaments():
    """Obté tots els aparcaments de la base de dades"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = "SELECT * FROM aparcaments"
    cursor.execute(query)

    aparcaments = cursor.fetchall()
    cursor.close()

    return aparcaments
