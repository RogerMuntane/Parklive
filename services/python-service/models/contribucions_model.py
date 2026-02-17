from models.db_connection import get_db_connection
from datetime import datetime
from decimal import Decimal
import json


def serialize_value(value):
    """Converteix tipus no serialitzables a formats JSON"""
    if isinstance(value, (datetime)):
        return value.isoformat()
    elif isinstance(value, Decimal):
        return float(value)
    return value


def crear_contribucio(data):
    """
    Crea una nova contribució d'usuari

    Paràmetres esperats en data:
    - usuari_id: ID de l'usuari (requerit)
    - aparcament_id: ID de l'aparcament (requerit)
    - tipus: 'disponibilitat', 'foto', 'informacio', 'correccio' (requerit)
    - estat_reportat: 'lliure', 'ocupat', 'parcial' (opcional, només per tipus 'disponibilitat')
    - dades: diccionari amb dades addicionals (opcional)
    - latitud: latitud de la ubicació (opcional)
    - longitud: longitud de la ubicació (opcional)

    Retorna:
    - Dades de la contribució creada
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Validar camps obligatoris
        required_fields = ['usuari_id', 'aparcament_id', 'tipus']
        for field in required_fields:
            if field not in data or data[field] is None:
                raise ValueError(f"El camp '{field}' és obligatori")

        # Validar tipus
        tipus_valids = ['disponibilitat', 'foto', 'informacio', 'correccio']
        if data['tipus'] not in tipus_valids:
            raise ValueError(f"Tipus invàlid. Tipus vàlids: {', '.join(tipus_valids)}")

        # Validar que l'usuari existeix
        cursor.execute("SELECT id, nom FROM usuaris WHERE id = %s", (data['usuari_id'],))
        usuari = cursor.fetchone()
        if not usuari:
            raise ValueError(f"L'usuari amb ID {data['usuari_id']} no existeix")

        # Validar que l'aparcament existeix
        cursor.execute("SELECT id, nom, latitud, longitud FROM aparcaments WHERE id = %s", (data['aparcament_id'],))
        aparcament = cursor.fetchone()
        if not aparcament:
            raise ValueError(f"L'aparcament amb ID {data['aparcament_id']} no existeix")

        # Validar estat_reportat només per tipus 'disponibilitat'
        estat_reportat = None
        if data['tipus'] == 'disponibilitat':
            if 'estat_reportat' not in data or not data['estat_reportat']:
                raise ValueError("El camp 'estat_reportat' és obligatori per tipus 'disponibilitat'")

            estats_valids = ['lliure', 'ocupat', 'parcial']
            if data['estat_reportat'] not in estats_valids:
                raise ValueError(f"Estat reportat invàlid. Estats vàlids: {', '.join(estats_valids)}")

            estat_reportat = data['estat_reportat']

        # Preparar dades JSON
        dades_json = None
        if 'dades' in data and data['dades']:
            if isinstance(data['dades'], dict):
                dades_json = json.dumps(data['dades'])
            elif isinstance(data['dades'], str):
                # Validar que és JSON vàlid
                try:
                    json.loads(data['dades'])
                    dades_json = data['dades']
                except json.JSONDecodeError:
                    raise ValueError("El camp 'dades' ha de ser JSON vàlid")

        # Determinar punts guanyats segons el tipus
        punts_map = {
            'disponibilitat': 5,
            'foto': 10,
            'informacio': 15,
            'correccio': 20
        }
        punts_guanyats = punts_map.get(data['tipus'], 5)

        # Usar coordenadas del aparcamiento si no se proporcionan
        latitud = data.get('latitud') or aparcament['latitud']
        longitud = data.get('longitud') or aparcament['longitud']

        # Inserir la nova contribució
        insert_query = """
            INSERT INTO contribucions (
                usuari_id,
                aparcament_id,
                tipus,
                estat_reportat,
                dades,
                validada,
                punts_guanyats,
                latitud,
                longitud
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        values = (
            data['usuari_id'],
            data['aparcament_id'],
            data['tipus'],
            estat_reportat,
            dades_json,
            False,  # Validada per defecte és FALSE
            punts_guanyats,
            latitud,
            longitud
        )

        cursor.execute(insert_query, values)
        conn.commit()

        contribucio_id = cursor.lastrowid

        # Obtenir la contribució creada
        cursor.execute("""
            SELECT
                c.id,
                c.usuari_id,
                u.nom as usuari_nom,
                c.aparcament_id,
                a.nom as aparcament_nom,
                c.tipus,
                c.estat_reportat,
                c.dades,
                c.validada,
                c.punts_guanyats,
                c.latitud,
                c.longitud,
                c.created_at
            FROM contribucions c
            JOIN usuaris u ON c.usuari_id = u.id
            JOIN aparcaments a ON c.aparcament_id = a.id
            WHERE c.id = %s
        """, (contribucio_id,))

        contribucio = cursor.fetchone()
        cursor.close()
        conn.close()

        if not contribucio:
            raise Exception("Error en recuperar la contribució creada")

        # Serialitzar resposta
        return {
            'id': contribucio['id'],
            'usuari': {
                'id': contribucio['usuari_id'],
                'nom': contribucio['usuari_nom']
            },
            'aparcament': {
                'id': contribucio['aparcament_id'],
                'nom': contribucio['aparcament_nom']
            },
            'tipus': contribucio['tipus'],
            'estat_reportat': contribucio['estat_reportat'],
            'dades': json.loads(contribucio['dades']) if contribucio['dades'] else None,
            'validada': bool(contribucio['validada']),
            'punts_guanyats': contribucio['punts_guanyats'],
            'coordenades': {
                'latitud': serialize_value(contribucio['latitud']),
                'longitud': serialize_value(contribucio['longitud'])
            },
            'created_at': serialize_value(contribucio['created_at'])
        }

    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        raise e


def get_contribucions_usuari(usuari_id, filters=None):
    """
    Obté totes les contribucions d'un usuari

    Filtres opcionals:
    - tipus: tipus de contribució
    - validada: només contribucions validades
    - limit: límit de resultats
    - offset: offset per paginació
    """
    if filters is None:
        filters = {}

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT
            c.id,
            c.tipus,
            c.estat_reportat,
            c.validada,
            c.punts_guanyats,
            c.created_at,
            a.nom as aparcament_nom,
            a.ciutat
        FROM contribucions c
        JOIN aparcaments a ON c.aparcament_id = a.id
        WHERE c.usuari_id = %s
    """

    params = [usuari_id]

    # Filtre per tipus
    if filters.get('tipus'):
        query += " AND c.tipus = %s"
        params.append(filters['tipus'])

    # Filtre per validada
    if filters.get('validada') is not None:
        query += " AND c.validada = %s"
        params.append(filters['validada'])

    query += " ORDER BY c.created_at DESC"

    # Paginació
    limit = filters.get('limit', 20)
    offset = filters.get('offset', 0)

    query += " LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    cursor.execute(query, params)
    contribucions = cursor.fetchall()
    cursor.close()
    conn.close()

    # Serialitzar
    result = []
    for c in contribucions:
        result.append({
            'id': c['id'],
            'tipus': c['tipus'],
            'estat_reportat': c['estat_reportat'],
            'validada': bool(c['validada']),
            'punts_guanyats': c['punts_guanyats'],
            'aparcament_nom': c['aparcament_nom'],
            'ciutat': c['ciutat'],
            'created_at': serialize_value(c['created_at'])
        })

    return result