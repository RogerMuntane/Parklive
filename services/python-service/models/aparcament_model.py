from models.db_connection import get_db_connection
from shared.serializers import serialize_row
from datetime import datetime, date, timedelta
from decimal import Decimal
import math


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


def get_aparcament_by_id(aparcament_id):
    """Obté un aparcament per ID"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = "SELECT * FROM aparcaments WHERE id = %s AND estat != 'eliminat'"
    cursor.execute(query, (aparcament_id,))

    aparcament = cursor.fetchone()
    cursor.close()

    # Si no es troba, retorna None
    if aparcament is None:
        return None

    # Serialitzar les dades
    return serialize_row(aparcament)


def get_aparcaments_by_filters(filters):
    """
    Cerca aparcaments segons filtres especificats

    Retorna un dict amb:
    - total: Nombre total de resultats
    - resultats: Array d'aparcaments filtrats
    - paginacio: Info de paginació
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Construcció de la query base
    query = "SELECT * FROM aparcaments WHERE 1=1"
    params = []

    # Filtre per ciutat
    if filters.get('ciutat'):
        query += " AND ciutat LIKE %s"
        params.append(f"%{filters['ciutat']}%")

    # Filtre per tipus
    if filters.get('tipus'):
        valid_tipus = ['carrer', 'cobert', 'aire_lliure',
                       'subterrani', 'parking_public', 'parking_privat']
        if filters['tipus'] not in valid_tipus:
            raise ValueError(
                f"Tipus invàlid. Tipus vàlids: {', '.join(valid_tipus)}")
        query += " AND tipus = %s"
        params.append(filters['tipus'])

    # Filtres per tarifa per hora
    if filters.get('tarifa_hora_min') is not None:
        query += " AND tarifa_hora >= %s"
        params.append(filters['tarifa_hora_min'])

    if filters.get('tarifa_hora_max') is not None:
        query += " AND tarifa_hora <= %s"
        params.append(filters['tarifa_hora_max'])

    # Filtres per tarifa per dia
    if filters.get('tarifa_dia_min') is not None:
        query += " AND tarifa_dia >= %s"
        params.append(filters['tarifa_dia_min'])

    if filters.get('tarifa_dia_max') is not None:
        query += " AND tarifa_dia <= %s"
        params.append(filters['tarifa_dia_max'])

    # Filtre d'accessibilitat
    if filters.get('accessibilitat') is not None:
        query += " AND accessibilitat = %s"
        params.append(filters['accessibilitat'])

    # Filtre de càrrega elèctrica
    if filters.get('carrega_electrica') is not None:
        query += " AND carrega_electrica = %s"
        params.append(filters['carrega_electrica'])

    # Filtre de videovigilancia
    if filters.get('videovigilancia') is not None:
        query += " AND videovigilancia = %s"
        params.append(filters['videovigilancia'])

    # Filtre de obert 24 hores
    if filters.get('obert_24h') is not None:
        query += " AND obert_24h = %s"
        params.append(filters['obert_24h'])

    # Filtre d'estat
    if filters.get('estat'):
        valid_estats = ['actiu', 'inactiu', 'manteniment', 'complet']
        if filters['estat'] not in valid_estats:
            raise ValueError(
                f"Estat invàlid. Estats vàlids: {', '.join(valid_estats)}")
        query += " AND estat = %s"
        params.append(filters['estat'])

    # Filtre de valoració mínima
    if filters.get('valoracio_min') is not None:
        if filters['valoracio_min'] < 0 or filters['valoracio_min'] > 5:
            raise ValueError("Valoració mínima ha de ser entre 0 i 5")
        query += " AND valoracio_mitjana >= %s"
        params.append(filters['valoracio_min'])

    # Filtre de proximitat geogràfica (radi en km)
    if filters.get('latitud') is not None and filters.get('longitud') is not None:
        lat = filters['latitud']
        lon = filters['longitud']
        radi_km = filters.get('radi_km', 10)

        # Validar coordenades
        if lat < -90 or lat > 90:
            raise ValueError("Latitud ha de ser entre -90 i 90")
        if lon < -180 or lon > 180:
            raise ValueError("Longitud ha de ser entre -180 i 180")
        if radi_km <= 0:
            raise ValueError("Radi ha de ser positiu")

        query += """
        AND (
            6371 * 2 * ASIN(SQRT(
                POWER(SIN(RADIANS((%s - latitud) / 2)), 2) +
                COS(RADIANS(%s)) * COS(RADIANS(latitud)) *
                POWER(SIN(RADIANS((%s - longitud) / 2)), 2)
            ))
        ) <= %s
        """
        params.extend([lat, lat, lon, radi_km])

    # Query per comptar el total
    count_query = f"SELECT COUNT(*) as total FROM aparcaments WHERE 1=1"
    # Afegir els mateixos filtres a la query de count
    count_query_filtered = count_query
    count_params = params.copy()

    # Construir la query de count amb els mateixos filtres
    cursor.execute(query.replace("SELECT * FROM",
                   "SELECT COUNT(*) as total FROM"), params)
    total_result = cursor.fetchone()
    total = total_result['total'] if total_result else 0

    # Afegir paginació i ordenació
    limite = filters.get('limite', 20)
    offset = filters.get('offset', 0)

    if limite <= 0 or limite > 100:
        limite = 20
    if offset < 0:
        offset = 0

    query += " ORDER BY valoracio_mitjana DESC, aparcaments.id ASC"
    query += " LIMIT %s OFFSET %s"
    params.extend([limite, offset])

    # Executar la query
    cursor.execute(query, params)
    aparcaments = cursor.fetchall()
    cursor.close()
    conn.close()

    # Serialitzar els resultats
    serialized_aparcaments = []
    for aparcament in aparcaments:
        serialized_aparcament = {key: serialize_value(value)
                                 for key, value in aparcament.items()}
        serialized_aparcaments.append(serialized_aparcament)

    # Retornar resultats amb metadades de paginació
    return {
        'total': total,
        'resultats': serialized_aparcaments,
        'paginacio': {
            'limit': limite,
            'offset': offset,
            'pagina_actual': (offset // limite) + 1 if limite > 0 else 1,
            'total_pagines': math.ceil(total / limite) if limite > 0 else 1
        }
    }
