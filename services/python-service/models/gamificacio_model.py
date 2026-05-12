"""
Model per a la gestió de la gamificació.

Aquest mòdul gestiona el sistema de recompenses de Parklive: el saldo de punts
dels usuaris, el catàleg de recompenses disponibles i la lògica transaccional
de bescanvi (redeem), incloent-hi l'activació automàtica de beneficis com 
subscripcions premium temporals.
"""

import json
from models.db_connection import get_new_connection

def get_user_points(user_id):
    """
    Retorna el saldo actual de punts de gamificació d'un usuari.
    
    Args:
        user_id (int): ID de l'usuari.
        
    Returns:
        int: Nombre total de punts acumulats.
    """
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
    """
    Retorna el catàleg de totes les recompenses actives al sistema.
    
    Returns:
        list: Llista de diccionaris amb els detalls de cada recompensa (nom, cost, tipus).
    """
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
    Gestiona el procés atòmic de bescanvi d'una recompensa per punts.
    
    Aquesta funció realitza les següents accions en una transacció:
    1. Validació de punts suficients i estat de la recompensa.
    2. Comprovació de si la recompensa és repetible (ex: premium sí, insígnia no).
    3. Deducció de punts del saldo de l'usuari.
    4. Registre de la propietat de la recompensa i historial de moviments.
    5. Lògica especial per a 'premium_temporal':
       - Si l'usuari ja té premium, s'estén la data de finalització.
       - Si no en té, es crea una nova subscripció gratuïta de 30 dies.

    Args:
        user_id (int): ID de l'usuari que realitza la petició.
        reward_id (int): ID de la recompensa a bescanviar.
        
    Returns:
        tuple: (bool, str) on el booleà indica l'èxit i el text conté el missatge de feedback.
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
        
        # 3. Comprovar punts de l'usuari (Bloqueig per a actualització segura)
        cursor.execute("SELECT punts_gamificacio FROM usuaris WHERE id = %s FOR UPDATE", (user_id,))
        usuari = cursor.fetchone()
        if not usuari:
            return False, "Usuari no trobat"
        
        if usuari['punts_gamificacio'] < cost:
            return False, f"No tens prou punts (en tens {usuari['punts_gamificacio']}, en calen {cost})"
        
        # 4. Comprovar si ja té aquesta recompensa (excepte premium que es pot renovar)
        if recompensa['tipus'] != 'premium_temporal':
            cursor.execute("SELECT id FROM usuaris_recompenses WHERE usuari_id = %s AND recompensa_id = %s", (user_id, reward_id))
            if cursor.fetchone():
                return False, "Ja has obtingut aquesta recompensa anteriorment i no es pot repetir"

        # 5. Executar el bescanvi (Transaccional)
        # mysql-connector-python: commit() és necessari si no està en autocommit
        
        # A. Restar punts a l'usuari
        cursor.execute("UPDATE usuaris SET punts_gamificacio = punts_gamificacio - %s WHERE id = %s", (cost, user_id))
        
        # B. Registrar la propietat de la recompensa
        if recompensa['tipus'] == 'premium_temporal':
            cursor.execute(
                """INSERT INTO usuaris_recompenses (usuari_id, recompensa_id, data_obtencio, utilitzada)
                   VALUES (%s, %s, NOW(), FALSE)
                   ON DUPLICATE KEY UPDATE data_obtencio = NOW(), utilitzada = FALSE""",
                (user_id, reward_id)
            )
        else:
            cursor.execute(
                "INSERT INTO usuaris_recompenses (usuari_id, recompensa_id) VALUES (%s, %s)",
                (user_id, reward_id)
            )
        
        # C. Registrar el moviment de punts per a auditories
        cursor.execute(
            """INSERT INTO punts_moviments (usuari_id, tipus_moviment, punts, origen_tipus, origen_id, descripcio) 
               VALUES (%s, 'bescanvi', %s, 'recompensa', %s, %s)""",
            (user_id, -cost, reward_id, f"Bescanvi de recompensa: {recompensa['nom']}")
        )
        
        # D. Registrar el bescanvi a la taula de logs
        cursor.execute(
            "INSERT INTO bescanvis_recompenses (usuari_id, recompensa_id, punts_cost) VALUES (%s, %s, %s)",
            (user_id, reward_id, cost)
        )
        
        conn.commit()

        # E. Lògica d'activació de Premium Temporal
        if recompensa['tipus'] == 'premium_temporal':
            try:
                dies = 30  # Valor per defecte
                if recompensa.get('valor'):
                    import json as _json
                    valor_data = recompensa['valor'] if isinstance(recompensa['valor'], dict) else _json.loads(recompensa['valor'])
                    dies = int(valor_data.get('dies', 30))

                # Canviar el rol de l'usuari a premium si no ho era
                cursor.execute(
                    "UPDATE usuaris SET tipus_usuari = 'premium' WHERE id = %s",
                    (user_id,)
                )

                # Cercar subscripció activa per estendre-la
                cursor.execute(
                    "SELECT id, data_final FROM subscripcions WHERE usuari_id = %s AND estat = 'activa' ORDER BY id DESC LIMIT 1",
                    (user_id,)
                )
                sub_activa = cursor.fetchone()

                if sub_activa:
                    # Estendre la subscripció des de la data final actual o avui (el que sigui posterior)
                    cursor.execute(
                        """UPDATE subscripcions 
                           SET data_final = DATE_ADD(GREATEST(data_final, CURDATE()), INTERVAL %s DAY)
                           WHERE id = %s""",
                        (dies, sub_activa['id'])
                    )
                else:
                    # Crear nova subscripció promocional
                    cursor.execute("""
                        INSERT INTO subscripcions 
                            (usuari_id, tipus, estat, data_inici, data_final, preu, metode_pagament, auto_renovacio)
                        VALUES 
                            (%s, 'mensual', 'activa', CURDATE(), DATE_ADD(CURDATE(), INTERVAL %s DAY), 0.00, 'altres', FALSE)
                    """, (user_id, dies))

                conn.commit()
            except Exception as premium_err:
                print(f"[GAMIFICACIO] Error activant premium: {premium_err}")
                return True, f"Recompensa '{recompensa['nom']}' bescanviada, però hi ha hagut un error activant el premium. Contacta suport."

        return True, f"Recompensa '{recompensa['nom']}' bescanviada amb èxit!"
        
    except Exception as e:
        if conn: conn.rollback()
        print(f"[GAMIFICACIO] Error en bescanvi: {str(e)}")
        return False, f"Error intern: {str(e)}"
    finally:
        cursor.close()
        conn.close()

def get_user_obtained_rewards(user_id):
    """
    Llista totes les recompenses que l'usuari ha adquirit al llarg del temps.
    
    Args:
        user_id (int): ID de l'usuari.
        
    Returns:
        list: Llista de recompenses amb la seva data d'adquisició i estat d'ús.
    """
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
    """
    Obté les recompenses que l'usuari té en possessió i que encara no han estat aplicades/utilitzades.
    
    Args:
        user_id (int): ID de l'usuari.
        
    Returns:
        list: Llista de recompenses disponibles per ser aplicades (ex: cupons de descompte).
    """
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


