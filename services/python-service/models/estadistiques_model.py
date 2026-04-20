"""
estadistiques_model.py
Model per obtenir estadístiques d'un usuari per al component de perfil.
Usa connexions noves per a cada crida per garantir thread-safety.
"""
from models.db_connection import get_new_connection
from datetime import datetime
from decimal import Decimal


def serialize_value(value):
    """Converteix tipus no serialitzables a formats JSON compatibles."""
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def get_kpis_usuari(usuari_id):
    """
    Retorna les mètriques principals de l'usuari.
    """
    conn = get_new_connection()
    if not conn:
        raise Exception("No s'ha pogut establir connexió amb la base de dades")
    cursor = conn.cursor(dictionary=True)

    try:
        # KPIs principals
        cursor.execute("""
            SELECT
                COUNT(*) AS total_reserves,
                COALESCE(SUM(CASE WHEN estat = 'completada' THEN preu_total ELSE 0 END), 0) AS total_despesa,
                COALESCE(SUM(
                    CASE WHEN estat = 'completada'
                    THEN TIMESTAMPDIFF(MINUTE, data_entrada, data_sortida)
                    ELSE 0 END
                ), 0) AS temps_aparcat_minuts
            FROM reserves
            WHERE usuari_id = %s
        """, (usuari_id,))
        kpis = cursor.fetchone()

        # Punts de gamificació de l'usuari
        cursor.execute(
            "SELECT punts_gamificacio FROM usuaris WHERE id = %s", (usuari_id,))
        user = cursor.fetchone()

        # Reserves i despesa del mes actual
        cursor.execute("""
            SELECT
                COUNT(*) AS reserves_mes,
                COALESCE(SUM(CASE WHEN estat = 'completada' THEN preu_total ELSE 0 END), 0) AS despesa_mes
            FROM reserves
            WHERE usuari_id = %s
              AND YEAR(data_entrada) = YEAR(CURDATE())
              AND MONTH(data_entrada) = MONTH(CURDATE())
        """, (usuari_id,))
        mes_actual = cursor.fetchone()

        # Reserves i despesa del mes anterior
        cursor.execute("""
            SELECT
                COUNT(*) AS reserves_mes,
                COALESCE(SUM(CASE WHEN estat = 'completada' THEN preu_total ELSE 0 END), 0) AS despesa_mes
            FROM reserves
            WHERE usuari_id = %s
              AND YEAR(data_entrada) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
              AND MONTH(data_entrada) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
        """, (usuari_id,))
        mes_anterior = cursor.fetchone()

        temps_hores = float(kpis['temps_aparcat_minuts']) / 60.0

        # Calcul de tendències (delta respecte al mes anterior)
        reserves_trend = int(mes_actual['reserves_mes']) - int(mes_anterior['reserves_mes'])
        despesa_trend = float(mes_actual['despesa_mes']) - float(mes_anterior['despesa_mes'])

        return {
            'total_reserves': int(kpis['total_reserves']),
            'total_despesa': float(kpis['total_despesa']),
            'temps_aparcat_hores': round(temps_hores, 1),
            'punts_gamificacio': int(user['punts_gamificacio']) if user else 0,
            'reserves_mes_actual': int(mes_actual['reserves_mes']),
            'reserves_mes_anterior': int(mes_anterior['reserves_mes']),
            'reserves_trend': reserves_trend,
            'despesa_mes_actual': float(mes_actual['despesa_mes']),
            'despesa_mes_anterior': float(mes_anterior['despesa_mes']),
            'despesa_trend': round(despesa_trend, 2),
        }

    finally:
        cursor.close()
        conn.close()


def get_despesa_mensual(usuari_id, mesos=8):
    """
    Retorna la despesa mensual de les últimes `mesos` mesos (reserves completades).
    """
    conn = get_new_connection()
    if not conn:
        raise Exception("No s'ha pogut establir connexió amb la base de dades")
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                DATE_FORMAT(data_entrada, '%b %Y') AS mes_label,
                YEAR(data_entrada) AS year,
                MONTH(data_entrada) AS month,
                COALESCE(SUM(preu_total), 0) AS total
            FROM reserves
            WHERE usuari_id = %s
              AND estat = 'completada'
              AND data_entrada >= DATE_SUB(CURDATE(), INTERVAL %s MONTH)
            GROUP BY YEAR(data_entrada), MONTH(data_entrada), DATE_FORMAT(data_entrada, '%b %Y')
            ORDER BY year ASC, month ASC
        """, (usuari_id, mesos))

        rows = cursor.fetchall()
        return [
            {
                'mes_label': r['mes_label'],
                'year': r['year'],
                'month': r['month'],
                'total': float(r['total'])
            }
            for r in rows
        ]
    finally:
        cursor.close()
        conn.close()


def get_distribucio_tipus_aparcament(usuari_id):
    """
    Retorna la distribució dels tipus d'aparcament usats per l'usuari.
    """
    conn = get_new_connection()
    if not conn:
        raise Exception("No s'ha pogut establir connexió amb la base de dades")
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                a.tipus,
                COUNT(r.id) AS count
            FROM reserves r
            JOIN aparcaments a ON r.aparcament_id = a.id
            WHERE r.usuari_id = %s
            GROUP BY a.tipus
            ORDER BY count DESC
        """, (usuari_id,))

        rows = cursor.fetchall()
        total = sum(r['count'] for r in rows) or 1

        return [
            {
                'tipus': r['tipus'],
                'count': int(r['count']),
                'percentatge': round((int(r['count']) / total) * 100, 1)
            }
            for r in rows
        ]
    finally:
        cursor.close()
        conn.close()


def get_reserves_per_estat(usuari_id):
    """
    Retorna el recompte de reserves agrupades per estat.
    """
    conn = get_new_connection()
    if not conn:
        raise Exception("No s'ha pogut establir connexió amb la base de dades")
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT estat, COUNT(*) AS count
            FROM reserves
            WHERE usuari_id = %s
            GROUP BY estat
        """, (usuari_id,))

        rows = cursor.fetchall()
        return [{'estat': r['estat'], 'count': int(r['count'])} for r in rows]
    finally:
        cursor.close()
        conn.close()


def get_contribucions_per_tipus(usuari_id):
    """
    Retorna el recompte de contribucions de l'usuari per tipus i estat de validació.
    """
    conn = get_new_connection()
    if not conn:
        raise Exception("No s'ha pogut establir connexió amb la base de dades")
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                tipus,
                validada,
                COUNT(*) AS count
            FROM contribucions
            WHERE usuari_id = %s
            GROUP BY tipus, validada
            ORDER BY tipus
        """, (usuari_id,))

        rows = cursor.fetchall()
        return [
            {
                'tipus': r['tipus'],
                'validada': bool(r['validada']),
                'count': int(r['count'])
            }
            for r in rows
        ]
    finally:
        cursor.close()
        conn.close()


def get_reserves_per_dia_setmana(usuari_id):
    """
    Retorna el recompte de reserves per dia de la setmana (0=Dl…6=Dg).
    """
    conn = get_new_connection()
    if not conn:
        raise Exception("No s'ha pogut establir connexió amb la base de dades")
    cursor = conn.cursor(dictionary=True)

    labels = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg']

    try:
        cursor.execute("""
            SELECT
                WEEKDAY(data_entrada) AS dia_index,
                COUNT(*) AS count
            FROM reserves
            WHERE usuari_id = %s
            GROUP BY WEEKDAY(data_entrada)
            ORDER BY dia_index
        """, (usuari_id,))

        rows = cursor.fetchall()
        counts = {int(r['dia_index']): int(r['count']) for r in rows}
        return [
            {'dia_index': i, 'dia_label': labels[i], 'count': counts.get(i, 0)}
            for i in range(7)
        ]
    finally:
        cursor.close()
        conn.close()


def get_top_aparcaments(usuari_id, limit=5):
    """
    Retorna els aparcaments més usats per l'usuari.
    """
    conn = get_new_connection()
    if not conn:
        raise Exception("No s'ha pogut establir connexió amb la base de dades")
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                a.id AS aparcament_id,
                a.nom,
                a.ciutat,
                COUNT(r.id) AS count,
                COALESCE(SUM(r.preu_total), 0) AS despesa_total
            FROM reserves r
            JOIN aparcaments a ON r.aparcament_id = a.id
            WHERE r.usuari_id = %s
            GROUP BY a.id, a.nom, a.ciutat
            ORDER BY count DESC
            LIMIT %s
        """, (usuari_id, limit))

        rows = cursor.fetchall()
        return [
            {
                'aparcament_id': r['aparcament_id'],
                'nom': r['nom'],
                'ciutat': r['ciutat'],
                'count': int(r['count']),
                'despesa_total': round(float(r['despesa_total']), 2)
            }
            for r in rows
        ]
    finally:
        cursor.close()
        conn.close()


def get_dades_detall(usuari_id):
    """
    Retorna dades de resum de detall.
    """
    conn = get_new_connection()
    if not conn:
        raise Exception("No s'ha pogut establir connexió amb la base de dades")
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                COALESCE(AVG(preu_total), 0) AS despesa_mitja,
                COALESCE(AVG(TIMESTAMPDIFF(MINUTE, data_entrada, data_sortida)), 0) AS durada_mitja_minuts
            FROM reserves
            WHERE usuari_id = %s AND estat = 'completada'
        """, (usuari_id,))
        reserves_stats = cursor.fetchone()

        cursor.execute("""
            SELECT
                COUNT(*) AS total_contribucions,
                SUM(CASE WHEN validada = TRUE THEN 1 ELSE 0 END) AS validades
            FROM contribucions
            WHERE usuari_id = %s
        """, (usuari_id,))
        contrib_stats = cursor.fetchone()

        cursor.execute("""
            SELECT COALESCE(AVG(puntuacio), 0) AS valoracio_mitja
            FROM valoracions
            WHERE usuari_id = %s
        """, (usuari_id,))
        val_stats = cursor.fetchone()

        durada_min = float(reserves_stats['durada_mitja_minuts'])
        hores = int(durada_min // 60)
        minuts = int(durada_min % 60)

        return {
            'despesa_mitja': round(float(reserves_stats['despesa_mitja']), 2),
            'durada_mitja_minuts': round(durada_min, 0),
            'durada_mitja_fmt': f"{hores}h {minuts:02d}min",
            'total_contribucions': int(contrib_stats['total_contribucions']),
            'contribucions_validades': int(contrib_stats['validades'] or 0),
            'valoracio_mitja': round(float(val_stats['valoracio_mitja']), 1),
        }
    finally:
        cursor.close()
        conn.close()


def get_gamificacio_usuari(usuari_id):
    """
    Retorna els punts de gamificació i les recompenses.
    """
    conn = get_new_connection()
    if not conn:
        raise Exception("No s'ha pogut establir connexió amb la base de dades")
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT punts_gamificacio FROM usuaris WHERE id = %s", (usuari_id,))
        user = cursor.fetchone()
        punts = int(user['punts_gamificacio']) if user else 0

        cursor.execute("""
            SELECT
                r.id, r.nom, r.descripcio, r.tipus, r.requisit_punts, r.icona_url, ur.data_obtencio
            FROM usuaris_recompenses ur
            JOIN recompenses r ON ur.recompensa_id = r.id
            WHERE ur.usuari_id = %s
            ORDER BY ur.data_obtencio DESC
        """, (usuari_id,))
        obtingudes = cursor.fetchall()

        cursor.execute("""
            SELECT r.id, r.nom, r.requisit_punts, r.icona_url
            FROM recompenses r
            WHERE r.activa = TRUE
              AND r.requisit_punts > %s
              AND r.id NOT IN (
                SELECT recompensa_id FROM usuaris_recompenses WHERE usuari_id = %s
              )
            ORDER BY r.requisit_punts ASC
            LIMIT 1
        """, (punts, usuari_id))
        propera = cursor.fetchone()

        insignies = [
            {
                'id': r['id'], 'nom': r['nom'], 'descripcio': r['descripcio'],
                'tipus': r['tipus'], 'requisit_punts': r['requisit_punts'],
                'icona_url': r['icona_url'], 'data_obtencio': serialize_value(r['data_obtencio'])
            }
            for r in obtingudes
        ]

        return {
            'punts': punts,
            'insignies_obtingudes': insignies,
            'propera_recompensa': {
                'id': propera['id'],
                'nom': propera['nom'],
                'requisit_punts': propera['requisit_punts'],
                'punts_restants': propera['requisit_punts'] - punts,
                'progres_percentatge': round((punts / propera['requisit_punts']) * 100, 1)
            } if propera else None
        }
    finally:
        cursor.close()
        conn.close()
