from models.db_connection import get_db_connection
from datetime import datetime, date, timedelta
from decimal import Decimal


def serialize_value(value):
    """Converteix tipus no serialitzables a formats JSON"""
    if isinstance(value, (datetime, date)):
        return value.isoformat()  # Converteix a string ISO format
    elif isinstance(value, timedelta):
        return str(value)  # Converteix timedelta a string
    elif isinstance(value, Decimal):
        return float(value)  # Converteix Decimal a float
    return value


def get_all_aparcaments():
    """Obté tots els aparcaments de la base de dades"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = "SELECT * FROM aparcaments"
    cursor.execute(query)

    aparcaments = cursor.fetchall()
    cursor.close()

    # Serialitza cada valor de cada registre
    serialized_aparcaments = []
    for aparcament in aparcaments:
        serialized_aparcament = {key: serialize_value(
            value) for key, value in aparcament.items()}
        serialized_aparcaments.append(serialized_aparcament)

    return serialized_aparcaments
