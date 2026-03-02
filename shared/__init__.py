# shared/__init__.py
"""
Mòdul compartit amb utilitats comunes
"""
from .serializers import serialize_value, serialize_row, serialize_rows

__all__ = ['serialize_value', 'serialize_row', 'serialize_rows']
