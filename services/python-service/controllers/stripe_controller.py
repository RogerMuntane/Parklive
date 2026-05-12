"""
Controlador per a la gestió de subscripcions i mètodes de pagament de Stripe.

Exposa endpoints per a la gestió del cicle de vida d'una subscripció premium:
creació, configuració de SetupIntent, canvi d'autorenovació, sincronització
amb la BD local i consulta de l'historial de facturació. També gestiona
les targetes desades (llistat i eliminació).
"""

from flask import jsonify, request
import os
from models.stripe_model import get_user_stripe_id, list_user_payment_methods, delete_payment_method, create_setup_intent, create_subscription

from middleware.jwt_auth import get_jwt_user_id

def get_payment_methods():
    """
    GET /api/stripe/payment-methods - Retorna les targetes desades d'un usuari.

    Query params:
        user_id (int|None): Verificació addicional (ha de coincidir amb el JWT).

    Returns:
        JSON 200: Llista de targetes amb brand, last4 i dates de caducitat.
        JSON 401: JWT falta o és invàlid.
        JSON 403: user_id no coincideix amb el token.
        JSON 404: L'usuari no té compte de Stripe.
    """
    try:
        usuari_autenticat_id = get_jwt_user_id()
    except ValueError as e:
        return jsonify({'error': str(e)}), 401

    user_id = request.args.get('user_id')
    if user_id and int(user_id) != usuari_autenticat_id:
        return jsonify({'error': 'Accés denegat'}), 403
    
    stripe_id = get_user_stripe_id(usuari_autenticat_id)
    if not stripe_id:
        return jsonify({'error': 'L\'usuari no té compte de Stripe associat'}), 404
    
    methods = list_user_payment_methods(stripe_id)
    # ... rest of formatting ...
    formatted_methods = []
    for m in methods:
        card = getattr(m, 'card', None)
        if not card: continue
        
        formatted_methods.append({
            'id': m.id,
            'brand': getattr(card, 'brand', 'unknown'),
            'last4': getattr(card, 'last4', '****'),
            'exp_month': getattr(card, 'exp_month', 0),
            'exp_year': getattr(card, 'exp_year', 0),
            'is_default': False
        })
        
    return jsonify(formatted_methods), 200

def detach_payment_method(method_id):
    """
    DELETE /api/stripe/payment-methods/<id> - Desvincula una targeta de Stripe.

    Args:
        method_id (str): ID del PaymentMethod a eliminar (de l'URL).

    Returns:
        JSON 200: Confirmació de l'eliminació.
        JSON 400: Si l'ID no s'ha proporcionat.
        JSON 401: JWT falta o és invàlid.
        JSON 500: Error al desvinular la targeta.
    """
    # Validar que l'usuari estigui autenticat
    try:
        get_jwt_user_id()
    except ValueError as e:
        return jsonify({'error': str(e)}), 401

    if not method_id:
        return jsonify({'error': 'L\'ID del mètode de pagament és obligatori'}), 400
    
    success = delete_payment_method(method_id)
    if success:
        return jsonify({'message': 'Targeta eliminada correctament'}), 200
    else:
        return jsonify({'error': 'No s\'ha pogut eliminar la targeta'}), 500

def get_setup_intent():
    """
    GET /api/stripe/setup-intent - Crea un SetupIntent per vincular una nova targeta.

    El client_secret retornat s'usa al frontend per inicialitzar el formulari
    de targeta de Stripe Elements sense realitzar cap càrrec immediat.

    Query params:
        user_id (int|None): Verificació addicional (ha de coincidir amb el JWT).

    Returns:
        JSON 200: client_secret i stripe_publishable_key.
        JSON 401: JWT falta o és invàlid.
        JSON 403: user_id no coincideix amb el token.
        JSON 404: L'usuari no té compte de Stripe.
        JSON 500: Error al crear el SetupIntent.
    """
    try:
        usuari_autenticat_id = get_jwt_user_id()
    except ValueError as e:
        return jsonify({'error': str(e)}), 401

    user_id = request.args.get('user_id')
    if user_id and int(user_id) != usuari_autenticat_id:
        return jsonify({'error': 'Accés denegat'}), 403
    
    stripe_id = get_user_stripe_id(usuari_autenticat_id)
    if not stripe_id:
        return jsonify({'error': 'L\'usuari no té compte de Stripe associat'}), 404
    
    setup_intent = create_setup_intent(stripe_id)
    if setup_intent:
        return jsonify({
            'client_secret': setup_intent.client_secret,
            'stripe_publishable_key': os.getenv('STRIPE_APIPublica', '')
        }), 200
    else:
        return jsonify({'error': 'No s\'ha pogut crear el SetupIntent. Revisa els logs del servidor.'}), 500

def handle_create_subscription():
    """
    POST /api/stripe/subscriptions - Crea una nova subscripció premium.

    Associa el mètode de pagament al client de Stripe, crea la subscripció
    i persisteix les dades a la BD local (subscripcions, pagaments, factures).

    Body JSON:
        user_id (int|None): Verificació addicional.
        payment_method_id (str): ID de la targeta a usar.
        autorenovacio (bool): Si activa l'autorenovació (per defecte True).
        plan_type (str): 'monthly' o 'annual' (per defecte 'monthly').

    Returns:
        JSON 200: subscriptionId, clientSecret i status de la subscripció.
        JSON 401: JWT falta o és invàlid.
        JSON 403: user_id no coincideix amb el token.
        JSON 404: L'usuari no té compte de Stripe.
        JSON 500: Error al crear la subscripció.
    """
    try:
        usuari_autenticat_id = get_jwt_user_id()
    except ValueError as e:
        return jsonify({'error': str(e)}), 401

    data = request.get_json()
    user_id = data.get('user_id')
    if user_id and int(user_id) != usuari_autenticat_id:
        return jsonify({'error': 'Accés denegat'}), 403

    payment_method_id = data.get('payment_method_id')
    autorenovacio = data.get('autorenovacio', True)
    plan_type = data.get('plan_type', 'monthly')

    stripe_id = get_user_stripe_id(usuari_autenticat_id)
    if not stripe_id:
        return jsonify({'error': 'L\'usuari no té compte de Stripe associat'}), 404

    subscription = create_subscription(stripe_id, payment_method_id, usuari_autenticat_id, autorenovacio, plan_type)
    
    if subscription:
        return jsonify({
            'subscriptionId': subscription.id,
            'clientSecret': subscription.latest_invoice.payment_intent.client_secret if subscription.latest_invoice.payment_intent else None,
            'status': subscription.status
        }), 200
    else:
        return jsonify({'error': 'No s\'ha pogut crear la subscripció'}), 500

def handle_update_autorenewal():
    """
    PATCH /api/stripe/subscriptions/autorenewal - Actualitza l'autorenovació.

    Body JSON:
        user_id (int|None): Verificació addicional.
        autorenovacio (bool): True per activar, False per desactivar (obligatori).

    Returns:
        JSON 200: Confirmació del canvi.
        JSON 400: Si autorenovacio no s'ha proporcionat.
        JSON 401: JWT falta o és invàlid.
        JSON 403: user_id no coincideix amb el token.
        JSON 500: Error al actualitzar a Stripe o BD.
    """
    try:
        usuari_autenticat_id = get_jwt_user_id()
    except ValueError as e:
        return jsonify({'error': str(e)}), 401

    data = request.get_json()
    user_id = data.get('user_id')
    if user_id and int(user_id) != usuari_autenticat_id:
        return jsonify({'error': 'Accés denegat'}), 403

    autorenovacio = data.get('autorenovacio')
    if autorenovacio is None:
        return jsonify({'error': 'L\'estat d\'autorenovació és obligatori'}), 400

    from models.stripe_model import update_subscription_autorenewal
    success = update_subscription_autorenewal(usuari_autenticat_id, autorenovacio)
    
    if success:
        return jsonify({'message': 'Autorenovació actualitzada correctament'}), 200
    else:
        return jsonify({'error': 'No s\'ha pogut actualitzar l\'autorenovació'}), 500

def get_subscription_details():
    """
    GET /api/stripe/subscriptions/details - Retorna el detall de la subscripció activa.

    Prio ritza les dades de Stripe API amb fallback a la BD local.
    Normalitza la resposta per a subscripcions Stripe natives i simulades.

    Query params:
        user_id (int|None): Verificació addicional.

    Returns:
        JSON 200: subscription_id, status, current_period_end, plan_amount, etc.
        JSON 401: JWT falta o és invàlid.
        JSON 403: user_id no coincideix amb el token.
        JSON 404: No hi ha subscripció activa.
    """
    try:
        usuari_autenticat_id = get_jwt_user_id()
    except ValueError as e:
        return jsonify({'error': str(e)}), 401

    user_id = request.args.get('user_id')
    if user_id and int(user_id) != usuari_autenticat_id:
        return jsonify({'error': 'Accés denegat'}), 403
    
    from models.stripe_model import get_active_subscription
    sub = get_active_subscription(usuari_autenticat_id)
    
    if not sub:
        return jsonify({'error': 'No s\'ha trobat cap subscripció activa'}), 404
    
    return jsonify({
        'subscription_id': sub['id'] if isinstance(sub, dict) else sub.id,
        'status': sub['status'] if isinstance(sub, dict) else sub.status,
        'current_period_end': sub['current_period_end'] if isinstance(sub, dict) else sub.current_period_end,
        'cancel_at_period_end': sub['cancel_at_period_end'] if isinstance(sub, dict) else sub.cancel_at_period_end,
        'plan_amount': (sub['plan'].amount if isinstance(sub, dict) else sub.plan.amount) / 100,
        'plan_interval': sub['plan'].interval if isinstance(sub, dict) else sub.plan.interval,
        'created': sub['created'] if isinstance(sub, dict) else (sub.start_date if hasattr(sub, 'start_date') and sub.start_date else sub.created)
    }), 200

def handle_sync_subscription():
    """
    POST /api/stripe/subscriptions/sync - Sincronitza la subscripció de Stripe amb la BD local.

    Cerca la subscripció activa del client a Stripe (provant estats 'active',
    'trialing', 'past_due', 'incomplete') i la persisteix a la BD si no existia.
    Útil després d'una migració o pujada manual de dades.

    Body JSON o Query params:
        user_id (int|None): Verificació addicional.

    Returns:
        JSON 200: Subscripció sincronitzada o ja existent.
        JSON 401: JWT falta o és invàlid.
        JSON 403: user_id no coincideix amb el token.
        JSON 404: No s'ha trobat cap subscripció a Stripe.
        JSON 500: Error intern o de l'API de Stripe.
    """
    import stripe
    try:
        usuari_autenticat_id = get_jwt_user_id()
    except ValueError as e:
        return jsonify({'error': str(e)}), 401

    data = request.get_json()
    user_id = data.get('user_id') if data else request.args.get('user_id')
    if user_id and int(user_id) != usuari_autenticat_id:
        return jsonify({'error': 'Accés denegat'}), 403

    stripe_id = get_user_stripe_id(usuari_autenticat_id)
    if not stripe_id:
        return jsonify({'error': 'L\'usuari no té compte de Stripe associat'}), 404

    try:
        # Buscar subscripcions actives a Stripe per al customer
        subscriptions = stripe.Subscription.list(
            customer=stripe_id,
            status='active',
            limit=1
        )

        if not subscriptions.data:
            # Provar amb 'trialing' i 'past_due' també
            for status in ['trialing', 'past_due', 'incomplete']:
                subs = stripe.Subscription.list(customer=stripe_id, status=status, limit=1)
                if subs.data:
                    subscriptions = subs
                    break

        if not subscriptions.data:
            return jsonify({'error': 'No s\'hi ha trobat cap subscripció activa a Stripe per a aquest client'}), 404

        sub = subscriptions.data[0]
        print(f"[Sync] Subscripció trobada a Stripe: id={sub.id}, status={sub.status}")

        # Comprovar si ja existeix a la BD
        from models.stripe_model import get_new_connection
        conn = get_new_connection()
        if conn:
            try:
                cursor = conn.cursor(dictionary=True)
                cursor.execute(
                    "SELECT id FROM subscripcions WHERE stripe_subscription_id = %s",
                    (sub.id,)
                )
                existing = cursor.fetchone()
                cursor.close()
            finally:
                conn.close()

            if existing:
                return jsonify({'message': 'La subscripció ja existia a la BD', 'subscription_id': sub.id}), 200

        # Persistir si no existia
        from models.stripe_model import _persist_subscription_to_db
        autorenovacio = not sub.cancel_at_period_end
        _persist_subscription_to_db(user_id, sub, autorenovacio)
        print(f"[Sync] Subscripció {sub.id} persistida per a l'usuari {user_id}")

        return jsonify({
            'message': 'Subscripció sincronitzada correctament',
            'subscription_id': sub.id,
            'status': sub.status
        }), 200

    except Exception as e:
        print(f"[Sync] Error en sincronitzar: {e}")
        return jsonify({'error': str(e)}), 500


def get_subscription_history():
    """
    GET /api/stripe/subscriptions/history - Historial de subscripcions i factures.

    Consulta la BD local (subscripcions + factures) i enriqueix amb URLs de
    rebut de Stripe (receipt_url del Charge del PaymentIntent de cada factura).

    Query params:
        cicle (str): 'mensual' | 'anual' | '' (tots, per defecte buit).
        estat (str): 'activa' | 'cancelada' | 'caducada' | '' (tots).
        limit (int): Registres per pàgina, entre 1 i 50 (per defecte 6).
        offset (int): Desplaçament per paginació (per defecte 0).

    Returns:
        JSON 200: tiquets (llista), resum (pla actual), paginacio (metadades).
        JSON 401: JWT falta o és invàlid.
        JSON 500: Error de connexió o intern del servidor.
    """
    try:
        usuari_autenticat_id = get_jwt_user_id()
    except ValueError as e:
        return jsonify({'error': str(e)}), 401

    # Paràmetres de filtre i paginació
    cicle  = request.args.get('cicle', '').strip().lower()
    estat  = request.args.get('estat', '').strip().lower()
    try:
        limit  = max(1, min(int(request.args.get('limit', 6)), 50))
        offset = max(0, int(request.args.get('offset', 0)))
    except (ValueError, TypeError):
        limit, offset = 6, 0

    from models.db_connection import get_new_connection
    from datetime import datetime

    conn = get_new_connection()
    if not conn:
        return jsonify({'error': 'Error de connexió a la BD'}), 500

    try:
        cursor = conn.cursor(dictionary=True)

        # ── Resum del pla actual ──────────────────────────────────────────
        cursor.execute(
            """
            SELECT s.tipus, s.data_inici, s.data_final, s.estat, s.preu,
                   s.auto_renovacio, s.metode_pagament
            FROM subscripcions s
            WHERE s.usuari_id = %s
            ORDER BY s.id DESC
            LIMIT 1
            """,
            (usuari_autenticat_id,)
        )
        sub_activa = cursor.fetchone()

        resum = {}
        if sub_activa:
            cicle_label = 'Anual' if sub_activa['tipus'] == 'anual' else 'Mensual'
            resum = {
                'pla_actual':     f"Premium {cicle_label}",
                'membre_des_de':  sub_activa['data_inici'].strftime('%d/%m/%Y') if sub_activa['data_inici'] else None,
                'renovacio':      sub_activa['data_final'].strftime('%d/%m/%Y') if sub_activa['data_final'] else None,
                'preu':           float(sub_activa['preu']) if sub_activa['preu'] else None,
                'metode_pagament': sub_activa['metode_pagament'] or 'targeta',
                'auto_renovacio': bool(sub_activa['auto_renovacio']),
            }

        # ── Construcció de la query paginada ─────────────────────────────
        base_where = "WHERE s.usuari_id = %s"
        params = [usuari_autenticat_id]

        if cicle in ('mensual', 'anual'):
            base_where += " AND s.tipus = %s"
            params.append(cicle)

        if estat in ('activa', 'cancelada', 'caducada', 'pendent'):
            base_where += " AND s.estat = %s"
            params.append(estat)

        # Comptar total
        cursor.execute(
            f"SELECT COUNT(*) AS total FROM subscripcions s {base_where}",
            params
        )
        total = cursor.fetchone()['total']

        query = f"""
            SELECT
                s.id,
                s.tipus,
                s.estat,
                s.data_inici,
                s.data_final,
                s.preu,
                s.auto_renovacio,
                s.stripe_subscription_id,
                f.numero_factura,
                f.import_total
            FROM subscripcions s
            LEFT JOIN factures f ON f.pagament_id = (
                SELECT p.id FROM pagaments p
                WHERE p.usuari_id = s.usuari_id
                  AND p.referencia_externa = s.stripe_subscription_id
                LIMIT 1
            )
            {base_where}
            ORDER BY s.id DESC
            LIMIT %s OFFSET %s
        """
        params_page = params + [limit, offset]
        cursor.execute(query, params_page)
        rows = cursor.fetchall()
        cursor.close()

        # ── Obtenir Receipts des de Stripe (crida única per tot el client) ─
        # El Receipt (rebut) de Stripe és el receipt_url del Charge associat
        # al PaymentIntent de cada factura.
        # Ruta: Invoice → payment_intent → latest_charge → receipt_url
        stripe_invoice_map = {}
        try:
            import stripe as stripe_lib
            stripe_customer_id = get_user_stripe_id(usuari_autenticat_id)
            if stripe_customer_id:
                invoices = stripe_lib.Invoice.list(
                    customer=stripe_customer_id,
                    limit=50,
                    expand=['data.payment_intent.latest_charge']  # Expandim fins al Charge
                )
                for inv in invoices.data:
                    # Obtenir l'ID de subscripció (pot ser string o objecte)
                    sub_id = inv.subscription if isinstance(inv.subscription, str) else (
                        inv.subscription.id if inv.subscription else None
                    )
                    if not sub_id:
                        continue

                    # Obtenir receipt_url del Charge
                    receipt_url = None
                    try:
                        pi = getattr(inv, 'payment_intent', None)
                        if pi:
                            charge = getattr(pi, 'latest_charge', None)
                            if charge:
                                receipt_url = getattr(charge, 'receipt_url', None)
                    except Exception:
                        pass

                    stripe_invoice_map[sub_id] = {
                        'pdf_url':             receipt_url,            # URL del Receipt (rebut)
                        'stripe_invoice_url':  inv.hosted_invoice_url, # Pàgina de factura Stripe
                    }
        except Exception as stripe_err:
            print(f"[SubscriptionHistory] Advertència: no s'han pogut obtenir rebuts de Stripe: {stripe_err}")
            # No trenquem la resposta: continuem sense URLs de receipt

        # ── Serialització ─────────────────────────────────────────────────
        tiquets = []
        for r in rows:
            any_inici = r['data_inici'].year if r['data_inici'] else datetime.now().year
            referencia = f"#SUB-{any_inici}-{r['id']:04d}"

            import_val = float(r['import_total']) if r['import_total'] else \
                         (float(r['preu']) if r['preu'] else 0.0)

            # Cercar URL de PDF a Stripe pel stripe_subscription_id d'aquesta fila
            invoice_info = stripe_invoice_map.get(r['stripe_subscription_id'], {})

            tiquets.append({
                'id':                  r['id'],
                'referencia':          referencia,
                'data_inici':          r['data_inici'].strftime('%d/%m/%Y %H:%M') if r['data_inici'] else None,
                'data_final':          r['data_final'].strftime('%d/%m/%Y') if r['data_final'] else None,
                'cicle':               r['tipus'],
                'estat':               r['estat'],
                'import':              import_val,
                'numero_factura':      r['numero_factura'],
                'auto_renovacio':      bool(r['auto_renovacio']),
                'pdf_url':             invoice_info.get('pdf_url'),           # URL directa al PDF
                'stripe_invoice_url':  invoice_info.get('stripe_invoice_url'), # Pàgina de Stripe
            })

        total_pagines = max(1, -(-total // limit))  # ceil division
        pagina_actual = (offset // limit) + 1

        return jsonify({
            'tiquets':   tiquets,
            'resum':     resum,
            'paginacio': {
                'total':         total,
                'pagina_actual': pagina_actual,
                'total_pagines': total_pagines,
                'limit':         limit,
                'offset':        offset,
            }
        }), 200

    except Exception as e:
        print(f"[SubscriptionHistory] Error: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
