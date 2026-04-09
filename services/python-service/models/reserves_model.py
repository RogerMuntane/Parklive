from models.db_connection import get_db_connection
from datetime import datetime, date, timedelta
from decimal import Decimal
import math


def serialize_value(value):
    """Converteix tipus no serialitzables a formats JSON"""
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    elif isinstance(value, timedelta):
        return str(value)
    elif isinstance(value, Decimal):
        return float(value)
    return value


def get_reserves_usuari(usuari_id, filters=None):
    """
    Obté totes les reserves d'un usuari amb filtres opcionals

    Filtres disponibles:
    - estat: pendent, confirmada, en_curs, completada, cancel·lada
    - data_desde: data mínima (format YYYY-MM-DD)
    - data_fins: data màxima (format YYYY-MM-DD)
    - aparcament_id: filtre per aparcament específic
    - limit: límit de resultats (per defecte 20, màxim 100)
    - offset: offset per paginació
    """
    if filters is None:
        filters = {}

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Si només s'usen filtres compatibles, delegar al procedure
    procedure_supported_filters = {'estat', 'limit', 'offset'}
    unsupported_filters = {
        key for key, value in filters.items()
        if value is not None and key not in procedure_supported_filters
    }

    if not unsupported_filters:
        estat = filters.get('estat')
        valid_estats = ['pendent', 'confirmada',
                        'en_curs', 'completada', 'cancel·lada']
        if estat and estat not in valid_estats:
            raise ValueError(
                f"Estat invàlid. Estats vàlids: {', '.join(valid_estats)}")

        limit = filters.get('limit', 20)
        offset = filters.get('offset', 0)

        if limit <= 0 or limit > 100:
            limit = 20
        if offset < 0:
            offset = 0

        # Procedure equivalent: sp_obtenir_historial_reserves(usuari_id, estat, limit, offset)
        cursor.callproc('sp_obtenir_historial_reserves', [
                        usuari_id, estat, limit, offset])

        reserves_rows = []
        for result in cursor.stored_results():
            reserves_rows = result.fetchall()
            break

        cursor.close()
        conn.close()

        reserves = []
        for row in reserves_rows:
            pagaments = []
            if row.get('pagament_id') is not None:
                pagaments.append({
                    'id': row['pagament_id'],
                    'import': None,
                    'metode': row['pagament_metode'],
                    'estat': row['pagament_estat'],
                    'data_pagament': serialize_value(row['data_pagament'])
                })

            reserves.append({
                'id': row['id'],
                'codi_reserva': row['codi_reserva'],
                'usuari_id': usuari_id,
                'aparcament': {
                    'id': row['aparcament_id'],
                    'nom': row['aparcament_nom'],
                    'adreca': row['aparcament_adreca'],
                    'ciutat': row['aparcament_ciutat'],
                    'tipus': row['aparcament_tipus'],
                    'latitud': serialize_value(row['aparcament_latitud']),
                    'longitud': serialize_value(row['aparcament_longitud']),
                    'tarifa_hora': None,
                    'tarifa_dia': None
                },
                'data_entrada': serialize_value(row['data_entrada']),
                'data_sortida': serialize_value(row['data_sortida']),
                'estat': row['estat'],
                'preu_total': serialize_value(row['preu_total']),
                'descompte_aplicat': serialize_value(row['descompte_aplicat']),
                'notes': row['notes'],
                'pagaments': pagaments,
                'created_at': serialize_value(row['created_at']),
                'updated_at': serialize_value(row['updated_at'])
            })

        total = len(reserves)
        return {
            'total': total,
            'reserves': reserves,
            'paginacio': {
                'limit': limit,
                'offset': offset,
                'pagina_actual': (offset // limit) + 1 if limit > 0 else 1,
                'total_pagines': math.ceil(total / limit) if limit > 0 else 1
            }
        }

    # Query base amb informació de l'aparcament i pagament
    query = """
    SELECT
        r.id,
        r.codi_reserva,
        r.usuari_id,
        r.aparcament_id,
        r.data_entrada,
        r.data_sortida,
        r.estat,
        r.preu_total,
        r.descompte_aplicat,
        r.notes,
        r.created_at,
        r.updated_at,
        a.nom as aparcament_nom,
        a.adreca,
        a.ciutat,
        a.tipus as aparcament_tipus,
        a.latitud,
        a.longitud,
        a.tarifa_hora,
        a.tarifa_dia,
        p.id as pagament_id,
        p.import as pagament_import,
        p.metode as pagament_metode,
        p.estat as pagament_estat,
        p.data_pagament
    FROM reserves r
    JOIN aparcaments a ON r.aparcament_id = a.id
    LEFT JOIN pagaments p ON r.id = p.reserva_id
    WHERE r.usuari_id = %s
    """

    params = [usuari_id]

    # Filtre per estat
    if filters.get('estat'):
        valid_estats = ['pendent', 'confirmada',
                        'en_curs', 'completada', 'cancel·lada']
        if filters['estat'] not in valid_estats:
            raise ValueError(
                f"Estat invàlid. Estats vàlids: {', '.join(valid_estats)}")
        query += " AND r.estat = %s"
        params.append(filters['estat'])

    # Filtre per data mínima
    if filters.get('data_desde'):
        try:
            datetime.strptime(filters['data_desde'], '%Y-%m-%d')
            query += " AND r.data_entrada >= %s"
            params.append(filters['data_desde'])
        except ValueError:
            raise ValueError("Format de data_desde invàlid (usar YYYY-MM-DD)")

    # Filtre per data màxima
    if filters.get('data_fins'):
        try:
            datetime.strptime(filters['data_fins'], '%Y-%m-%d')
            query += " AND r.data_sortida <= %s"
            params.append(filters['data_fins'])
        except ValueError:
            raise ValueError("Format de data_fins invàlid (usar YYYY-MM-DD)")

    # Filtre per aparcament específic
    if filters.get('aparcament_id'):
        query += " AND r.aparcament_id = %s"
        params.append(filters['aparcament_id'])

    # Ordenar per data més recent
    query += " ORDER BY r.data_entrada DESC"

    # Paginació
    limit = filters.get('limit', 20)
    offset = filters.get('offset', 0)

    if limit <= 0 or limit > 100:
        limit = 20
    if offset < 0:
        offset = 0

    # Contar total de resultats
    count_query = query.replace(
        "SELECT r.id, r.codi_reserva, r.usuari_id, r.aparcament_id, r.data_entrada, r.data_sortida, r.estat, r.preu_total, r.descompte_aplicat, r.notes, r.created_at, r.updated_at, a.nom as aparcament_nom, a.adreca, a.ciutat, a.tipus as aparcament_tipus, a.latitud, a.longitud, a.tarifa_hora, a.tarifa_dia, p.id as pagament_id, p.import as pagament_import, p.metode as pagament_metode, p.estat as pagament_estat, p.data_pagament",
        "SELECT COUNT(DISTINCT r.id) as total"
    ).split(" ORDER BY")[0]

    cursor.execute(count_query, params)
    total_result = cursor.fetchone()
    total = total_result['total'] if total_result else 0

    # Afegir límit i offset
    query += " LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    # Executar query
    cursor.execute(query, params)
    reserves_raw = cursor.fetchall()
    cursor.close()
    conn.close()

    # Agrupar reserves amb els seus pagaments
    reserves_dict = {}
    for row in reserves_raw:
        reserve_id = row['id']

        if reserve_id not in reserves_dict:
            reserves_dict[reserve_id] = {
                'id': row['id'],
                'codi_reserva': row['codi_reserva'],
                'usuari_id': row['usuari_id'],
                'aparcament': {
                    'id': row['aparcament_id'],
                    'nom': row['aparcament_nom'],
                    'adreca': row['adreca'],
                    'ciutat': row['ciutat'],
                    'tipus': row['aparcament_tipus'],
                    'latitud': serialize_value(row['latitud']),
                    'longitud': serialize_value(row['longitud']),
                    'tarifa_hora': serialize_value(row['tarifa_hora']),
                    'tarifa_dia': serialize_value(row['tarifa_dia'])
                },
                'data_entrada': serialize_value(row['data_entrada']),
                'data_sortida': serialize_value(row['data_sortida']),
                'estat': row['estat'],
                'preu_total': serialize_value(row['preu_total']),
                'descompte_aplicat': serialize_value(row['descompte_aplicat']),
                'notes': row['notes'],
                'pagaments': [],
                'created_at': serialize_value(row['created_at']),
                'updated_at': serialize_value(row['updated_at'])
            }

        # Afegir pagament si existeix
        if row['pagament_id'] is not None:
            reserves_dict[reserve_id]['pagaments'].append({
                'id': row['pagament_id'],
                'import': serialize_value(row['pagament_import']),
                'metode': row['pagament_metode'],
                'estat': row['pagament_estat'],
                'data_pagament': serialize_value(row['data_pagament'])
            })

    # Convertir a llista
    reserves = list(reserves_dict.values())

    return {
        'total': total,
        'reserves': reserves,
        'paginacio': {
            'limit': limit,
            'offset': offset,
            'pagina_actual': (offset // limit) + 1 if limit > 0 else 1,
            'total_pagines': math.ceil(total / limit) if limit > 0 else 1
        }
    }


def get_totes_reserves(filters=None):
    """
    Obté totes les reserves (per a administradors)

    Filtres disponibles:
    - usuari_id: filtre per usuari
    - aparcament_id: filtre per aparcament
    - estat: pendent, confirmada, en_curs, completada, cancel·lada
    - data_desde: data mínima
    - data_fins: data màxima
    """
    if filters is None:
        filters = {}

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
    SELECT
        r.id,
        r.codi_reserva,
        r.usuari_id,
        u.nom as usuari_nom,
        u.email as usuari_email,
        r.aparcament_id,
        a.nom as aparcament_nom,
        a.ciutat,
        r.data_entrada,
        r.data_sortida,
        r.estat,
        r.preu_total,
        r.descompte_aplicat,
        r.created_at,
        p.estat as pagament_estat
    FROM reserves r
    JOIN usuaris u ON r.usuari_id = u.id
    JOIN aparcaments a ON r.aparcament_id = a.id
    LEFT JOIN pagaments p ON r.id = p.reserva_id
    WHERE 1=1
    """

    params = []

    # Aplicar filtres
    if filters.get('usuari_id'):
        query += " AND r.usuari_id = %s"
        params.append(filters['usuari_id'])

    if filters.get('aparcament_id'):
        query += " AND r.aparcament_id = %s"
        params.append(filters['aparcament_id'])

    if filters.get('estat'):
        valid_estats = ['pendent', 'confirmada',
                        'en_curs', 'completada', 'cancel·lada']
        if filters['estat'] not in valid_estats:
            raise ValueError("Estat invàlid")
        query += " AND r.estat = %s"
        params.append(filters['estat'])

    if filters.get('data_desde'):
        query += " AND r.data_entrada >= %s"
        params.append(filters['data_desde'])

    if filters.get('data_fins'):
        query += " AND r.data_sortida <= %s"
        params.append(filters['data_fins'])

    # Paginació
    limit = filters.get('limit', 20)
    offset = filters.get('offset', 0)

    if limit <= 0 or limit > 100:
        limit = 20
    if offset < 0:
        offset = 0

    # Contar total sense ORDER BY
    count_query = query + " GROUP BY r.id"
    cursor.execute(
        f"SELECT COUNT(*) as total FROM ({count_query}) as subquery", params)
    total_row = cursor.fetchone()
    total = total_row['total'] if total_row else 0

    query += " ORDER BY r.data_entrada DESC"
    query += " LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    cursor.execute(query, params)
    reserves = cursor.fetchall()
    cursor.close()
    conn.close()

    # Serialitzar
    serialized_reserves = []
    for r in reserves:
        serialized_reserves.append({
            'id': r['id'],
            'codi_reserva': r['codi_reserva'],
            'usuari': {
                'id': r['usuari_id'],
                'nom': r['usuari_nom'],
                'email': r['usuari_email']
            },
            'aparcament': {
                'id': r['aparcament_id'],
                'nom': r['aparcament_nom'],
                'ciutat': r['ciutat']
            },
            'data_entrada': serialize_value(r['data_entrada']),
            'data_sortida': serialize_value(r['data_sortida']),
            'estat': r['estat'],
            'preu_total': serialize_value(r['preu_total']),
            'descompte_aplicat': serialize_value(r['descompte_aplicat']),
            'pagament_estat': r['pagament_estat'],
            'created_at': serialize_value(r['created_at'])
        })

    return {
        'total': total,
        'reserves': serialized_reserves,
        'paginacio': {
            'limit': limit,
            'offset': offset,
            'pagina_actual': (offset // limit) + 1 if limit > 0 else 1,
            'total_pagines': math.ceil(total / limit) if limit > 0 else 1
        }
    }


def get_reserves_per_estat(estat, filters=None):
    """
    Obté reserves filtrades per estat

    Estats vàlids: pendent, confirmada, en_curs, completada, cancel·lada
    """
    if filters is None:
        filters = {}

    valid_estats = ['pendent', 'confirmada',
                    'en_curs', 'completada', 'cancel·lada']
    if estat not in valid_estats:
        raise ValueError(
            f"Estat invàlid. Estats vàlids: {', '.join(valid_estats)}")

    filters['estat'] = estat
    return get_totes_reserves(filters)


def obte_detall_reserva(reserva_id):
    """Obté el detall complet d'una reserva específica"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
    SELECT
        r.id,
        r.codi_reserva,
        r.usuari_id,
        u.nom as usuari_nom,
        u.email,
        u.telefon,
        r.aparcament_id,
        a.nom as aparcament_nom,
        a.adreca,
        a.ciutat,
        a.codi_postal,
        a.latitud,
        a.longitud,
        r.data_entrada,
        r.data_sortida,
        r.estat,
        r.preu_total,
        r.descompte_aplicat,
        r.notes,
        r.tiquet_path,
        r.created_at,
        r.updated_at,
        p.id as pagament_id,
        p.import as pagament_import,
        p.metode as pagament_metode,
        p.estat as pagament_estat,
        p.data_pagament
    FROM reserves r
    JOIN usuaris u ON r.usuari_id = u.id
    JOIN aparcaments a ON r.aparcament_id = a.id
    LEFT JOIN pagaments p ON r.id = p.reserva_id
    WHERE r.id = %s
    """

    cursor.execute(query, (reserva_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if not row:
        return None

    # Construir resposta
    return {
        'id': row['id'],
        'codi_reserva': row['codi_reserva'],
        'usuari': {
            'id': row['usuari_id'],
            'nom': row['usuari_nom'],
            'email': row['email'],
            'telefon': row['telefon']
        },
        'aparcament': {
            'id': row['aparcament_id'],
            'nom': row['aparcament_nom'],
            'adreca': row['adreca'],
            'ciutat': row['ciutat'],
            'codi_postal': row['codi_postal'],
            'latitud': serialize_value(row['latitud']),
            'longitud': serialize_value(row['longitud'])
        },
        'data_entrada': serialize_value(row['data_entrada']),
        'data_sortida': serialize_value(row['data_sortida']),
        'estat': row['estat'],
        'preu_total': serialize_value(row['preu_total']),
        'descompte_aplicat': serialize_value(row['descompte_aplicat']),
        'notes': row['notes'],
        'tiquet_path': row['tiquet_path'],
        'pagament': {
            'id': row['pagament_id'],
            'import': serialize_value(row['pagament_import']),
            'metode': row['pagament_metode'],
            'estat': row['pagament_estat'],
            'data_pagament': serialize_value(row['data_pagament'])
        } if row['pagament_id'] else None,
        'created_at': serialize_value(row['created_at']),
        'updated_at': serialize_value(row['updated_at'])
    }


def crear_reserva(data):
    """
    Crea una nova reserva

    Paràmetres esperats en data:
    - usuari_id: ID de l'usuari (requerit)
    - aparcament_id: ID de l'aparcament (requerit)
    - data_entrada: data i hora d'entrada (format: YYYY-MM-DD HH:MM:SS) (requerit)
    - data_sortida: data i hora de sortida (format: YYYY-MM-DD HH:MM:SS) (requerit)
    - preu_total: preu total de la reserva (requerit)
    - descompte_aplicat: descompte aplicat (opcional, per defecte 0)
    - notes: notes addicionals (opcional)

    Retorna:
    - ID de la nova reserva i el codi de reserva generat
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Validar camps obligatoris
        required_fields = ['usuari_id', 'aparcament_id',
                           'data_entrada', 'data_sortida', 'preu_total']
        for field in required_fields:
            if field not in data or data[field] is None:
                raise ValueError(f"El camp '{field}' és obligatori")

        # Validar que l'usuari existeix
        cursor.execute("SELECT id FROM usuaris WHERE id = %s",
                       (data['usuari_id'],))
        if not cursor.fetchone():
            raise ValueError(
                f"L'usuari amb ID {data['usuari_id']} no existeix")

        # Validar dates
        try:
            data_entrada = datetime.strptime(
                data['data_entrada'], '%Y-%m-%d %H:%M:%S')
            data_sortida = datetime.strptime(
                data['data_sortida'], '%Y-%m-%d %H:%M:%S')
        except ValueError:
            raise ValueError(
                "Format de data invàlid. Utilitzar: YYYY-MM-DD HH:MM:SS")

        if data_sortida <= data_entrada:
            raise ValueError(
                "La data de sortida ha de ser posterior a la data d'entrada")

        # Procedure equivalent: sp_crear_reserva(..., OUT reserva_id, OUT codi_reserva, OUT error_msg)
        proc_args = [
            data['usuari_id'],
            data['aparcament_id'],
            data['data_entrada'],
            data['data_sortida'],
            data['preu_total'],
            data.get('descompte_aplicat', 0.00),
            data.get('notes', None),
            None,
            None,
            None
        ]
        result_args = cursor.callproc('sp_crear_reserva', proc_args)
        conn.commit()

        # El driver MySQL pot retornar una llista o un diccionari amb noms tipus sp_crear_reserva_argX
        if isinstance(result_args, dict):
            reserva_id = result_args.get('sp_crear_reserva_arg8')
            error_msg = result_args.get('sp_crear_reserva_arg10')
        else:
            reserva_id = result_args[7]
            error_msg = result_args[9]

        if error_msg:
            raise ValueError(error_msg)
        if not reserva_id:
            raise ValueError("No s'ha pogut crear la reserva")

        # Obtenir la reserva creada amb tots els detalls
        reserva_creada = obte_detall_reserva(reserva_id)

        cursor.close()
        conn.close()

        return reserva_creada

    except Exception as e:
        conn.rollback()
        cursor.close()
        conn.close()
        raise e


def actualitzar_estat_reserva(reserva_id, nou_estat):
    """
    Actualitza l'estat d'una reserva mitjançant el procedure sp_actualitzar_estat_reserva
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Procedure params: p_reserva_id, p_nou_estat, OUT p_error_msg
        proc_args = [reserva_id, nou_estat, None]
        result_args = cursor.callproc('sp_actualitzar_estat_reserva', proc_args)
        conn.commit()

        if isinstance(result_args, dict):
            error_msg = result_args.get('sp_actualitzar_estat_reserva_arg3')
        else:
            error_msg = result_args[2]

        if error_msg:
            raise ValueError(error_msg)

        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()


def actualitzar_tiquet_reserva(reserva_id, tiquet_path):
    """Actualitza la ruta del tiquet PDF d'una reserva"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = "UPDATE reserves SET tiquet_path = %s WHERE id = %s"
        cursor.execute(query, (tiquet_path, reserva_id))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()
