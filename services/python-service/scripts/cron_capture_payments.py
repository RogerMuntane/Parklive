import sys
import os
from datetime import datetime

# Afegir el directori arrel al path per poder importar els models
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.db_connection import get_db_connection
from models.stripe_model import capture_payment_intent, actualitzar_estat_pagament_db
from models.reserves_model import actualitzar_estat_reserva

def capture_due_payments():
    print(f"[{datetime.now()}] Iniciant captura de pagaments autoritzats per reserves confirmades...")
    
    # Pre-check de connectivitat amb Stripe (DNS) amb reintents
    import socket
    import time
    
    dns_resolved = False
    max_dns_retries = 3
    for i in range(max_dns_retries):
        try:
            socket.gethostbyname('api.stripe.com')
            dns_resolved = True
            break
        except socket.gaierror:
            print(f"[{datetime.now()}] ADVERTÈNCIA: No es pot resoldre 'api.stripe.com' (intent {i+1}/{max_dns_retries}). Reintentant en 5s...")
            time.sleep(5)
    
    if not dns_resolved:
        print(f"[{datetime.now()}] ERROR CRÍTIC: No es pot resoldre 'api.stripe.com' després de {max_dns_retries} intents. Aturant execució.")
        return

    conn = get_db_connection()
    if not conn:
        print(f"[{datetime.now()}] ERROR: No es pot connectar a la base de dades.")
        return

    cursor = conn.cursor(dictionary=True)
    
    try:
        # Cercar pagaments en estat 'autoritzat' de reserves 'confirmada'
        # que ja han començat (data_entrada <= ara)
        query = """
            SELECT p.id as pagament_id, p.referencia_externa, r.id as reserva_id, r.codi_reserva
            FROM pagaments p
            JOIN reserves r ON p.reserva_id = r.id
            WHERE p.estat = 'autoritzat'
              AND r.estat = 'confirmada'
              AND r.data_sortida <= %s  
        """
        ara = datetime.now()
        cursor.execute(query, (ara,))
        due_payments = cursor.fetchall()
        
        if not due_payments:
            print(f"[{datetime.now()}] No s'han trobat pagaments pendents de capturar.")
            return
        
        print(f"[{datetime.now()}] S'han trobat {len(due_payments)} pagaments pendents.")

        for p in due_payments:
            try:
                pi_id = p['referencia_externa']
                res_id = p['reserva_id']
                codi = p['codi_reserva']
                
                print(f"[{datetime.now()}] Capturant pagament {pi_id} per la reserva {codi} (ID: {res_id})...")
                
                # 1. Capturar a Stripe
                stripe_res = capture_payment_intent(pi_id)
                
                if stripe_res and stripe_res.status == 'succeeded':
                    # 2. Actualitzar estat del pagament a la BD
                    actualitzar_estat_pagament_db(pi_id, 'completat')
                    
                    # 3. Actualitzar estat de la reserva a 'completada'
                    actualitzar_estat_reserva(res_id, 'completada')
                    
                    print(f"[{datetime.now()}] Pagament capturat i reserva {codi} completada amb èxit.")
                else:
                    print(f"[{datetime.now()}] ERROR: No s'ha pogut capturar el pagament a Stripe per la reserva {codi}.")
            except Exception as loop_e:
                print(f"[{datetime.now()}] ERROR processant el pagament {pi_id}: {loop_e}")

        print(f"[{datetime.now()}] Procés de captura finalitzat.")
        
    except Exception as e:
        print(f"[{datetime.now()}] ERROR en el cron de captura de pagaments: {e}")
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    capture_due_payments()
