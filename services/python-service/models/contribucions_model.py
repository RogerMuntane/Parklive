from models.db_connection import get_new_connection
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


def _extract_callproc_out_params(result_args):
    """Extreu OUT params de callproc tolerant tuple/list/dict formats."""
    if isinstance(result_args, (list, tuple)) and len(result_args) >= 2:
        return result_args[-2], result_args[-1]

    if isinstance(result_args, dict):
        contribucio_id = result_args.get('p_contribucio_id')
        error_msg = result_args.get('p_error_msg')
        return contribucio_id, error_msg

    return None, 'No s\'han pogut recuperar els OUT params de la procedure'


def crear_contribucio(data):
    """
    Crea una nova contribució d'usuari
    ...
    Retorna:
    - Dades de la contribució creada
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
                # Validar que és JSON vàlid
                try:
                    json.loads(data['dades'])
                    dades_json = data['dades']
                except json.JSONDecodeError:
                    raise ValueError("El camp 'dades' ha de ser JSON vàlid")

        # Les contribucions ara són sempre de disponibilitat
        punts_guanyats = 5

        # Les coordenades són obligatòries perquè la contribució és independent d'aparcaments.
        latitud = data.get('latitud')
        longitud = data.get('longitud')
        if latitud is None or longitud is None:
            raise ValueError("Cal informar 'latitud' i 'longitud'")

        # Procedure equivalent: sp_crear_contribucio(..., OUT contribucio_id, OUT error_msg)
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

        # Alguns connectors no retornen els OUT params de forma consistent.
        if (contribucio_id is None or str(contribucio_id).strip() in ('', '0')) and not error_msg:
            cursor.execute("SELECT LAST_INSERT_ID() AS contribucio_id")
            last_id_row = cursor.fetchone() or {}
            contribucio_id = last_id_row.get('contribucio_id')

        if error_msg:
            raise ValueError(error_msg)

        if not contribucio_id:
            raise ValueError("No s'ha pogut crear la contribució")

        # Obtenir la contribució creada
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

        # Serialitzar resposta
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
    Obté totes les contribucions d'un usuari
    ...
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

    # Serialitzar
    result = []
    for c in contribucions:
        result.append({
            'id': c['id'],
            'estat_reportat': c['estat_reportat'],
            'punts_guanyats': c['punts_guanyats'],
            'created_at': serialize_value(c['created_at'])
        })

    return result
