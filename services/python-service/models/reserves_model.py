"""
Model per a la gestió del cicle de vida de les reserves.

Centralitza totes les operacions de base de dades relacionades amb les reserves:
creació (via stored procedure `sp_crear_reserva`), llistat filtrat i paginator,
visualització de detalls i transicions d'estat. Inclou lògica de sincronització
del comptador de places disponibles i aplicació de recompenses de gamificació.
"""

from models.db_connection import get_db_connection, get_new_connection
from datetime import datetime, date, timedelta
from decimal import Decimal
import math


def serialize_value(value):
    """
    Converteix tipus de dades no serialitzables a formats compatibles amb JSON.
    
    Args:
        value (Any): El valor a serialitzar (datetime, date, timedelta, Decimal, etc.).
        
    Returns:
        Any: El valor convertit a string o float si cal, o el valor original.
    """
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    elif isinstance(value, timedelta):
        return str(value)
    elif isinstance(value, Decimal):
        return float(value)
    return value


def get_reserves_usuari(usuari_id, filters=None):
    """
    Obté totes les reserves d'un usuari amb filtratge flexible i paginació.
    
    Quan els filtres són simples (estat + paginació), delega al procediment
    `sp_obtenir_historial_reserves` per rendiment. Amb filtres avançats (dates,
    aparcament, cerca textual) executa una query dinàmica amb COUNT previ.

    Args:
        usuari_id (int): ID de l'usuari.
        filters (dict|None): Filtres opcionals:
            - 'estat' (str|None): Un o múltiples estats separats per coma.
            - 'data_desde' (str): Data mínima en format 'YYYY-MM-DD'.
            - 'data_fins' (str): Data màxima en format 'YYYY-MM-DD'.
            - 'aparcament_id' (int): Filtre per aparcament.
            - 'search' (str): Cerca parcial per nom d'aparcament.
            - 'limit' (int): Registres per pàgina (màx. 100).
            - 'offset' (int): Desplaçament per paginació.
                            
    Returns:
        dict: Diccionari amb claus 'total' (int), 'reserves' (list[dict])
              i 'paginacio' (dict amb limit, offset, pagina_actual i total_pagines).
        
    Raises:
        ValueError: Si l'estat és invàlid o el format de data és incorrecte.
    """
    if filters is None:
        filters = {}

    conn = get_new_connection()
    cursor = conn.cursor(dictionary=True)

    # Si només s'usen filtres compatibles, delegar al procedure
    procedure_supported_filters = {'estat', 'limit', 'offset'}
    unsupported_filters = {
        key for key, value in filters.items()
        if value is not None and key not in procedure_supported_filters
    }

    if not unsupported_filters and not filters.get('search') and (not filters.get('estat') or ',' not in filters.get('estat', '')):
        estat = filters.get('estat')
        valid_estats = ['pendent', 'confirmada',
                        'en_curs', 'completada', 'cancelada']
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
            rows = result.fetchall()
            if not reserves_rows:
                reserves_rows = rows

        cursor.close()
        conn.close()

        # Agrupar reserves amb els seus pagaments
        reserves_dict = {}
        for row in reserves_rows:
            reserve_id = row['id']
            if reserve_id not in reserves_dict:
                reserves_dict[reserve_id] = {
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
                    'pagaments': [],
                    'created_at': serialize_value(row['created_at']),
                    'updated_at': serialize_value(row['updated_at'])
                }

            if row.get('pagament_id') is not None:
                reserves_dict[reserve_id]['pagaments'].append({
                    'id': row['pagament_id'],
                    'import': None,
                    'metode': row['pagament_metode'],
                    'estat': row['pagament_estat'],
                    'data_pagament': serialize_value(row['data_pagament'])
                })

        reserves = list(reserves_dict.values())
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
                        'en_curs', 'completada', 'cancelada']
        
        # Suport per múltiples estats separats per coma
        estats_req = filters['estat'].split(',')
        estats_valids_req = []
        for e in estats_req:
            e = e.strip()
            if e not in valid_estats:
                raise ValueError(f"Estat invàlid: {e}. Estats vàlids: {', '.join(valid_estats)}")
            estats_valids_req.append(e)
            
        placeholders = ', '.join(['%s'] * len(estats_valids_req))
        query += f" AND r.estat IN ({placeholders})"
        params.extend(estats_valids_req)

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

    # Filtre de cerca per nom de l'aparcament
    if filters.get('search'):
        query += " AND a.nom LIKE %s"
        params.append(f"%{filters['search']}%")

    # Paginació
    limit = filters.get('limit', 20)
    offset = filters.get('offset', 0)
    if limit <= 0 or limit > 100: limit = 20
    if offset < 0: offset = 0

    where_index = query.find("WHERE")
    from_where_clause = query[query.find("FROM"):where_index] + query[where_index:]
    
    count_query = f"SELECT COUNT(DISTINCT r.id) as total {from_where_clause}"
    cursor.execute(count_query, params)
    total_result = cursor.fetchone()
    total = total_result['total'] if total_result else 0

    query += " ORDER BY r.data_entrada DESC"
    query += " LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    # Executar query principal
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
    Obté totes les reserves del sistema (ús administratiu).

    Args:
        filters (dict|None): Filtres per usuari, aparcament, estat, dates i paginació.
        
    Returns:
        dict: Conté 'total', 'reserves' (serialitzades) i 'paginacio'.
        
    Raises:
        ValueError: Si l'estat proporcionat és invàlid.
    """
    if filters is None:
        filters = {}

    conn = get_new_connection()
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
                        'en_curs', 'completada', 'cancelada']
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
    Wrapper de conveniència per obtenir reserves filtrades per un estat concret.
    
    Delega a `get_totes_reserves` injectant el filtre d'estat al diccionari
    de filtres. Valida l'estat abans de delegar.

    Args:
        estat (str): Estat de les reserves ('pendent', 'confirmada', 'en_curs',
                     'completada', 'cancelada').
        filters (dict|None): Filtres addicionals compatibles amb get_totes_reserves.
        
    Returns:
        dict: Resultat paginat equivalent a get_totes_reserves.
        
    Raises:
        ValueError: Si l'estat proporcionat no és un valor reconegut.
    """
    if filters is None:
        filters = {}

    valid_estats = ['pendent', 'confirmada',
                    'en_curs', 'completada', 'cancelada']
    if estat not in valid_estats:
        raise ValueError(
            f"Estat invàlid. Estats vàlids: {', '.join(valid_estats)}")

    filters['estat'] = estat
    return get_totes_reserves(filters)


def obte_detall_reserva(reserva_id):
    """
    Obté el detall complet d'una reserva específica, incloent dades de l'usuari,
    l'aparcament i el pagament associat.
    
    Args:
        reserva_id (int): ID de la reserva.
        
    Returns:
        dict|None: Diccionari estructurat amb tota la informació, o None si no existeix.
    """
    conn = get_new_connection()
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
        p.data_pagament,
        p.referencia_externa
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
            'data_pagament': serialize_value(row['data_pagament']),
            'referencia_externa': row['referencia_externa']
        } if row['pagament_id'] else None,
        'created_at': serialize_value(row['created_at']),
        'updated_at': serialize_value(row['updated_at'])
    }


def crear_reserva(data):
    """
    Crea una nova reserva amb validació, sincronització de places i gamificació.
    
    El flux d'execució és el següent:
    1. Validació dels camps obligatoris i de l'existència de l'usuari.
    2. Sincronització del comptador `places_disponibles` de l'aparcament per
       a la franja horària sol·licitada (via UPDATE + subquery de reserves actives).
    3. Aplicació opcional d'un descompte de gamificació si s'ha proporcionat
       `recompensa_id` (marca la recompensa com a `utilitzada`).
    4. Crida al procediment `sp_crear_reserva` per a la inserció atòmica.
    5. Recuperació del detall complet de la reserva creada.

    Args:
        data (dict): Dades de la reserva. Camps obligatoris: 'usuari_id',
                     'aparcament_id', 'data_entrada' (YYYY-MM-DD HH:MM:SS),
                     'data_sortida', 'preu_total'. Opcionals: 'recompensa_id',
                     'descompte_aplicat', 'notes'.
                    
    Returns:
        dict: Detall complet retornat per `obte_detall_reserva`, incloent
              usuari, aparcament, pagament i totes les dates serialitzades.
        
    Raises:
        ValueError: Si falten camps obligatoris, les dates tenen format incorrecte,
                    la sortida és anterior a l'entrada, o el stored procedure retorna error.
    """
    conn = get_new_connection()
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

        # ── Sincronitzar places_disponibles per la franja sol·licitada ───────────

        sync_cursor = conn.cursor()
        sync_cursor.execute("""
            UPDATE aparcaments a
            SET a.places_disponibles = GREATEST(0, a.capacitat_total - (
                SELECT COUNT(*) FROM reserves r
                WHERE r.aparcament_id = a.id
                  AND r.estat IN ('confirmada', 'pendent', 'en_curs')
                  AND r.data_entrada < %s
                  AND r.data_sortida > %s
            ))
            WHERE a.id = %s
        """, (data_sortida, data_entrada, data['aparcament_id']))
        sync_cursor.close()

        # ── Gestió de Descomptes (Gamificació) ───────────────────────────
        recompensa_id = data.get('recompensa_id')
        descompte_import = 0.0
        
        if recompensa_id:
            cursor.execute("""
                SELECT r.* FROM usuaris_recompenses ur
                JOIN recompenses r ON ur.recompensa_id = r.id
                WHERE ur.usuari_id = %s AND ur.recompensa_id = %s 
                AND ur.utilitzada = FALSE AND r.tipus = 'descompte'
            """, (data['usuari_id'], recompensa_id))
            
            recompensa = cursor.fetchone()
            if recompensa:
                import json
                valor = json.loads(recompensa['valor']) if isinstance(recompensa['valor'], str) else recompensa['valor']
                percentatge = valor.get('percentatge', 0)
                
                if percentatge > 0:
                    descompte_import = float(data['preu_total']) * (percentatge / 100.0)
                    # Arrodonir a 2 decimals
                    descompte_import = round(descompte_import, 2)
                    
                    # Actualitzar preu_total en l'objecte data per al procedure
                    # Nota: El preu_total que guardem a la BD ja hauria de ser el final
                    data['preu_total'] = float(data['preu_total']) - descompte_import
                    data['descompte_aplicat'] = descompte_import
                    
                    # Marcar com a utilitzada
                    cursor.execute("""
                        UPDATE usuaris_recompenses 
                        SET utilitzada = TRUE, data_utilitzacio = NOW() 
                        WHERE usuari_id = %s AND recompensa_id = %s
                    """, (data['usuari_id'], recompensa_id))

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
        for result in cursor.stored_results():
            result.fetchall()
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
    Actualitza l'estat d'una reserva utilitzant el procediment 'sp_actualitzar_estat_reserva'.
    
    Args:
        reserva_id (int): ID de la reserva.
        nou_estat (str): El nou estat (completada, cancelada, etc.).
        
    Returns:
        bool: True si s'ha actualitzat correctament.
        
    Raises:
        ValueError: Si el procediment emmagatzemat retorna un error.
    """
    conn = get_new_connection()
    cursor = conn.cursor()

    try:
        # Procedure params: p_reserva_id, p_nou_estat, OUT p_error_msg
        proc_args = [reserva_id, nou_estat, None]
        result_args = cursor.callproc('sp_actualitzar_estat_reserva', proc_args)
        for result in cursor.stored_results():
            result.fetchall()
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
    """
    Vincula un tiquet PDF generat a la seva reserva corresponent.
    
    S'utilitza una vegada el tiquet ha estat generat externament (per exemple,
    pel controlador de reserves) i cal desar-ne la ruta per a descàrrega.

    Args:
        reserva_id (int): ID de la reserva.
        tiquet_path (str): Ruta relativa o absoluta al fitxer PDF generat.
        
    Returns:
        bool: True si la columna 'tiquet_path' s'ha actualitzat correctament.
    """
    conn = get_new_connection()
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
