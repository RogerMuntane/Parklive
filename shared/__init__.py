"""Utilitats compartides.

Aquest paquet es munta en temps d'execució dins el contenidor Python com /app/shared.
"""

from .serializers import serialize_row, serialize_rows, serialize_value

__all__ = ["serialize_value", "serialize_row", "serialize_rows"]
