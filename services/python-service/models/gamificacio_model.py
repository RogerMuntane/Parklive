import json
from models.db_connection import get_new_connection

def get_user_points(user_id):
    """Retorna els punts actuals d'un usuari."""
    conn = get_new_connection()
    if not conn:
        return 0
    
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT punts_gamificacio FROM usuaris WHERE id = %s", (user_id,))
        row = cursor.fetchone()
        return row['punts_gamificacio'] if row else 0
    finally:
        cursor.close()
        conn.close()

def get_recompenses():
    """Retorna la llista de recompenses actives."""
    conn = get_new_connection()
    if not conn:
        return []
    
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM recompenses WHERE activa = TRUE ORDER BY requisit_punts ASC")
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

def redeem_reward(user_id, reward_id):
    """
    Realitza el bescanvi d'una recompensa.
    Resta els punts, afegeix la recompensa a l'usuari i registra el moviment.
    """
    conn = get_new_connection()
    if not conn:
        return False, "Error de connexió a la base de dades"
    
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Validar IDs
        try:
            user_id = int(user_id)
            reward_id = int(reward_id)
        except (ValueError, TypeError):
            return False, "IDs d'usuari o recompensa invàlids"

        # 2. Comprovar si la recompensa existeix
        cursor.execute("SELECT * FROM recompenses WHERE id = %s AND activa = TRUE", (reward_id,))
        recompensa = cursor.fetchone()
        if not recompensa:
            return False, "Recompensa no trobada o no activa"
        
        cost = int(recompensa['requisit_punts'])
        
        # 3. Comprovar punts de l'usuari (Bloqueig per a actualització)
        cursor.execute("SELECT punts_gamificacio FROM usuaris WHERE id = %s FOR UPDATE", (user_id,))
        usuari = cursor.fetchone()
        if not usuari:
            return False, "Usuari no trobat"
        
        if usuari['punts_gamificacio'] < cost:
            return False, f"No tens prou punts (en tens {usuari['punts_gamificacio']}, en calen {cost})"
        
        # 4. Comprovar si ja té aquesta recompensa (Constraint UNIQUE a la BD)
        cursor.execute("SELECT id FROM usuaris_recompenses WHERE usuari_id = %s AND recompensa_id = %s", (user_id, reward_id))
        if cursor.fetchone():
            return False, "Ja has obtingut aquesta recompensa anteriorment i no es pot repetir"

        # 5. Iniciar transacció per al bescanvi
        # mysql-connector-python sol tenir autocommit=False per defecte,
        # per tant ja hi ha una transacció iniciada en executar el primer query.
        
        # A. Restar punts a l'usuari
        cursor.execute("UPDATE usuaris SET punts_gamificacio = punts_gamificacio - %s WHERE id = %s", (cost, user_id))
        
        # B. Registrar a usuaris_recompenses
        cursor.execute(
            "INSERT INTO usuaris_recompenses (usuari_id, recompensa_id) VALUES (%s, %s)",
            (user_id, reward_id)
        )
        
        # C. Registrar el moviment de punts
        cursor.execute(
            """INSERT INTO punts_moviments (usuari_id, tipus_moviment, punts, origen_tipus, origen_id, descripcio) 
               VALUES (%s, 'bescanvi', %s, 'recompensa', %s, %s)""",
            (user_id, -cost, reward_id, f"Bescanvi de recompensa: {recompensa['nom']}")
        )
        
        # D. Registrar a bescanvis_recompenses
        cursor.execute(
            "INSERT INTO bescanvis_recompenses (usuari_id, recompensa_id, punts_cost) VALUES (%s, %s, %s)",
            (user_id, reward_id, cost)
        )
        
        conn.commit()
        return True, f"Recompensa '{recompensa['nom']}' bescanviada amb èxit!"
        
    except Exception as e:
        try:
            conn.rollback()
        except:
            pass
        print(f"[GAMIFICACIO] Error en bescanvi: {str(e)}")
        return False, f"Error intern: {str(e)}"
    finally:
        cursor.close()
        conn.close()

def get_user_obtained_rewards(user_id):
    """Retorna la llista de recompenses que ja té l'usuari."""
    conn = get_new_connection()
    if not conn:
        return []
    
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT r.*, ur.data_obtencio, ur.utilitzada 
            FROM usuaris_recompenses ur
            JOIN recompenses r ON ur.recompensa_id = r.id
            WHERE ur.usuari_id = %s
            ORDER BY ur.data_obtencio DESC
        """, (user_id,))
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

def get_user_available_rewards(user_id):
    """Retorna les recompenses que l'usuari té però no ha fet servir encara."""
    conn = get_new_connection()
    if not conn:
        return []
    
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT r.*, ur.data_obtencio
            FROM usuaris_recompenses ur
            JOIN recompenses r ON ur.recompensa_id = r.id
            WHERE ur.usuari_id = %s AND ur.utilitzada = FALSE
            ORDER BY r.tipus DESC, ur.data_obtencio ASC
        """, (user_id,))
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()
