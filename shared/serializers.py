"""
Serialitzadors per convertir tipus de dades no JSON serialitzables.
"""

from datetime import datetime, date, timedelta
from decimal import Decimal


def _repair_mojibake_text(value):
    """Intenta reparar textos UTF-8 mal interpretados como latin1/cp1252."""
    if not isinstance(value, str):
        return value

    # Heurística: patrones típicos de mojibake en catalán/español.
    suspicious_markers = ('Ã', 'Â', 'â€', 'ðŸ')
    if not any(marker in value for marker in suspicious_markers):
        return value

    # Intento principal: bytes latin1 que realmente eran UTF-8.
    try:
        repaired = value.encode('latin-1').decode('utf-8')
        return repaired
    except (UnicodeEncodeError, UnicodeDecodeError):
        pass

    # Fallback cp1252 -> utf8 para algunos dumps exportados en Windows.
    try:
        repaired = value.encode('cp1252').decode('utf-8')
        return repaired
    except (UnicodeEncodeError, UnicodeDecodeError):
        return value


def serialize_value(value):
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
        total_seconds = int(value.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    elif isinstance(value, Decimal):
        return float(value)
    elif isinstance(value, bytes):
        return value.decode('utf-8')
    elif isinstance(value, str):
        return _repair_mojibake_text(value)
    elif value is None:
        return None
    return value


def serialize_row(row):
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
    if rows is None:
        return []

    return [serialize_row(row) for row in rows]
