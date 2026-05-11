import stripe
import os
from datetime import datetime
from models.db_connection import get_new_connection


# Configurar Stripe d'entrada
stripe.api_key = os.getenv('STRIPE_APIPrivada', '').strip()
stripe.max_network_retries = 3  # Activar retries automàtics de l'SDK de Stripe


def get_user_stripe_id(user_id):
    """Obté el stripe_customer_id d'un usuari des de la BD"""
    conn = get_new_connection()
    if not conn:
        return None
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT stripe_customer_id FROM usuaris WHERE id = %s", (user_id,))
        result = cursor.fetchone()
        cursor.close()
        return result['stripe_customer_id'] if result else None
    except Exception as e:
        print(f"[DB] Error obtenint stripe_id: {e}")
        return None
    finally:
        conn.close()


def list_user_payment_methods(stripe_customer_id):
    """Llista tots els mètodes de pagament (targetes) d'un client a Stripe"""
    if not stripe_customer_id:
        return []

    try:
        payment_methods = stripe.PaymentMethod.list(
            customer=stripe_customer_id,
            type="card",
        )
        return payment_methods.data
    except Exception as e:
        print(f"Error llistant mètodes de pagament: {e}")
        return []


def delete_payment_method(payment_method_id):
    """Desvincula un mètode de pagament de Stripe"""
    try:
        stripe.PaymentMethod.detach(payment_method_id)
        return True
    except Exception as e:
        print(f"Error eliminant mètode de pagament: {e}")
        return False


def create_stripe_customer(user_id, email, name):
    """Crea un client a Stripe i el vincula a l'usuari a la BD"""
    try:
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={'user_id': user_id}
        )

        conn = get_new_connection()
        if conn:
            try:
                cursor = conn.cursor()
                cursor.callproc("sp_actualitzar_stripe_customer_id", (user_id, customer.id))
                conn.commit()
                cursor.close()
            except Exception as e:
                print(f"[DB] Error guardant stripe_customer_id: {e}")
            finally:
                conn.close()

        return customer.id
    except Exception as e:
        print(f"[Stripe] Error creant client: {e}")
        return None


def create_setup_intent(stripe_customer_id):
    """Crea un SetupIntent per permetre desar una nova targeta"""
    if not stripe_customer_id:
        return None

    try:
        setup_intent = stripe.SetupIntent.create(
            customer=stripe_customer_id,
            automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
        )
        return setup_intent
    except stripe.error.StripeError as e:
        print(f"[Stripe] Error de Stripe en crear SetupIntent: {e.user_message}")
        return None
    except Exception as e:
        print(f"[Stripe] Error inesperat en crear SetupIntent: {e}")
        return None


def create_subscription(stripe_customer_id, payment_method_id, user_id, autorenovacio=True, plan_type='monthly'):
    """Crea una subscripció premium per a un client"""
    if plan_type == 'annual':
        price_id = os.getenv('STRIPE_Anual_PREMIUM_PRICE_ID')
    else:
        price_id = os.getenv('STRIPE_PREMIUM_PRICE_ID')

    if not stripe_customer_id or not price_id or not payment_method_id:
        print(f"[Stripe] Faltes dades per a la subscripció: cust={stripe_customer_id}, price={price_id}, pm={payment_method_id}, type={plan_type}")
        return None

    if price_id and price_id.startswith('prod_'):
        print(f"[Stripe] ERROR: S'ha detectat un Product ID ({price_id}) en lloc d'un Price ID (price_...).")
        return None

    try:
        if payment_method_id:
            stripe.PaymentMethod.attach(payment_method_id, customer=stripe_customer_id)
            stripe.Customer.modify(
                stripe_customer_id,
                invoice_settings={"default_payment_method": payment_method_id},
            )

        subscription = stripe.Subscription.create(
            customer=stripe_customer_id,
            items=[{"price": price_id}],
            payment_behavior='default_incomplete',
            payment_settings={'save_default_payment_method': 'on_subscription'},
            expand=['latest_invoice.payment_intent'],
            cancel_at_period_end=(not autorenovacio)
        )

        _persist_subscription_to_db(user_id, subscription, autorenovacio)

        return subscription
    except Exception as e:
        print(f"[Stripe] Error creant subscripció: {e}")
        return None


def _persist_subscription_to_db(user_id, subscription, autorenovacio=True):
    """Guarda la subscripció, el pagament i la factura a la BD"""
    conn = get_new_connection()
    if not conn:
        return
    try:
        cursor = conn.cursor()

        cursor.execute(
            "UPDATE usuaris SET tipus_usuari = 'premium' WHERE id = %s",
            (user_id,)
        )

        data_inici = datetime.fromtimestamp(subscription.current_period_start).strftime('%Y-%m-%d')
        data_final = datetime.fromtimestamp(subscription.current_period_end).strftime('%Y-%m-%d')
        preu = subscription.plan.amount / 100
        tipus = 'anual' if (hasattr(subscription.plan, 'interval') and subscription.plan.interval == 'year') else 'mensual'

        cursor.execute(
            """INSERT INTO subscripcions (usuari_id, stripe_subscription_id, tipus, estat, data_inici, data_final, preu, metode_pagament, auto_renovacio)
               VALUES (%s, %s, %s, 'activa', %s, %s, %s, 'targeta', %s)""",
            (user_id, subscription.id, tipus, data_inici, data_final, preu, autorenovacio)
        )

        invoice = getattr(subscription, 'latest_invoice', None)
        payment_intent_id = None
        if invoice and hasattr(invoice, 'payment_intent') and invoice.payment_intent:
            payment_intent_id = invoice.payment_intent.id

        cursor.execute(
            """INSERT INTO pagaments (usuari_id, import, metode, estat, referencia_externa)
               VALUES (%s, %s, 'targeta_credit', 'completat', %s)""",
            (user_id, preu, payment_intent_id)
        )
        pagament_id = cursor.lastrowid

        numero_factura = getattr(invoice, 'number', None) or f"INV-{subscription.id}"
        cursor.execute(
            """INSERT INTO factures (pagament_id, usuari_id, numero_factura, import_subtotal, iva, import_total, data_emissio)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (pagament_id, user_id, numero_factura, preu * 0.79, preu * 0.21, preu, data_inici)
        )

        conn.commit()
        cursor.close()
        print(f"[DB] Subscripció i factura guardades per a l'usuari {user_id}")

    except Exception as e:
        conn.rollback()
        print(f"[DB] Error persistint subscripció: {e}")
    finally:
        conn.close()


def update_subscription_status(stripe_sub_id, status, data_final=None):
    """Actualitza l'estat d'una subscripció a la BD"""
    conn = get_new_connection()
    if not conn:
        return False
    try:
        cursor = conn.cursor()
        if data_final:
            cursor.execute(
                "UPDATE subscripcions SET estat = %s, data_final = %s WHERE stripe_subscription_id = %s",
                (status, data_final, stripe_sub_id)
            )
        else:
            cursor.execute(
                "UPDATE subscripcions SET estat = %s WHERE stripe_subscription_id = %s",
                (status, stripe_sub_id)
            )
        conn.commit()
        cursor.close()
        return True
    except Exception as e:
        print(f"[DB] Error actualitzant estat subscripció: {e}")
        return False
    finally:
        conn.close()


def update_user_premium_status(stripe_customer_id, is_premium):
    """Actualitza el tipus d'usuari (premium/basic) basat en el customer_id de Stripe"""
    conn = get_new_connection()
    if not conn:
        return False
    try:
        cursor = conn.cursor()
        tipus = 'premium' if is_premium else 'basic'
        cursor.execute(
            "UPDATE usuaris SET tipus_usuari = %s WHERE stripe_customer_id = %s",
            (tipus, stripe_customer_id)
        )
        conn.commit()
        cursor.close()
        return True
    except Exception as e:
        print(f"[DB] Error actualitzant premium status: {e}")
        return False
    finally:
        conn.close()


def update_subscription_autorenewal(user_id, autorenovacio):
    """Actualitza l'autorenovació tant a Stripe com a la BD local"""
    conn = get_new_connection()
    if not conn:
        return False
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT stripe_subscription_id FROM subscripcions WHERE usuari_id = %s AND estat = 'activa' ORDER BY id DESC LIMIT 1",
            (user_id,)
        )
        row = cursor.fetchone()
        cursor.close()

        if not row or not row['stripe_subscription_id']:
            print(f"[Stripe] No s'ha trobat subscripció activa per a l'usuari {user_id}")
            return False

        return set_subscription_autorenewal(row['stripe_subscription_id'], autorenovacio)

    except Exception as e:
        print(f"[Stripe] Error inicial en actualitzar autorenovació: {e}")
        return False
    finally:
        conn.close()


def set_subscription_autorenewal(stripe_sub_id, autorenovacio):
    """Actualitza l'autorenovació a Stripe i a la BD centralitzadament"""
    try:
        stripe.Subscription.modify(
            stripe_sub_id,
            cancel_at_period_end=(not autorenovacio)
        )

        conn = get_new_connection()
        if not conn:
            return False
        try:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE subscripcions SET auto_renovacio = %s WHERE stripe_subscription_id = %s",
                (autorenovacio, stripe_sub_id)
            )
            conn.commit()
            cursor.close()
        finally:
            conn.close()

        print(f"[Stripe] Autorenovació per a {stripe_sub_id} establerta a {autorenovacio}")
        return True
    except Exception as e:
        print(f"[Stripe] Error en set_subscription_autorenewal: {e}")
        return False


def get_active_subscription(user_id):
    """Obté els detalls de la subscripció activa des de Stripe"""
    conn = get_new_connection()
    if not conn:
        return None
    try:
        cursor = conn.cursor(dictionary=True)

        # Intent 1: buscar subscripció amb estat 'activa'
        cursor.execute(
            "SELECT id, stripe_subscription_id, estat FROM subscripcions WHERE usuari_id = %s AND estat = 'activa' ORDER BY id DESC LIMIT 1",
            (user_id,)
        )
        row = cursor.fetchone()

        # Si no trobem 'activa', fem un diagnòstic per saber quins estats hi ha
        if not row:
            cursor.execute(
                "SELECT id, stripe_subscription_id, estat FROM subscripcions WHERE usuari_id = %s ORDER BY id DESC LIMIT 3",
                (user_id,)
            )
            all_rows = cursor.fetchall()
            if all_rows:
                print(f"[DB][DIAG] Subscripcions trobades per usuari {user_id} (sense filtre d'estat):")
                for r in all_rows:
                    print(f"  -> stripe_id={r['stripe_subscription_id']}, estat='{r['estat']}'")
                # Fallback: si hi ha alguna sub amb stripe_subscription_id, intentem recuperar-la de Stripe
                # per a estats com 'pending', 'incomplete', etc. que poden significar premium de fet.
                best_row = next((r for r in all_rows if r['stripe_subscription_id']), None)
                if best_row:
                    print(f"[DB][DIAG] Usant fallback amb stripe_id={best_row['stripe_subscription_id']} (estat BD: '{best_row['estat']}')")
                    row = best_row
            else:
                print(f"[DB][DIAG] Cap subscripció trobada a la BD per a l'usuari {user_id}")

        if not row or not row['stripe_subscription_id']:
            if row:
                # Fallback a dades locals si tenim registre a la BD però no ID de Stripe
                print(f"[Stripe][Fallback] Usuari {user_id} té subscripció a la BD ({row['estat']}) però sense ID de Stripe.")
                # Obtenim dades extres per completar el mock
                cursor.execute("SELECT * FROM subscripcions WHERE id = %s", (row['id'],))
                full_row = cursor.fetchone()
                cursor.close()
                return {
                    'id': f"local_{full_row['id']}",
                    'status': full_row['estat'],
                    'current_period_end': int(datetime.combine(full_row['data_final'], datetime.min.time()).timestamp()),
                    'cancel_at_period_end': not full_row['auto_renovacio'],
                    'plan': type('obj', (object,), {'amount': float(full_row['preu']) * 100, 'interval': full_row['tipus']}),
                    'created': int(datetime.combine(full_row['data_inici'], datetime.min.time()).timestamp()),
                    'is_local': True
                }
            cursor.close()
            return None

        try:
            subscription = stripe.Subscription.retrieve(row['stripe_subscription_id'])
            
            # Comprovar si a la BD local tenim una data final més llunyana (per extensions de gamificació)
            cursor.execute("SELECT data_final FROM subscripcions WHERE id = %s", (row['id'],))
            local_sub = cursor.fetchone()
            if local_sub and local_sub['data_final']:
                local_ts = int(datetime.combine(local_sub['data_final'], datetime.min.time()).timestamp())
                # Si la data local és posterior a la de Stripe, la fem servir per a la UI
                if local_ts > subscription.current_period_end:
                    # Sobreescribim el timestamp per a la visualització al frontend
                    subscription.current_period_end = local_ts
            
            print(f"[Stripe] Subscripció recuperada: id={subscription.id}, status={subscription.status}")
            cursor.close()
            return subscription
        except Exception as e:
            print(f"[Stripe][Error] Error recuperant de Stripe ({row['stripe_subscription_id']}): {e}")
            # Fallback a dades locals si Stripe falla però tenim el registre
            cursor.execute("SELECT * FROM subscripcions WHERE id = %s", (row['id'],))
            full_row = cursor.fetchone()
            cursor.close()
            return {
                'id': row['stripe_subscription_id'],
                'status': full_row['estat'],
                'current_period_end': int(datetime.combine(full_row['data_final'], datetime.min.time()).timestamp()),
                'cancel_at_period_end': not full_row['auto_renovacio'],
                'plan': type('obj', (object,), {'amount': float(full_row['preu']) * 100, 'interval': full_row['tipus']}),
                'created': int(datetime.combine(full_row['data_inici'], datetime.min.time()).timestamp()),
                'is_local': True
            }
    except Exception as e:
        print(f"[Stripe] Error general en get_active_subscription: {e}")
        if 'cursor' in locals() and cursor:
            try: cursor.close()
            except: pass
        return None
    finally:
        conn.close()

def createPaymentIntent(amount, currency, customer_id, payment_method_id):
    """Crea i confirma automàticament un intent de pagament a Stripe"""
    try:
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            customer=customer_id,
            payment_method=payment_method_id,
            confirm=True,
            capture_method='manual',
            automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
        )
        return payment_intent
    except stripe.error.CardError as e:
        print(f"[Stripe] Targeta denegada ({e.user_message})")
        raise Exception(e.user_message)
    except Exception as e:
        print(f"[Stripe] Error creant intent de pagament: {e}")
        return None


def registrar_pagament_db(reserva_id, usuari_id, import_pagament, metode, referencia_externa, estat='completat'):
    """
    Registra el pagament a la base de dades mitjançant el procedure sp_registrar_pagament
    """
    from models.db_connection import get_new_connection
    conn = get_new_connection()
    cursor = conn.cursor()

    try:
        # Procedure params: p_reserva_id, p_usuari_id, p_import, p_metode, p_estat, p_referencia_externa, OUT p_id, OUT p_error
        proc_args = [
            reserva_id,
            usuari_id,
            import_pagament,
            metode,
            estat,
            referencia_externa,
            None,
            None
        ]
        result_args = cursor.callproc('sp_registrar_pagament', proc_args)
        conn.commit()

        if isinstance(result_args, dict):
            pagament_id = result_args.get('sp_registrar_pagament_arg7')
            error_msg = result_args.get('sp_registrar_pagament_arg8')
        else:
            pagament_id = result_args[6]
            error_msg = result_args[7]

        if error_msg:
            raise ValueError(error_msg)

        return pagament_id  # Retorna el pagament_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()


def log_failed_payment(stripe_customer_id, invoice_id, amount):
    """Registra un intent de pagament fallit"""
    print(f"[Webhook] PAGAMENT FALLIT: Customer={stripe_customer_id}, Invoice={invoice_id}, Amount={amount}")


def cancel_payment_intent(payment_intent_id):
    """Cancel·la a Stripe un PaymentIntent autoritzat (un-captured)"""
    try:
        payment_intent = stripe.PaymentIntent.cancel(payment_intent_id)
        return payment_intent
    except Exception as e:
        print(f"[Stripe] Error cancel·lant intent de pagament {payment_intent_id}: {e}")
        return None


def capture_payment_intent(payment_intent_id):
    """
    Captura a Stripe la totalitat d'un PaymentIntent autoritzat anteriorment.
    Implementa una petita lògica de reintent per errors de connexió (DNS/Xarxa).
    """
    import time
    max_retries = 3
    retry_delay = 5  # segons entre reintents

    for attempt in range(max_retries):
        try:
            payment_intent = stripe.PaymentIntent.capture(payment_intent_id)
            return payment_intent
        except stripe.error.APIConnectionError as e:
            # Error de xarxa o DNS (com el NameResolutionError)
            print(f"[Stripe] Error de connexió en capturar {payment_intent_id} (intent {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                return None
        except Exception as e:
            # Altres errors (targeta, estat invàlid, etc.) no els reintentem aquí
            print(f"[Stripe] Error capturant intent de pagament {payment_intent_id}: {e}")
            return None


def actualitzar_estat_pagament_db(referencia_externa, nou_estat):
    """Actualitza l'estat d'un pagament cercant-lo per la seva referència externa (Stripe PI ID)"""
    conn = get_new_connection()
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE pagaments SET estat = %s WHERE referencia_externa = %s",
            (nou_estat, referencia_externa)
        )
        conn.commit()
        return True
    except Exception as e:
        print(f"[DB] Error actualitzant estat pagament {referencia_externa}: {e}")
        conn.rollback()
        return False
    finally:
        if 'cursor' in locals():
            cursor.close()
        conn.close()
