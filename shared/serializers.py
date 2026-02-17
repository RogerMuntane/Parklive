"""
<<<<<<< Updated upstream
Serialitzadors per convertir tipus de dades no JSON serialitzables.

Aquest mòdul es munta al contenidor Python via docker-compose (./shared -> /app/shared)
i ha d'existir perquè imports com `from shared.serializers import ...` funcionin.
"""

=======
Serialitzadors per convertir tipus de dades no JSON serialitzables
"""
>>>>>>> Stashed changes
from datetime import datetime, date, timedelta
from decimal import Decimal


def serialize_value(value):
<<<<<<< Updated upstream
    """Converteix un valor a un format serialitzable per JSON."""
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, timedelta):
=======
    """
    Converteix un valor a un format serialitzable per JSON

    Args:
        value: Valor a serialitzar

    Returns:
        Valor serialitzat compatible amb JSON
    """
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    elif isinstance(value, timedelta):
        # Converteix timedelta a string (format: "HH:MM:SS")
>>>>>>> Stashed changes
        total_seconds = int(value.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
<<<<<<< Updated upstream
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, bytes):
        return value.decode("utf-8")
=======
    elif isinstance(value, Decimal):
        return float(value)
    elif isinstance(value, bytes):
        return value.decode('utf-8')
    elif value is None:
        return None
>>>>>>> Stashed changes
    return value


def serialize_row(row):
<<<<<<< Updated upstream
    """Serialitza una fila (dict) de la base de dades."""
    if row is None:
        return None

    return {key: serialize_value(value) for key, value in row.items()}


def serialize_rows(rows):
    """Serialitza múltiples files (llista de dicts)."""
=======
    """
    Serialitza una fila (diccionari) de la base de dades

    Args:
        row: Diccionari amb dades d'una fila de MySQL

    Returns:
        Diccionari serialitzat compatible amb JSON
    """
    if row is None:
        return None

    serialized = {}
    for key, value in row.items():
        serialized[key] = serialize_value(value)
    return serialized


def serialize_rows(rows):
    """
    Serialitza múltiples files de la base de dades

    Args:
        rows: Llista de diccionaris amb dades de MySQL

    Returns:
        Llista de diccionaris serialitzats compatibles amb JSON
    """
>>>>>>> Stashed changes
    if rows is None:
        return []

    return [serialize_row(row) for row in rows]
