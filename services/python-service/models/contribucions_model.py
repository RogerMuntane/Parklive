"""
Model per a la gestió de contribucions dels usuaris.

Aquest mòdul gestiona el registre d'informació sobre la disponibilitat de l'aparcament
al carrer (lliure/ocupat) reportada pels usuaris. Aquest sistema forma part de la
gamificació de Parklive, atorgant punts als usuaris que ajuden a mantenir les
dades actualitzades.
"""

from models.db_connection import get_new_connection
from datetime import datetime
from decimal import Decimal
import json


def serialize_value(value):
    """
    Converteix tipus de dades no serialitzables de MySQL a formats compatibles amb JSON.
    
    Args:
        value (Any): El valor a serialitzar (datetime, Decimal, etc.).
        
    Returns:
        Any: El valor convertit o l'original si ja és compatible.
    """
    if isinstance(value, (datetime)):
        return value.isoformat()
    elif isinstance(value, Decimal):
        return float(value)
    return value


def _extract_callproc_out_params(result_args):
    """
    Extreu de forma segura els paràmetres de sortida (OUT) d'una crida a un procediment emmagatzemat.
    
    Aquesta funció és tolerant a les diferències de format entre diferents versions 
    dels connectors MySQL per a Python.
    
    Args:
        result_args (list|tuple|dict): Els arguments retornats per cursor.callproc.
        
    Returns:
        tuple: (contribucio_id, error_msg) extrets dels paràmetres.
    """
    if isinstance(result_args, (list, tuple)) and len(result_args) >= 2:
        return result_args[-2], result_args[-1]

    if isinstance(result_args, dict):
        contribucio_id = result_args.get('p_contribucio_id')
        error_msg = result_args.get('p_error_msg')
        return contribucio_id, error_msg

    return None, 'No s\'han pogut recuperar els OUT params de la procedure'


def crear_contribucio(data):
    """
    Crea una nova contribució d'usuari reportant disponibilitat en una ubicació.
    
    El procés inclou:
    1. Validació de camps obligatoris i formats.
    2. Verificació de l'existència de l'usuari.
    3. Processament de dades JSON addicionals si n'hi ha.
    4. Execució del procediment 'sp_crear_contribucio' per garantir la consistència 
       i l'atorgament de punts de gamificació.
    5. Recuperació i serialització de la contribució creada.

    Args:
        data (dict): Dades del report: 'usuari_id', 'estat_reportat' (lliure/ocupat), 
                     'latitud', 'longitud' i opcionalment 'dades' (JSON).
        
    Returns:
        dict: Detalls de la contribució creada, incloent l'ID i els punts guanyats.
        
    Raises:
        RuntimeError: Si hi ha problemes de connexió amb la base de dades.
        ValueError: Si hi ha errors de validació en les dades d'entrada.
    """
    conn = get_new_connection()
    if not conn:
        raise RuntimeError("Base de dades no disponible")
    cursor = conn.cursor(dictionary=True)

    try:
        # Validar camps obligatoris
        required_fields = ['usuari_id', 'estat_reportat']
        for field in required_fields:
            if field not in data or data[field] is None:
                raise ValueError(f"El camp '{field}' és obligatori")

        estats_valids = ['lliure', 'ocupat']
        if data['estat_reportat'] not in estats_valids:
            raise ValueError(
                f"Estat reportat invàlid. Estats vàlids: {', '.join(estats_valids)}")

        # Validar que l'usuari existeix
        cursor.execute(
            "SELECT id, nom FROM usuaris WHERE id = %s", (data['usuari_id'],))
        usuari = cursor.fetchone()
        if not usuari:
            raise ValueError(
                f"L'usuari amb ID {data['usuari_id']} no existeix")

        # Preparar dades JSON
        dades_json = None
        if 'dades' in data and data['dades']:
            if isinstance(data['dades'], dict):
                dades_json = json.dumps(data['dades'])
            elif isinstance(data['dades'], str):
                try:
                    json.loads(data['dades'])
                    dades_json = data['dades']
                except json.JSONDecodeError:
                    raise ValueError("El camp 'dades' ha de ser JSON vàlid")

        # Punts atorgats per cada contribució de disponibilitat
        punts_guanyats = 5

        # Coordenades geogràfiques
        latitud = data.get('latitud')
        longitud = data.get('longitud')
        if latitud is None or longitud is None:
            raise ValueError("Cal informar 'latitud' i 'longitud'")

        # Crida al procediment emmagatzemat
        proc_args = [
            data['usuari_id'],
            data['estat_reportat'],
            dades_json,
            punts_guanyats,
            latitud,
            longitud,
            None,
            None
        ]
        result_args = cursor.callproc('sp_crear_contribucio', proc_args)
        conn.commit()

        contribucio_id, error_msg = _extract_callproc_out_params(result_args)

        # Fallback per a connectors que no retornen els OUT params correctament
        if (contribucio_id is None or str(contribucio_id).strip() in ('', '0')) and not error_msg:
            cursor.execute("SELECT LAST_INSERT_ID() AS contribucio_id")
            last_id_row = cursor.fetchone() or {}
            contribucio_id = last_id_row.get('contribucio_id')

        if error_msg:
            raise ValueError(error_msg)

        if not contribucio_id:
            raise ValueError("No s'ha pogut crear la contribució")

        # Recuperar el registre complet per confirmar la inserció
        cursor.execute("""
            SELECT
                c.id,
                c.usuari_id,
                u.nom as usuari_nom,
                c.estat_reportat,
                c.dades,
                c.punts_guanyats,
                c.latitud,
                c.longitud,
                c.created_at
            FROM contribucions c
            JOIN usuaris u ON c.usuari_id = u.id
            WHERE c.id = %s
        """, (contribucio_id,))

        contribucio = cursor.fetchone()
        cursor.close()

        if not contribucio:
            raise RuntimeError("Error en recuperar la contribució creada")

        return {
            'id': contribucio['id'],
            'usuari': {
                'id': contribucio['usuari_id'],
                'nom': contribucio['usuari_nom']
            },
            'estat_reportat': contribucio['estat_reportat'],
            'dades': json.loads(contribucio['dades']) if contribucio['dades'] else None,
            'punts_guanyats': contribucio['punts_guanyats'],
            'coordenades': {
                'latitud': serialize_value(contribucio['latitud']),
                'longitud': serialize_value(contribucio['longitud'])
            },
            'created_at': serialize_value(contribucio['created_at'])
        }

    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()


def get_contribucions_usuari(usuari_id, filters=None):
    """
    Obté l'historial de contribucions realitzades per un usuari.

    Args:
        usuari_id (int): ID de l'usuari.
        filters (dict, optional): Diccionari amb 'limit' i 'offset' per a paginació.
        
    Returns:
        list: Llista de contribucions amb ID, estat, punts i data.
    """
    if filters is None:
        filters = {}

    conn = get_new_connection()
    if not conn:
        return []
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT
            c.id,
            c.estat_reportat,
            c.punts_guanyats,
            c.created_at
        FROM contribucions c
        WHERE c.usuari_id = %s
    """

    params = [usuari_id]
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

    result = []
    for c in contribucions:
        result.append({
            'id': c['id'],
            'estat_reportat': c['estat_reportat'],
            'punts_guanyats': c['punts_guanyats'],
            'created_at': serialize_value(c['created_at'])
        })

    return result

