"""
Model per a la gestió de valoracions d'aparcaments.

Gestiona la creació, consulta i validació de ressenyes d'usuaris.
Inclou integració amb el sistema de gamificació per atorgar punts
en cada valoració nova, garantint la idempotència mitjançant claus úniques
a la taula `punts_moviments`.
"""

import json
from models.db_connection import get_new_connection


def has_usuari_valorat(usuari_id, aparcament_id, conn=None):
    """
    Comprova si un usuari ja ha valorat un aparcament específic.

    Accepta una connexió externa per evitar obrir connexions redundants
    quan es crida des d'un context ja connectat (p. ex. `add_valoracio`).

    Args:
        usuari_id (int): ID de l'usuari.
        aparcament_id (int): ID de l'aparcament.
        conn (Connection|None): Connexió existent o None per crear-ne una de nova.

    Returns:
        bool: True si l'usuari ja té una valoració registrada per aquest aparcament.
    """
    local_conn = False
    if conn is None:
        conn = get_new_connection()
        local_conn = True

    if not conn:
        return False

    cursor = conn.cursor(dictionary=True)
    try:
        query = "SELECT id FROM valoracions WHERE usuari_id = %s AND aparcament_id = %s LIMIT 1"
        cursor.execute(query, (usuari_id, aparcament_id))
        result = cursor.fetchone()
        return result is not None
    finally:
        cursor.close()
        if local_conn:
            conn.close()


def add_valoracio(usuari_id, aparcament_id, puntuacio, comentari=None, aspectes_valorats=None, fotos_url=None):
    """
    Registra una nova valoració d'un usuari per a un aparcament.

    A més d'inserir el registre a la taula `valoracions`, atorga 10 punts
    de gamificació a l'usuari i registra el moviment a `punts_moviments`
    amb una clau d'idempotència per evitar duplicats.

    Args:
        usuari_id (int): ID de l'usuari que valorà.
        aparcament_id (int): ID de l'aparcament valorat.
        puntuacio (int|float): Puntuació numèrica (p. ex. 1-5).
        comentari (str|None): Text de la ressenya opcional.
        aspectes_valorats (list|None): Llista d'aspectes a valorar (serialitzada a JSON).
        fotos_url (list|None): URLs de fotos adjuntes (serialitzades a JSON).

    Returns:
        int: L'ID de la nova valoració creada.

    Raises:
        ValueError: Si l'usuari ja ha valorat aquest aparcament prèviament.
        Exception: Si hi ha error de connexió o en la transacció.
    """
    conn = get_new_connection()
    if not conn:
        raise Exception("No s'ha pogut establir connexió amb la base de dades")

    cursor = conn.cursor(dictionary=True)
    try:
        # Comprovació prèvia per evitar l'error de constraint d'unicitat
        if has_usuari_valorat(usuari_id, aparcament_id, conn=conn):
            raise ValueError("Ja has valorat aquest aparcament anteriorment")

        query = """
            INSERT INTO valoracions (usuari_id, aparcament_id, puntuacio, comentari, aspectes_valorats, fotos_url)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        aspectes_json = json.dumps(aspectes_valorats) if aspectes_valorats else None
        fotos_json = json.dumps(fotos_url) if fotos_url else None

        cursor.execute(query, (usuari_id, aparcament_id, puntuacio, comentari, aspectes_json, fotos_json))
        valoracio_id = cursor.lastrowid

        # Atorgament de punts de gamificació
        punts_guanyats = 10
        cursor.execute(
            "UPDATE usuaris SET punts_gamificacio = punts_gamificacio + %s WHERE id = %s",
            (punts_guanyats, usuari_id)
        )

        idempotency_key = f"valoracio-creada-{valoracio_id}"
        cursor.execute(
            """INSERT INTO punts_moviments (usuari_id, tipus_moviment, punts, origen_tipus, origen_id, descripcio, idempotency_key)
               VALUES (%s, 'guany', %s, 'valoracio', %s, %s, %s)""",
            (usuari_id, punts_guanyats, valoracio_id, "Punts per valorar un aparcament", idempotency_key)
        )

        conn.commit()
        return valoracio_id
    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def get_valoracions_aparcament(aparcament_id, limit=10, offset=0):
    """
    Recupera les valoracions d'un aparcament ordenades per data de creació.

    Args:
        aparcament_id (int): ID de l'aparcament.
        limit (int): Nombre màxim de resultats per pàgina.
        offset (int): Desplaçament per a la paginació.

    Returns:
        list[dict]: Llista de valoracions amb el nom de l'usuari inclòs.
    """
    conn = get_new_connection()
    if not conn:
        return []

    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT v.*, u.nom as usuari_nom
            FROM valoracions v
            JOIN usuaris u ON v.usuari_id = u.id
            WHERE v.aparcament_id = %s
            ORDER BY v.created_at DESC
            LIMIT %s OFFSET %s
        """
        cursor.execute(query, (aparcament_id, limit, offset))
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()
