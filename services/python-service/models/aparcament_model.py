"""
Model per a la gestió d'aparcaments.

Aquest mòdul conté les funcions per interactuar amb la base de dades en relació
als aparcaments: cerca, filtratge avançat, detalls, favorits i càlcul de disponibilitat
dinàmica basada en reserves existents.
"""

from models.db_connection import get_db_connection, get_new_connection
from shared.serializers import serialize_row, serialize_rows
import math
from datetime import datetime, timedelta

def enrich_records_with_photos(records):
    """
    Enriqueix una llista de registres d'aparcament amb la URL de la seva primera foto.
    
    Busca la foto amb l'ordre més baix (ordre 1) per a cada aparcament proporcionat.
    
    Args:
        records (list|dict): Una llista de diccionaris o un diccionari individual d'aparcament.
        
    Returns:
        list|dict: Els registres originals amb el camp 'foto_principal' afegit.
    """
    if not records:
        return records
    
    # Determinar si és una llista o un objecte sol (com el detall)
    is_list = isinstance(records, list)
    items = records if is_list else [records]
    
    # Obtenir els IDs dels aparcaments
    ids = [item['id'] for item in items if 'id' in item and item.get('id')]
    if not ids:
        return records
    
    conn = get_new_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Aquesta subquery busca la URL de la primera foto per a cada ID d'aparcament
        placeholders = ','.join(['%s'] * len(ids))
        query = f"""
            SELECT f.aparcament_id, f.url
            FROM fotografies_aparcaments f
            INNER JOIN (
                SELECT aparcament_id, MIN(ordre) as min_ordre
                FROM fotografies_aparcaments
                WHERE aparcament_id IN ({placeholders})
                GROUP BY aparcament_id
            ) m ON f.aparcament_id = m.aparcament_id AND f.ordre = m.min_ordre
        """
        
        cursor.execute(query, ids)
        photos_map = {row['aparcament_id']: row['url'] for row in cursor.fetchall()}
        
        for item in items:
            if 'id' in item and item['id'] in photos_map:
                item['foto_principal'] = photos_map[item['id']]
                
        return records
    except Exception as e:
        print(f"[ParkLive] Error enriquint registres amb fotos: {e}")
        return records
    finally:
        cursor.close()
        conn.close()


def get_all_aparcaments():
    """
    Obté tots els aparcaments de la base de dades utilitzant el procediment 'sp_llistar_aparcaments'.
    
    Returns:
        list: Llista de diccionaris amb la informació enriquida dels aparcaments.
    """
    conn = get_new_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.callproc('sp_llistar_aparcaments', [1000, 0])
        aparcaments = []
        for result in cursor.stored_results():
            aparcaments = result.fetchall()
            break
        return enrich_records_with_photos(serialize_rows(aparcaments))
    finally:
        cursor.close()
        conn.close()


def get_aparcament_by_id(aparcament_id):
    """
    Obté la informació detallada d'un aparcament, incloent totes les seves fotos i valoracions.
    
    Args:
        aparcament_id (int): ID de l'aparcament.
        
    Returns:
        dict|None: Dades completes de l'aparcament o None si no es troba.
    """
    conn = get_new_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.callproc('sp_obtenir_aparcament_detall', [aparcament_id])

        aparcament = None
        fotos = []
        valoracions = []

        for idx, result in enumerate(cursor.stored_results()):
            if idx == 0:
                rows = result.fetchall()
                aparcament = rows[0] if rows else None
            elif idx == 1:
                fotos = result.fetchall()
            elif idx == 2:
                valoracions = result.fetchall()
            else:
                result.fetchall()

        if aparcament is None:
            return None

        resultat = serialize_row(aparcament)
        resultat['fotos'] = serialize_rows(fotos)
        resultat['valoracions'] = serialize_rows(valoracions)

        return resultat
    finally:
        cursor.close()
        conn.close()


def get_aparcaments_by_filters(filters):
    """
    Realitza una cerca avançada d'aparcaments aplicant múltiples filtres dinàmics.
    
    Suporta dos camins d'execució:
    1. Procediment emmagatzemat (sp_cercar_aparcaments) per a filtres bàsics.
    2. Consulta SQL manual per a filtres avançats (tarifes, disponibilitat temporal, valoració mitjana, radi geogràfic).

    Args:
        filters (dict): Diccionari amb els paràmetres de cerca (ciutat, tipus, dates, lat/lon, etc.).
        
    Returns:
        dict: Resultats paginats amb el total de coincidències i metadades.
        
    Raises:
        ValueError: Si els valors dels filtres de valoració o coordenades són fora de rang.
    """
    conn = get_new_connection()
    cursor = conn.cursor(dictionary=True)

    procedure_supported_filters = {
        'ciutat', 'tipus', 'accessibilitat', 'carrega_electrica',
        'latitud', 'longitud', 'limite', 'offset'
    }
    unsupported_filters = {
        key for key, value in filters.items()
        if value is not None and key not in procedure_supported_filters
    }

    if filters.get('disponibilitat') or filters.get('data_entrada') or filters.get('data_sortida'):
        unsupported_filters.add('dynamic_availability')

    if not unsupported_filters:
        limite = filters.get('limite', 20)
        offset = filters.get('offset', 0)

        if limite <= 0 or limite > 100:
            limite = 20
        if offset < 0:
            offset = 0

        try:
            cursor.callproc('sp_cercar_aparcaments', [
                filters.get('ciutat'),
                filters.get('tipus'),
                filters.get('accessibilitat'),
                filters.get('carrega_electrica'),
                filters.get('videovigilancia'),
                filters.get('obert_24h'),
                filters.get('latitud'),
                filters.get('longitud'),
                limite,
                offset
            ])

            aparcaments = []
            for result in cursor.stored_results():
                aparcaments = result.fetchall()
                break

            return {
                'total': len(aparcaments),
                'resultats': enrich_records_with_photos(serialize_rows(aparcaments)),
                'paginacio': {
                    'limit': limite,
                    'offset': offset,
                    'pagina_actual': (offset // limite) + 1 if limite > 0 else 1,
                    'total_pagines': 1
                }
            }
        finally:
            cursor.close()
            conn.close()

    # Camí de consulta avançada
    try:
        query = "SELECT * FROM vista_aparcaments_complet WHERE estat = 'actiu'"
        params = []

        if filters.get('ciutat'):
            query += " AND ciutat LIKE %s"
            params.append(f"%{filters['ciutat']}%")

        if filters.get('tipus'):
            tipus_values = filters['tipus'].split(',')
            valid_tipus = ['carrer', 'cobert', 'aire_lliure',
                           'subterrani', 'parking_public', 'parking_privat']
            for t in tipus_values:
                if t not in valid_tipus:
                    raise ValueError(f"Tipus invàlid: {t}")
            placeholders = ', '.join(['%s'] * len(tipus_values))
            query += f" AND tipus IN ({placeholders})"
            params.extend(tipus_values)

        if filters.get('tarifa_hora_min') is not None:
            query += " AND tarifa_hora >= %s"
            params.append(filters['tarifa_hora_min'])

        if filters.get('tarifa_hora_max') is not None:
            query += " AND tarifa_hora <= %s"
            params.append(filters['tarifa_hora_max'])

        if filters.get('tarifa_dia_min') is not None:
            query += " AND tarifa_dia >= %s"
            params.append(filters['tarifa_dia_min'])

        if filters.get('tarifa_dia_max') is not None:
            query += " AND tarifa_dia <= %s"
            params.append(filters['tarifa_dia_max'])

        if filters.get('accessibilitat') is not None:
            query += " AND accessibilitat = %s"
            params.append(filters['accessibilitat'])

        if filters.get('carrega_electrica') is not None:
            query += " AND carrega_electrica = %s"
            params.append(filters['carrega_electrica'])

        if filters.get('videovigilancia') is not None:
            query += " AND videovigilancia = %s"
            params.append(filters['videovigilancia'])

        if filters.get('obert_24h') is not None:
            query += " AND obert_24h = %s"
            params.append(filters['obert_24h'])

        # Filtre de disponibilitat dinàmica
        if filters.get('disponibilitat') or filters.get('data_entrada') or filters.get('data_sortida'):
            data_entrada = filters.get('data_entrada')
            data_sortida = filters.get('data_sortida')
            
            if not data_entrada and not data_sortida:
                now = datetime.now()
                now = now.replace(minute=(now.minute // 30) * 30, second=0, microsecond=0)
                data_entrada = now.strftime('%Y-%m-%d %H:%M')
                data_sortida = (now + timedelta(hours=2)).strftime('%Y-%m-%d %H:%M')
            elif not data_entrada:
                data_entrada = datetime.now().strftime('%Y-%m-%d %H:%M')
            elif not data_sortida:
                try:
                    dt_in = datetime.strptime(data_entrada, '%Y-%m-%d %H:%M:%S')
                except ValueError:
                    try:
                        dt_in = datetime.strptime(data_entrada, '%Y-%m-%d %H:%M')
                    except ValueError:
                        dt_in = datetime.now()
                data_sortida = (dt_in + timedelta(hours=2)).strftime('%Y-%m-%d %H:%M')

            disp = filters.get('disponibilitat', [])
            if isinstance(disp, str): disp = [disp]
            
            if 'disponible' in disp or filters.get('data_entrada') or filters.get('data_sortida'):
                query += """
                AND id NOT IN (
                    SELECT r.aparcament_id
                    FROM reserves r
                    JOIN aparcaments a ON a.id = r.aparcament_id
                    WHERE r.estat IN ('confirmada', 'pendent', 'en_curs')
                    AND NOT (r.data_sortida <= %s OR r.data_entrada >= %s)
                    GROUP BY r.aparcament_id, a.capacitat_total
                    HAVING COUNT(*) >= a.capacitat_total
                )
                """
                params.extend([data_entrada, data_sortida])

                try:
                    fmt = '%Y-%m-%d %H:%M:%S' if len(data_entrada) > 16 else '%Y-%m-%d %H:%M'
                    dt_in = datetime.strptime(data_entrada, fmt)
                    fmt_out = '%Y-%m-%d %H:%M:%S' if len(data_sortida) > 16 else '%Y-%m-%d %H:%M'
                    dt_out = datetime.strptime(data_sortida, fmt_out)
                    now = datetime.now()
                    if dt_in <= now <= dt_out:
                        query += " AND places_disponibles > 0"
                except Exception:
                    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    if data_entrada <= now_str <= data_sortida:
                        query += " AND places_disponibles > 0"
            
            elif 'ocupat' in disp:
                query += """
                AND id IN (
                    SELECT r.aparcament_id
                    FROM reserves r
                    JOIN aparcaments a ON a.id = r.aparcament_id
                    WHERE r.estat IN ('confirmada', 'pendent', 'en_curs')
                    AND NOT (r.data_sortida <= %s OR r.data_entrada >= %s)
                    GROUP BY r.aparcament_id, a.capacitat_total
                    HAVING COUNT(*) >= a.capacitat_total
                )
                """
                params.extend([data_entrada, data_sortida])

        if filters.get('altura_min') is not None:
            query += " AND (altura_maxima IS NULL OR altura_maxima >= %s)"
            params.append(filters['altura_min'])

        if filters.get('valoracio_min') is not None:
            if filters['valoracio_min'] < 0 or filters['valoracio_min'] > 5:
                raise ValueError("Valoració mínima ha de ser entre 0 i 5")
            query += " AND valoracio_mitjana >= %s"
            params.append(filters['valoracio_min'])

        if filters.get('latitud') is not None and filters.get('longitud') is not None:
            lat = filters['latitud']
            lon = filters['longitud']
            radi_km = filters.get('radi_km', 10)
            if lat < -90 or lat > 90: raise ValueError("Latitud ha de ser entre -90 i 90")
            if lon < -180 or lon > 180: raise ValueError("Longitud ha de ser entre -180 i 180")
            if radi_km <= 0: raise ValueError("Radi ha de ser positiu")

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

        # Query de recompte
        cursor.execute(query.replace("SELECT * FROM", "SELECT COUNT(*) as total FROM"), params)
        total_result = cursor.fetchone()
        total = total_result['total'] if total_result else 0

        limite = filters.get('limite', 20)
        offset = filters.get('offset', 0)
        if limite <= 0 or limite > 100: limite = 20
        if offset < 0: offset = 0

        query += " ORDER BY valoracio_mitjana DESC, id ASC"
        query += " LIMIT %s OFFSET %s"
        params.extend([limite, offset])

        cursor.execute(query, params)
        aparcaments = cursor.fetchall()

        return {
            'total': total,
            'resultats': enrich_records_with_photos(serialize_rows(aparcaments)),
            'paginacio': {
                'limit': limite,
                'offset': offset,
                'pagina_actual': (offset // limite) + 1 if limite > 0 else 1,
                'total_pagines': math.ceil(total / limite) if limite > 0 else 1
            }
        }
    finally:
        cursor.close()
        conn.close()


def add_user_favorite_parking(usuari_id, aparcament_id):
    """
    Afegeix un aparcament a la llista de favorits d'un usuari.
    
    Args:
        usuari_id (int): ID de l'usuari.
        aparcament_id (int): ID de l'aparcament.
        
    Returns:
        dict: Estat de l'operació {'ok': True}.
    """
    conn = get_new_connection() or get_db_connection()
    cursor = conn.cursor()
    try:
        proc_args = [usuari_id, aparcament_id, None, None]
        result_args = cursor.callproc('sp_afegir_aparcament_favorit', proc_args)
        for result in cursor.stored_results(): result.fetchall()
        conn.commit()
        if result_args[3]: raise ValueError(result_args[3])
        return {'ok': bool(result_args[2])}
    finally:
        cursor.close()
        conn.close()


def remove_user_favorite_parking(usuari_id, aparcament_id):
    """
    Elimina un aparcament dels favorits d'un usuari.
    
    Args:
        usuari_id (int): ID de l'usuari.
        aparcament_id (int): ID de l'aparcament.
        
    Returns:
        dict: Resum de l'eliminació.
    """
    conn = get_new_connection() or get_db_connection()
    cursor = conn.cursor()
    try:
        proc_args = [usuari_id, aparcament_id, None, None, None]
        result_args = cursor.callproc('sp_eliminar_aparcament_favorit', proc_args)
        for result in cursor.stored_results(): result.fetchall()
        conn.commit()
        if result_args[4]: raise ValueError(result_args[4])
        return {
            'ok': bool(result_args[2]),
            'eliminat': int(result_args[3] or 0) > 0,
            'files_afectades': int(result_args[3] or 0),
        }
    finally:
        cursor.close()
        conn.close()


def get_user_favorite_parkings(usuari_id, limit=1000, offset=0):
    """
    Llista els aparcaments favorits de l'usuari.
    
    Args:
        usuari_id (int): ID de l'usuari.
        limit (int): Límit de resultats.
        offset (int): Paginació.
        
    Returns:
        list: Llista d'aparcaments favorits enriquida.
    """
    conn = get_new_connection() or get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.callproc('sp_llistar_aparcaments_favorits_usuari', [usuari_id, limit, offset])
        favorits = []
        for result in cursor.stored_results():
            rows = result.fetchall()
            if rows: favorits.extend(rows)
        return enrich_records_with_photos(serialize_rows(favorits))
    finally:
        cursor.close()
        conn.close()


def get_places_disponibles_per_franja(aparcament_id, data_entrada, data_sortida):
    """
    Calcula dinàmicament la disponibilitat de places per a una franja horària.
    
    Args:
        aparcament_id (int): ID de l'aparcament.
        data_entrada (str): Inici de l'interval.
        data_sortida (str): Fi de l'interval.
        
    Returns:
        dict|None: Resum de places lliures i capacitat.
    """
    conn = get_new_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT
                a.capacitat_total,
                COUNT(r.id) AS reserves_actives,
                GREATEST(0, CAST(a.capacitat_total AS SIGNED) - CAST(COUNT(r.id) AS SIGNED)) AS places_lliures
            FROM aparcaments a
            LEFT JOIN reserves r ON r.aparcament_id = a.id
                AND r.estat IN ('confirmada', 'pendent', 'en_curs')
                AND r.data_entrada < %s
                AND r.data_sortida > %s
            WHERE a.id = %s
            GROUP BY a.id, a.capacitat_total
        """
        cursor.execute(query, (data_sortida, data_entrada, aparcament_id))
        row = cursor.fetchone()
        if not row: return None
        return {
            'capacitat_total': int(row['capacitat_total'] or 0),
            'reserves_actives': int(row['reserves_actives'] or 0),
            'places_lliures': int(row['places_lliures'] or 0),
        }
    finally:
        cursor.close()
        conn.close()


