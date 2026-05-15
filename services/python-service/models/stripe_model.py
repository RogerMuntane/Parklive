"""
Model per a la integració amb Stripe.

Aquest mòdul gestiona tota la comunicació amb l'API de Stripe: creació de clients,
gestió de mètodes de pagament, subscripcions premium, intents de pagament i
sincronització amb la base de dades local.
"""

import stripe
import os
from datetime import datetime
from models.db_connection import get_new_connection


# Configurar Stripe d'entrada utilitzant la clau privada de l'entorn
stripe.api_key = os.getenv('STRIPE_APIPrivada', '').strip()
stripe.max_network_retries = 3  # Activar retries automàtics de l'SDK de Stripe


def get_user_stripe_id(user_id):
    """
    Obté l'identificador de client de Stripe (stripe_customer_id) d'un usuari.
    
    Args:
        user_id (int): ID de l'usuari a la base de dades local.
        
    Returns:
        str|None: El stripe_customer_id o None si no existeix o hi ha error.
    """
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
    """
    Llista tots els mètodes de pagament (targetes) vinculats a un client de Stripe.
    
    Args:
        stripe_customer_id (str): Identificador del client a Stripe.
        
    Returns:
        list: Llista d'objectes PaymentMethod de Stripe.
    """
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
    """
    Desvincula (detach) un mètode de pagament de Stripe.
    
    Args:
        payment_method_id (str): ID del mètode de pagament.
        
    Returns:
        bool: True si s'ha desvinculat correctament.
    """
    try:
        stripe.PaymentMethod.detach(payment_method_id)
        return True
    except Exception as e:
        print(f"Error eliminant mètode de pagament: {e}")
        return False


def create_stripe_customer(user_id, email, name):
    """
    Crea un nou perfil de client a Stripe i el vincula a l'usuari local.
    
    Args:
        user_id (int): ID local de l'usuari.
        email (str): Correu electrònic de l'usuari.
        name (str): Nom complet de l'usuari.
        
    Returns:
        str|None: El nou stripe_customer_id generat.
    """
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
    """
    Crea un SetupIntent de Stripe per permetre desar una targeta sense realitzar cap pagament immediat.
    
    Args:
        stripe_customer_id (str): ID del client a Stripe.
        
    Returns:
        stripe.SetupIntent|None: L'objecte SetupIntent creat.
    """
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
    """
    Crea una nova subscripció premium a Stripe i la registra a la base de dades local.
    
    Args:
        stripe_customer_id (str): ID del client de Stripe.
        payment_method_id (str): ID del mètode de pagament a utilitzar.
        user_id (int): ID local de l'usuari.
        autorenovacio (bool): Si la subscripció s'ha de renovar automàticament.
        plan_type (str): 'monthly' o 'annual'.
        
    Returns:
        stripe.Subscription|None: L'objecte subscripció creat.
    """
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
    """
    Persisteix a la BD local una subscripció Stripe i la seva factura associada.

    Realitza tres operacions dins la mateixa transacció:
    1. Actualitza el `tipus_usuari` a 'premium'.
    2. Insereix a la taula `subscripcions` amb dates i pla extretes del Stripe Subscription.
    3. Insereix a `pagaments` i a `factures` amb el número de factura de Stripe.

    Args:
        user_id (int): ID local de l'usuari.
        subscription (stripe.Subscription): Objecte subscripció retornat per Stripe API.
        autorenovacio (bool): Si la subscripció s'ha de renovar automàticament.
    """
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
    """
    Actualitza l'estat d'una subscripció a la base de dades local.
    
    Args:
        stripe_sub_id (str): ID de la subscripció a Stripe.
        status (str): Nou estat (activa, cancelada, etc.).
        data_final (str|None): Nova data de finalització si escau.
        
    Returns:
        bool: True si s'ha actualitzat correctament.
    """
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
    """
    Actualitza el tipus d'usuari (premium/basic) a la BD basat en el stripe_customer_id.
    
    Args:
        stripe_customer_id (str): ID del client a Stripe.
        is_premium (bool): True si l'usuari és premium.
        
    Returns:
        bool: True si s'ha realitzat el canvi.
    """
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
    """
    Canvia l'estat d'autorenovació d'un usuari. Busca la subscripció activa i l'actualitza.
    
    Args:
        user_id (int): ID local de l'usuari.
        autorenovacio (bool): Nou estat d'autorenovació.
        
    Returns:
        bool: True si s'ha actualitzat correctament.
    """
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
    """
    Estableix l'estat d'autorenovació a Stripe i sincronitza la BD local.

    Modifica el paràmetre `cancel_at_period_end` a Stripe (True = no renova)
    i actualitza el camp `auto_renovacio` a la taula `subscripcions`.

    Args:
        stripe_sub_id (str): ID de la subscripció a Stripe.
        autorenovacio (bool): True per activar autorenovació, False per cancel·lar-la.

    Returns:
        bool: True si tant Stripe com la BD s'han actualitzat correctament.
    """
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
    """
    Obté els detalls complets de la subscripció activa des de Stripe, amb fallbacks locals.
    
    Aquesta funció és robusta i gestiona:
    1. Cerca a la BD local per obtenir el stripe_subscription_id.
    2. Recuperació de dades des de Stripe API.
    3. Sincronització amb extensions locals de gamificació.
    4. Fallbacks a dades locals si l'API de Stripe no respon o l'ID no es troba.

    Args:
        user_id (int): ID local de l'usuari.
        
    Returns:
        dict|stripe.Subscription|None: L'objecte subscripció o un diccionari simulat.
    """
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


# Import mínim per moneda (en cèntims), tal com defineix Stripe.
# https://docs.stripe.com/currencies#minimum-and-maximum-charge-amounts
STRIPE_MIN_AMOUNTS = {
    'eur': 50,
    'usd': 50,
    'gbp': 30,
}


def createPaymentIntent(amount, currency, customer_id, payment_method_id):
    """
    Crea i confirma automàticament un intent de pagament a Stripe amb captura manual.

    Si l'import és inferior al mínim permès per Stripe per a la moneda indicada
    (p. ex. 50 cèntims per EUR), eleva un ValueError descriptiu en lloc de
    deixar que l'API de Stripe retorni un error 400 confús.

    Args:
        amount (int): Import en cèntims (ha de ser >= mínim de la moneda).
        currency (str): Moneda en minúscules (ex: 'eur').
        customer_id (str): ID del client de Stripe.
        payment_method_id (str): ID de la targeta guardada a Stripe.

    Returns:
        stripe.PaymentIntent|None: L'intent de pagament creat amb estat
        'requires_capture' (captura manual) o 'succeeded'.

    Raises:
        ValueError: Si l'import és 0 o inferior al mínim de la moneda.
        Exception: Si la targeta és denegada pel banc.
    """
    currency_lower = (currency or 'eur').lower()
    min_amount = STRIPE_MIN_AMOUNTS.get(currency_lower, 50)

    if amount < min_amount:
        raise ValueError(
            f"L'import ({amount} cèntims) és inferior al mínim permès per Stripe "
            f"per a {currency_lower.upper()} ({min_amount} cèntims). "
            f"Per a reserves gratuïtes, utilitza 'authorize_or_setup_payment'."
        )

    try:
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency_lower,
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


def authorize_or_setup_payment(amount, currency, customer_id, payment_method_id):
    """
    Punt d'entrada unificat per a pagaments de reserves.

    Decideix automàticament entre PaymentIntent i SetupIntent:
    - Si l'import és >= al mínim de Stripe → `PaymentIntent` amb captura manual.
    - Si l'import és 0 o inferior al mínim → `SetupIntent` per verificar la
      targeta sense cap càrrec (reserves gratuïtes o amb descompte total).

    Args:
        amount (int): Import en cèntims.
        currency (str): Moneda en minúscules (ex: 'eur').
        customer_id (str): ID del client de Stripe.
        payment_method_id (str): ID del mètode de pagament.

    Returns:
        dict: Diccionari normalitzat amb:
            - 'type' (str): 'payment_intent' o 'setup_intent'.
            - 'id' (str): ID de l'objecte Stripe.
            - 'status' (str): Estat retornat per Stripe.
            - 'object' (stripe obj): L'objecte original de Stripe.

    Raises:
        Exception: Propaga excepcions de targeta denegada o errors de l'API.
    """
    currency_lower = (currency or 'eur').lower()
    min_amount = STRIPE_MIN_AMOUNTS.get(currency_lower, 50)

    if amount >= min_amount:
        # Flux estàndard: autoritzar i capturar en el moment de check-out
        pi = createPaymentIntent(amount, currency_lower, customer_id, payment_method_id)
        return {
            'type': 'payment_intent',
            'id': pi.id,
            'status': pi.status,
            'object': pi,
        }
    else:
        # Reserves gratuïtes o descompte del 100%: només verificar la targeta
        print(f"[Stripe] Import {amount} < mínim {min_amount} per {currency_lower}. Usant SetupIntent.")
        try:
            stripe.PaymentMethod.attach(payment_method_id, customer=customer_id)
            si = stripe.SetupIntent.create(
                customer=customer_id,
                payment_method=payment_method_id,
                confirm=True,
                automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
            )
            return {
                'type': 'setup_intent',
                'id': si.id,
                'status': si.status,
                'object': si,
            }
        except stripe.error.CardError as e:
            print(f"[Stripe] Targeta denegada al SetupIntent ({e.user_message})")
            raise Exception(e.user_message)
        except Exception as e:
            print(f"[Stripe] Error creant SetupIntent: {e}")
            raise


def registrar_pagament_db(reserva_id, usuari_id, import_pagament, metode, referencia_externa, estat='completat'):
    """
    Registra un pagament a la base de dades local utilitzant el procediment 'sp_registrar_pagament'.
    
    Args:
        reserva_id (int): ID de la reserva associada.
        usuari_id (int): ID de l'usuari.
        import_pagament (float): Import total.
        metode (str): Mètode de pagament.
        referencia_externa (str): ID de referència de Stripe (PaymentIntent).
        estat (str): Estat del pagament.
        
    Returns:
        int: L'ID del pagament registrat a la BD.
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

        return pagament_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()


def log_failed_payment(stripe_customer_id, invoice_id, amount):
    """
    Registra al log un intent de pagament fallit per a auditoria i depósit.

    Args:
        stripe_customer_id (str): ID del client de Stripe.
        invoice_id (str): ID de la factura fallida.
        amount (int): Import en cèntims.
    """
    print(f"[Webhook] PAGAMENT FALLIT: Customer={stripe_customer_id}, Invoice={invoice_id}, Amount={amount}")


def cancel_payment_intent(payment_intent_id):
    """
    Cancel·la un PaymentIntent que ha estat autoritzat però encara no capturat.
    
    Args:
        payment_intent_id (str): ID de l'intent a Stripe.
        
    Returns:
        stripe.PaymentIntent|None: L'objecte cancel·lat.
    """
    try:
        payment_intent = stripe.PaymentIntent.cancel(payment_intent_id)
        return payment_intent
    except Exception as e:
        print(f"[Stripe] Error cancel·lant intent de pagament {payment_intent_id}: {e}")
        return None


def capture_payment_intent(payment_intent_id):
    """
    Captura la totalitat d'un PaymentIntent autoritzat anteriorment.
    Implementa reintents automàtics en cas d'errors de xarxa o DNS.
    
    Args:
        payment_intent_id (str): ID de l'intent a Stripe.
        
    Returns:
        stripe.PaymentIntent|None: L'intent de pagament capturat.
    """
    import time
    max_retries = 3
    retry_delay = 5  # segons entre reintents

    for attempt in range(max_retries):
        try:
            payment_intent = stripe.PaymentIntent.capture(payment_intent_id)
            return payment_intent
        except stripe.error.APIConnectionError as e:
            # Error de xarxa o DNS
            print(f"[Stripe] Error de connexió en capturar {payment_intent_id} (intent {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                return None
        except Exception as e:
            print(f"[Stripe] Error capturant intent de pagament {payment_intent_id}: {e}")
            return None


def actualitzar_estat_pagament_db(referencia_externa, nou_estat):
    """
    Actualitza l'estat d'un pagament a la BD cercant per la referència externa de Stripe.
    
    Args:
        referencia_externa (str): ID de referència (Stripe PaymentIntent).
        nou_estat (str): Nou estat (completat, fallit, etc.).
        
    Returns:
        bool: True si s'ha actualitzat la fila.
    """
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

