from models.db_connection import get_new_connection

def has_usuari_valorat(usuari_id, aparcament_id, conn=None):
    """
    Comprova si un usuari ja ha valorat un aparcament.
    Si es passa una connexió existent, l'utilitza. Si no, en crea una de nova.
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
    Afegeix una nova valoració a la base de dades.
    """
    conn = get_new_connection()
    if not conn:
        raise Exception("No s'ha pogut establir connexió amb la base de dades")
    
    cursor = conn.cursor(dictionary=True)
    try:
        # Validar si l'usuari ja ha valorat aquest aparcament per evitar errors de constraint
        # Passem la connexió actual per estalviar recursos
        if has_usuari_valorat(usuari_id, aparcament_id, conn=conn):
            raise ValueError("Ja has valorat aquest aparcament anteriorment")
        
        query = """
            INSERT INTO valoracions (usuari_id, aparcament_id, puntuacio, comentari, aspectes_valorats, fotos_url)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        import json
        aspectes_json = json.dumps(aspectes_valorats) if aspectes_valorats else None
        fotos_json = json.dumps(fotos_url) if fotos_url else None
        
        cursor.execute(query, (usuari_id, aparcament_id, puntuacio, comentari, aspectes_json, fotos_json))
        valoracio_id = cursor.lastrowid
        
        # Atorgar punts de gamificació (ex: 10 punts)
        punts_guanyats = 10
        cursor.execute("UPDATE usuaris SET punts_gamificacio = punts_gamificacio + %s WHERE id = %s", (punts_guanyats, usuari_id))
        
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
    Obté les valoracions d'un aparcament amb el nom de l'usuari.
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
