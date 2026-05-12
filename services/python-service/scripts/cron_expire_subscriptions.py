"""
Cron: Expiració de subscripcions premium (ParkLive).

S'executa periòdicament via ``cron_scheduler.sh`` (cada hora) i verifica
quines subscripcions premium han caducat sense autorenovació, degradant
els usuaris corresponents al pla bàsic.

Flux:
    1. Cerca subscripcions actives o cancel·lades amb data_final <= CURDATE()
       i auto_renovacio = 0 per a usuaris de tipus 'premium'.
    2. Per cada subscripció trobada:
       a. Degrada l'usuari a tipus 'basic'.
       b. Marca la subscripció com a 'caducada'.
       c. Insereix una notificació informativa a la BD.
    3. Fa commit transaccional de tots els canvis.

Execució manual::

    python3 scripts/cron_expire_subscriptions.py
"""

import logging
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)

from models.db_connection import get_db_connection

def expire_subscriptions() -> None:
    """
    Expira les subscripcions premium caducades sense autorenovació.

    Consulta la BD per a subscripcions en estat 'activa' o 'cancelada' amb
    data_final <= CURDATE() i auto_renovacio = 0. Per cada cas detectat:

    - Degrada l'usuari de 'premium' a 'basic'.
    - Actualitza l'estat de la subscripció a 'caducada'.
    - Crea una notificació informativa per a l'usuari.

    Tot s'executa en una única transacció; en cas d'error es fa rollback.

    Returns:
        None: Els resultats es registren via logging.
    """
    logger.info("Iniciant verificació diària de subscripcions expirades...")
    
    conn = get_db_connection()
    if not conn:
        logger.error("No es pot connectar a la base de dades.")
        return

    cursor = conn.cursor(dictionary=True)
    
    try:
        # Cercar subscripcions que han arribat a la data final i no tenen autorenovació
        # O que estan marcades com a 'cancelada' però encara eren 'premium'
        query = """
            SELECT s.id, s.usuari_id
            FROM subscripcions s
            JOIN usuaris u ON s.usuari_id = u.id
            WHERE u.tipus_usuari = 'premium'
              AND s.auto_renovacio = 0
              AND s.data_final <= CURDATE()
              AND s.estat IN ('activa', 'cancelada')
        """
        cursor.execute(query)
        expired_subs = cursor.fetchall()
        
        if not expired_subs:
            logger.info("No s'han trobat subscripcions per expirar avui.")
            return

        for sub in expired_subs:
            user_id = sub['usuari_id']
            sub_id = sub['id']

            logger.info("Expirant subscripció %s per a l'usuari %s...", sub_id, user_id)

            # 1. Degradar usuari a basic
            cursor.execute("UPDATE usuaris SET tipus_usuari = 'basic' WHERE id = %s", (user_id,))

            # 2. Marcar la subscripció com a caducada
            cursor.execute("UPDATE subscripcions SET estat = 'caducada' WHERE id = %s", (sub_id,))

            # 3. Notificació de sistema per a l'usuari
            cursor.execute("""
                INSERT INTO notificacions (usuari_id, tipus, titol, missatge)
                VALUES (%s, 'info', 'Subscripció Premium finalitzada', 
                'El teu període Premium ha finalitzat i el compte ha tornat a modalitat Bàsica.')
            """, (user_id,))

            logger.info("Usuari %s degradat a 'basic'.", user_id)

        conn.commit()
        logger.info("Procés finalitzat. Total subscripcions expirades: %d", len(expired_subs))
        
    except Exception as e:
        if 'conn' in locals() and conn:
            conn.rollback()
        logger.error("ERROR en el cron d'expiració: %s", e)
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    expire_subscriptions()
