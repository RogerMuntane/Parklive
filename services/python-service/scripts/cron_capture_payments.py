"""
Cron: Captura de pagaments autoritzats (ParkLive).

S'executa periòdicament via ``cron_scheduler.sh`` (cada hora) i captura
a Stripe els PaymentIntents autoritzats de reserves amb sortida passada.

Flux:
    1. Comprova DNS vers api.stripe.com (3 intents).
    2. Consulta pagaments 'autoritzat' de reserves 'confirmada' amb sortida <= NOW().
    3. Per cada pagament:
       - Si és un PaymentIntent (prefix 'pi_'): captura Stripe → actualitza BD → recalcula places.
       - Si és un SetupIntent (prefix 'si_', reserves gratuïtes): marca directament com a completat.

Execució manual::

    python3 scripts/cron_capture_payments.py
"""

import logging
import os
import socket
import sys
import time
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)

from models.db_connection import get_db_connection
from models.stripe_model import capture_payment_intent, actualitzar_estat_pagament_db
from models.reserves_model import actualitzar_estat_reserva


def _recalcular_places(conn, reserva_id: int) -> None:
    """
    Recalcula les places disponibles de l'aparcament associat a una reserva.

    Actualitza el camp ``places_disponibles`` comptant les reserves actives
    (estat 'confirmada' o 'pendent') que cobreixen l'instant actual.

    Args:
        conn: Connexió activa a la base de dades.
        reserva_id (int): ID de la reserva per obtenir l'aparcament associat.
    """
    try:
        ap_cursor = conn.cursor(dictionary=True)
        ap_cursor.execute(
            "SELECT aparcament_id FROM reserves WHERE id = %s", (reserva_id,)
        )
        ap_row = ap_cursor.fetchone()
        if ap_row:
            aparcament_id = ap_row['aparcament_id']
            ap_cursor.execute("""
                UPDATE aparcaments a
                SET places_disponibles = GREATEST(0, a.capacitat_total - (
                    SELECT COUNT(*) FROM reserves r
                    WHERE r.aparcament_id = a.id
                      AND r.estat IN ('confirmada', 'pendent')
                      AND r.data_entrada <= NOW()
                      AND r.data_sortida > NOW()
                ))
                WHERE a.id = %s
            """, (aparcament_id,))
            conn.commit()
            logger.info("places_disponibles actualitzades per aparcament ID %s.", aparcament_id)
        ap_cursor.close()
    except Exception as upd_e:
        logger.warning("No s'ha pogut actualitzar places_disponibles: %s", upd_e)


def capture_due_payments() -> None:
    """
    Captura tots els pagaments Stripe autoritzats per a reserves finalitzades.

    Consulta pagaments en estat 'autoritzat' de reserves 'confirmada' amb
    data_sortida <= NOW() i els captura a Stripe. Després actualitza la BD
    i recalcula la disponibilitat de l'aparcament afectat.

    Gestió de reserves gratuïtes:
        Les reserves amb descompte del 100% usen un SetupIntent (prefix 'si_')
        en lloc d'un PaymentIntent (prefix 'pi_'). Aquests registres ja estan
        en estat 'completat' a la BD i no apareixeran en la consulta principal
        (que filtra per 'autoritzat'). Si per qualsevol raó arriben al loop,
        es marquen directament com a completades sense cridar Stripe.
    """
    logger.info("Iniciant captura de pagaments autoritzats per reserves confirmades...")

    # Pre-check DNS: verificar connectivitat amb api.stripe.com
    dns_resolved = False
    max_dns_retries = 3
    for i in range(max_dns_retries):
        try:
            socket.gethostbyname('api.stripe.com')
            dns_resolved = True
            break
        except socket.gaierror:
            logger.warning(
                "No es pot resoldre 'api.stripe.com' (intent %d/%d). Reintentant en 5s...",
                i + 1, max_dns_retries
            )
            time.sleep(5)

    if not dns_resolved:
        logger.critical(
            "No es pot resoldre 'api.stripe.com' després de %d intents. Aturant execució.",
            max_dns_retries
        )
        return

    conn = get_db_connection()
    if not conn:
        logger.error("No es pot connectar a la base de dades.")
        return

    cursor = conn.cursor(dictionary=True)

    try:
        # Cercar pagaments en estat 'autoritzat' de reserves 'confirmada'
        # que ja han superat la data de sortida.
        query = """
            SELECT p.id AS pagament_id, p.referencia_externa, r.id AS reserva_id, r.codi_reserva
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
            logger.info("No s'han trobat pagaments pendents de capturar.")
            return

        logger.info("S'han trobat %d pagament(s) pendents de capturar.", len(due_payments))

        for p in due_payments:
            pi_id = p['referencia_externa']
            res_id = p['reserva_id']
            codi = p['codi_reserva']

            try:
                # ── Reserves gratuïtes: SetupIntent (prefix 'si_') ──────────────
                # No retenen fons, per tant no cal capturar-les a Stripe.
                # En condicions normals no haurien d'arribar aquí (ja estan en
                # estat 'completat'), però afegim la guarda per robustesa.
                if not pi_id or not pi_id.startswith('pi_'):
                    logger.info(
                        "Referència '%s' (reserva %s) no és un PaymentIntent. "
                        "Marcant directament com a completada (reserva gratuïta).",
                        pi_id, codi
                    )
                    actualitzar_estat_pagament_db(pi_id, 'completat')
                    actualitzar_estat_reserva(res_id, 'completada')
                    _recalcular_places(conn, res_id)
                    continue

                # ── Reserves de pagament: PaymentIntent (prefix 'pi_') ──────────
                logger.info(
                    "Capturant pagament %s per la reserva %s (ID: %s)...",
                    pi_id, codi, res_id
                )

                # 1. Capturar a Stripe
                stripe_res = capture_payment_intent(pi_id)

                if stripe_res and stripe_res.status == 'succeeded':
                    # 2. Actualitzar estat del pagament a la BD
                    actualitzar_estat_pagament_db(pi_id, 'completat')

                    # 3. Actualitzar estat de la reserva a 'completada'
                    actualitzar_estat_reserva(res_id, 'completada')

                    # 4. Recalcular places_disponibles de l'aparcament
                    _recalcular_places(conn, res_id)

                    logger.info("Pagament capturat i reserva %s completada amb èxit.", codi)
                else:
                    logger.error(
                        "No s'ha pogut capturar el pagament a Stripe per la reserva %s.", codi
                    )

            except Exception as loop_e:
                logger.error("ERROR processant el pagament %s: %s", pi_id, loop_e)

        logger.info("Procés de captura finalitzat.")

    except Exception as e:
        logger.error("ERROR en el cron de captura de pagaments: %s", e)
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()


if __name__ == "__main__":
    capture_due_payments()
