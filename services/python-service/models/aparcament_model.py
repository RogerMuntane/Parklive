from models.db_connection import get_db_connection, get_new_connection
from shared.serializers import serialize_row, serialize_rows
import math
from datetime import datetime, timedelta


def get_all_aparcaments():
    """Obté tots els aparcaments de la base de dades"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Procedure equivalent: sp_llistar_aparcaments(limit, offset)
    cursor.callproc('sp_llistar_aparcaments', [1000, 0])
    aparcaments = []
    for result in cursor.stored_results():
        aparcaments = result.fetchall()
        break
    cursor.close()

    return serialize_rows(aparcaments)


def get_aparcament_by_id(aparcament_id):
    """Obté un aparcament per ID amb les seves fotos i valoracions"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Procedure equivalent: sp_obtenir_aparcament_detall(aparcament_id)
    cursor.callproc('sp_obtenir_aparcament_detall', [aparcament_id])

    aparcament = None
    fotos = []
    valoracions = []

    # Iterar sobre tots els result sets retornats pel procedure
    for idx, result in enumerate(cursor.stored_results()):
        if idx == 0:
            # Primer result set: Dades de l'aparcament
            aparcament = result.fetchone()
        elif idx == 1:
            # Segon result set: Fotografies
            fotos = result.fetchall()
        elif idx == 2:
            # Tercer result set: Valoracions recents
            valoracions = result.fetchall()

    cursor.close()

    # Si no es troba, retorna None
    if aparcament is None:
        return None

    # Serialitzar les dades i afegir les llistes de fotos i valoracions
    resultat = serialize_row(aparcament)
    resultat['fotos'] = serialize_rows(fotos)
    resultat['valoracions'] = serialize_rows(valoracions)

    return resultat


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

    # Si només s'usen filtres compatibles, delegar al procedure
    procedure_supported_filters = {
        'ciutat', 'tipus', 'accessibilitat', 'carrega_electrica',
        'videovigilancia', 'obert_24h',
        'latitud', 'longitud', 'limite', 'offset'
    }
    unsupported_filters = {
        key for key, value in filters.items()
        if value is not None and key not in procedure_supported_filters
    }

    # Forçar consulta manual si hi ha disponibilitat o dates per fer el càlcul dinàmic
    if filters.get('disponibilitat') or filters.get('data_entrada'):
        unsupported_filters.add('dynamic_availability')

    if not unsupported_filters:
        limite = filters.get('limite', 20)
        offset = filters.get('offset', 0)

        if limite <= 0 or limite > 100:
            limite = 20
        if offset < 0:
            offset = 0

        # Procedure equivalent: sp_cercar_aparcaments(ciutat, tipus, accessibilitat,
        # carrega_electrica, latitud, longitud, limit, offset)
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

        cursor.close()

        return {
            'total': len(aparcaments),
            'resultats': serialize_rows(aparcaments),
            'paginacio': {
                'limit': limite,
                'offset': offset,
                'pagina_actual': (offset // limite) + 1 if limite > 0 else 1,
                'total_pagines': 1
            }
        }

    # Construcció de la query base usant la vista per incloure valoracions
    query = "SELECT * FROM vista_aparcaments_complet WHERE estat = 'actiu'"
    params = []

    # Filtre per ciutat
    if filters.get('ciutat'):
        query += " AND ciutat LIKE %s"
        params.append(f"%{filters['ciutat']}%")

    # Filtre per tipus (suporta múltiples valors separats per coma)
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

    # Filtre de disponibilitat dinàmica (Basat en reserves)
    if filters.get('disponibilitat') or filters.get('data_entrada'):
        # Si no hi ha dates, usem ara -> ara + 2h
        data_entrada = filters.get('data_entrada')
        data_sortida = filters.get('data_sortida')
        
        if not data_entrada or not data_sortida:
            now = datetime.now()
            # Arrodonir a 30 min superiors
            now = now.replace(minute=(now.minute // 30) * 30, second=0, microsecond=0)
            data_entrada = now.strftime('%Y-%m-%d %H:%M')
            data_sortida = (now + timedelta(hours=2)).strftime('%Y-%m-%d %H:%M')

        valid_disp = ['disponible', 'ocupat']
        disp = filters.get('disponibilitat', [])
        if isinstance(disp, str): disp = [disp]
        
        # Només apliquem el filtre restrictiu si s'ha marcat explícitament "disponible" 
        # o si l'usuari ha posat dates al cercador
        if 'disponible' in disp or filters.get('data_entrada'):
            query += """
            AND id NOT IN (
                SELECT r.aparcament_id
                FROM reserves r
                WHERE r.estat IN ('confirmada', 'pendent')
                AND NOT (r.data_sortida <= %s OR r.data_entrada >= %s)
                GROUP BY r.aparcament_id
                HAVING COUNT(*) >= (SELECT a.capacitat_total FROM aparcaments a WHERE a.id = r.aparcament_id)
            )
            """
            params.extend([data_entrada, data_sortida])
        
        elif 'ocupat' in disp:
            # Cas contrari: mostrar només els plens
            query += """
            AND id IN (
                SELECT r.aparcament_id
                FROM reserves r
                WHERE r.estat IN ('confirmada', 'pendent')
                AND NOT (r.data_sortida <= %s OR r.data_entrada >= %s)
                GROUP BY r.aparcament_id
                HAVING COUNT(*) >= (SELECT a.capacitat_total FROM aparcaments a WHERE a.id = r.aparcament_id)
            )
            """
            params.extend([data_entrada, data_sortida])

    # Filtre d'altura mínima
    if filters.get('altura_min') is not None:
        query += " AND (altura_maxima IS NULL OR altura_maxima >= %s)"
        params.append(filters['altura_min'])

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

    query += " ORDER BY valoracio_mitjana DESC, id ASC"
    query += " LIMIT %s OFFSET %s"
    params.extend([limite, offset])

    # Executar la query
    cursor.execute(query, params)
    aparcaments = cursor.fetchall()
    cursor.close()

    # Retornar resultats amb metadades de paginació
    return {
        'total': total,
        'resultats': serialize_rows(aparcaments),
        'paginacio': {
            'limit': limite,
            'offset': offset,
            'pagina_actual': (offset // limite) + 1 if limite > 0 else 1,
            'total_pagines': math.ceil(total / limite) if limite > 0 else 1
        }
    }


def add_user_favorite_parking(usuari_id, aparcament_id):
    """Afegeix un aparcament a favorits per un usuari."""
    conn = get_new_connection() or get_db_connection()
    cursor = conn.cursor()

    try:
        proc_args = [usuari_id, aparcament_id, None, None]
        result_args = cursor.callproc('sp_afegir_aparcament_favorit', proc_args)
        # Consumim qualsevol result set pendent per deixar la connexió neta.
        for result in cursor.stored_results():
            result.fetchall()
        conn.commit()

        resultat = bool(result_args[2])
        error_msg = result_args[3]

        if error_msg:
            raise ValueError(error_msg)

        return {'ok': resultat}
    finally:
        cursor.close()
        conn.close()


def remove_user_favorite_parking(usuari_id, aparcament_id):
    """Elimina un aparcament de favorits per un usuari."""
    conn = get_new_connection() or get_db_connection()
    cursor = conn.cursor()

    try:
        proc_args = [usuari_id, aparcament_id, None, None, None]
        result_args = cursor.callproc('sp_eliminar_aparcament_favorit', proc_args)
        # Consumim qualsevol result set pendent per deixar la connexió neta.
        for result in cursor.stored_results():
            result.fetchall()
        conn.commit()

        resultat = bool(result_args[2])
        files_afectades = int(result_args[3] or 0)
        error_msg = result_args[4]

        if error_msg:
            raise ValueError(error_msg)

        return {
            'ok': resultat,
            'eliminat': files_afectades > 0,
            'files_afectades': files_afectades,
        }
    finally:
        cursor.close()
        conn.close()


def get_user_favorite_parkings(usuari_id, limit=1000, offset=0):
    """Llista els aparcaments favorits d'un usuari."""
    conn = get_new_connection() or get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.callproc('sp_llistar_aparcaments_favorits_usuari', [usuari_id, limit, offset])
        favorits = []
        for result in cursor.stored_results():
            rows = result.fetchall()
            if rows:
                favorits.extend(rows)

        return serialize_rows(favorits)
    finally:
        cursor.close()
        conn.close()


def get_places_disponibles_per_franja(aparcament_id, data_entrada, data_sortida):
    """
    Calcula les places disponibles d'un aparcament per una franja horària concreta.

    Compta quantes reserves actives (confirmada o pendent) se solapen amb l'interval
    [data_entrada, data_sortida] i les resta de la capacitat total.

    Paràmetres:
    - aparcament_id: ID de l'aparcament
    - data_entrada: datetime d'inici de la franja
    - data_sortida: datetime de fi de la franja

    Retorna:
    - dict amb capacitat_total, reserves_actives i places_lliures
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        query = """
            SELECT
                a.capacitat_total,
                COUNT(r.id) AS reserves_actives,
                GREATEST(0, a.capacitat_total - COUNT(r.id)) AS places_lliures
            FROM aparcaments a
            LEFT JOIN reserves r ON r.aparcament_id = a.id
                AND r.estat IN ('confirmada', 'pendent')
                AND r.data_entrada < %s
                AND r.data_sortida > %s
            WHERE a.id = %s
            GROUP BY a.id, a.capacitat_total
        """
        cursor.execute(query, (data_sortida, data_entrada, aparcament_id))
        row = cursor.fetchone()

        if not row:
            return None

        return {
            'capacitat_total': int(row['capacitat_total'] or 0),
            'reserves_actives': int(row['reserves_actives'] or 0),
            'places_lliures': int(row['places_lliures'] or 0),
        }
    finally:
        cursor.close()
        conn.close()
