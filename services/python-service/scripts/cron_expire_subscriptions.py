import sys
import os
from datetime import datetime

# Afegir el directori arrel al path per poder importar els models
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.db_connection import get_db_connection

def expire_subscriptions():
    print(f"[{datetime.now()}] Iniciant verificació diària de subscripcions expirades...")
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Cercar subscripcions que han arribat a la data final i no tenen autorenovació
        # O que estan marcades com a 'cancel·lada' però encara eren 'premium'
        query = """
            SELECT s.id, s.usuari_id, s.stripe_subscription_id 
            FROM subscripcions s
            JOIN usuaris u ON s.usuari_id = u.id
            WHERE u.tipus_usuari = 'premium'
              AND s.auto_renovacio = 0
              AND s.data_final <= CURDATE()
              AND s.estat IN ('activa', 'cancel·lada')
        """
        cursor.execute(query)
        expired_subs = cursor.fetchall()
        
        if not expired_subs:
            print(f"[{datetime.now()}] No s'han trobat subscripcions per expirar avui.")
            return

        for sub in expired_subs:
            user_id = sub['usuari_id']
            sub_id = sub['id']
            
            print(f"[{datetime.now()}] Expirant subscripció {sub_id} per a l'usuari {user_id}...")
            
            # 1. Actualitzar usuari a basic
            cursor.execute("UPDATE usuaris SET tipus_usuari = 'basic' WHERE id = %s", (user_id,))
            
            # 2. Actualitzar estat de la subscripció
            cursor.execute("UPDATE subscripcions SET estat = 'caducada' WHERE id = %s", (sub_id,))
            
            # 3. Opcional: Registrar una notificació de sistema per a l'usuari
            cursor.execute("""
                INSERT INTO notificacions (usuari_id, tipus, titol, missatge)
                VALUES (%s, 'info', 'Subscripció Premium finalitzada', 
                'El teu període Premium ha finalitzat i el compte ha tornat a modalitat Bàsica.')
            """, (user_id,))
            
            print(f"[{datetime.now()}] Usuari {user_id} passat a 'basic'.")

        conn.commit()
        print(f"[{datetime.now()}] Procés finalitzat correctament. Total expirats: {len(expired_subs)}")
        
    except Exception as e:
        conn.rollback()
        print(f"[{datetime.now()}] ERROR en el cron d'expiració: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    expire_subscriptions()
