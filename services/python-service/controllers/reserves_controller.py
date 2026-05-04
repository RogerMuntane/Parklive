from flask import jsonify, request, send_file
import os
from models.reserves_model import (
    get_reserves_usuari,
    get_totes_reserves,
    get_reserves_per_estat,
    obte_detall_reserva,
    crear_reserva,
    actualitzar_estat_reserva,
    actualitzar_tiquet_reserva
)
from models.aparcament_model import get_places_disponibles_per_franja
from models.stripe_model import get_user_stripe_id, createPaymentIntent, registrar_pagament_db, cancel_payment_intent
from datetime import datetime, timedelta
from utils.pdf_generator import generar_tiquet_pdf_python

from middleware.jwt_auth import get_jwt_user_id, get_jwt_full_data

def reserves_usuari_historial():
    """
    Controlador per obtenir l'historial de reserves d'un usuari
    """
    try:
        # Validar JWT i obtenir l'ID de l'usuari autenticat
        try:
            usuari_autenticat_id = get_jwt_user_id()
        except ValueError as e:
            return jsonify({"error": str(e)}), 401

        usuari_id = request.args.get('user_id')
        
        # Si s'ha passat un user_id, verifiquem que coincideixi amb el del token
        if usuari_id and int(usuari_id) != usuari_autenticat_id:
            return jsonify({"error": "No tens permís per veure aquest historial"}), 403
            
        # Utilitzem l'ID del token per seguretat
        usuari_id = usuari_autenticat_id

        estat = request.args.get('estat')
        limit = request.args.get('limit', 50)
        offset = request.args.get('offset', 0)
        search = request.args.get('search')

        filters = {
            'estat': estat,
            'limit': int(limit),
            'offset': int(offset),
            'search': search
        }
        reserves = get_reserves_usuari(usuari_id, filters)
        return jsonify(reserves), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Error en obtenir reserves: {str(e)}"}), 500

def llistar_reserves():
    """
    Controlador per llistar totes les reserves (Admin).
    Requereix autenticació JWT i rol d'administrador.
    """
    try:
        get_jwt_user_id()
    except ValueError as e:
        return jsonify({"error": str(e)}), 401

    # Verificar rol admin
    try:
        user_data = get_jwt_full_data()
        rol = user_data.get('tipus_usuari', '').lower()
        if rol not in ['administrador', 'admin']:
            return jsonify({"error": "Accés denegat: es requereix rol administrador"}), 403
    except (ValueError, RuntimeError) as e:
        return jsonify({"error": str(e)}), 401

    try:
        estat = request.args.get('estat')
        limit = request.args.get('limit', 50)
        offset = request.args.get('offset', 0)

        if estat:
            reserves = get_reserves_per_estat(estat, int(limit), int(offset))
        else:
            reserves = get_totes_reserves(int(limit), int(offset))

        return jsonify(reserves), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Error en llistar reserves: {str(e)}"}), 500

def detall_reserva(reserva_id):
    """
    Controlador per obtenir el detall d'una reserva específica.
    Requereix JWT. L'usuari només pot veure les seves reserves; admin pot veure qualsevol.
    """
    try:
        usuari_autenticat_id = get_jwt_user_id()
    except ValueError as e:
        return jsonify({"error": str(e)}), 401

    try:
        reserva = obte_detall_reserva(reserva_id)
        if not reserva:
            return jsonify({"error": "Reserva no trobada"}), 404

        # Verificar propietat o rol admin
        user_data = get_jwt_full_data()
        rol = user_data.get('tipus_usuari', '').lower()
        reserva_user_id = reserva.get('usuari', {}).get('id')
        if rol not in ['administrador', 'admin'] and reserva_user_id != usuari_autenticat_id:
            return jsonify({"error": "No tens permís per veure aquesta reserva"}), 403

        return jsonify(reserva), 200

    except (ValueError, RuntimeError) as e:
        return jsonify({"error": str(e)}), 401
    except Exception as e:
        return jsonify({"error": f"Error en obtenir detall reserva: {str(e)}"}), 500

def crear_nova_reserva():
    """
    Controlador per crear una nova reserva
    """
    # Validar JWT
    try:
        usuari_autenticat_id = get_jwt_user_id()
    except ValueError as e:
        return jsonify({"error": str(e)}), 401

    data = request.get_json()

    # Forçar l'ID de l'usuari autenticat al payload per seguretat
    data['usuari_id'] = usuari_autenticat_id

    required_fields = ['aparcament_id', 'data_entrada', 'data_sortida', 'preu_total']
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return jsonify({
            "error": f"Falten els següents camps obligatoris: {', '.join(missing_fields)}"
        }), 400

    try:
        data['aparcament_id'] = int(data['aparcament_id'])
        data['preu_total'] = float(data['preu_total'])

        if 'descompte_aplicat' in data:
            data['descompte_aplicat'] = float(data['descompte_aplicat'])
    except (ValueError, TypeError):
        return jsonify({"error": "Els camps numèrics tenen tipus invàlids"}), 400

    payment_method_id = data.get('payment_method_id')
    if not payment_method_id:
        return jsonify({"error": "Falta el paràmetre 'payment_method_id' per processar el pagament."}), 400

    # ── Prevalidació de disponibilitat per franja ─────────────────────────
    # Validem contra les reserves que solapen la franja sol·licitada,
    # NO contra el camp estàtic places_disponibles (que reflecteix el moment actual).
    FORMATS_DATA = ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M']

    def parse_dt_flexible(s):
        for fmt in FORMATS_DATA:
            try:
                return datetime.strptime(s, fmt)
            except ValueError:
                continue
        raise ValueError(f"Format de data no reconegut: {s}")

    try:
        dt_entrada = parse_dt_flexible(data['data_entrada'])
        dt_sortida = parse_dt_flexible(data['data_sortida'])
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    disponibilitat = get_places_disponibles_per_franja(
        data['aparcament_id'], dt_entrada, dt_sortida
    )

    if disponibilitat is None:
        return jsonify({"error": "L'aparcament especificat no existeix."}), 404

    if disponibilitat['places_lliures'] <= 0:
        return jsonify({
            "error": f"L'aparcament no té places disponibles per la franja "
                     f"{data['data_entrada']} – {data['data_sortida']}. "
                     f"Places lliures: {disponibilitat['places_lliures']} / "
                     f"{disponibilitat['capacitat_total']}."
        }), 409

    try:
        nova_reserva = crear_reserva(data)
        if not nova_reserva or 'id' not in nova_reserva:
            return jsonify({"error": "No s'ha pogut crear el registre de reserva."}), 500
        
        reserva_id = nova_reserva['id']
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Error al reservar la plaça: {str(e)}"}), 500

    try:
        stripe_customer_id = get_user_stripe_id(data['usuari_id'])
        if not stripe_customer_id:
            actualitzar_estat_reserva(reserva_id, 'cancelada')
            return jsonify({"error": "L'usuari no té un compte de pagament vinculat."}), 400

        import_en_centims = int(data['preu_total'] * 100)
        payment_intent = createPaymentIntent(
            amount=import_en_centims,
            currency='eur',
            customer_id=stripe_customer_id,
            payment_method_id=payment_method_id
        )

        if not payment_intent or payment_intent.status not in ['succeeded', 'requires_capture']:
            actualitzar_estat_reserva(reserva_id, 'cancelada')
            return jsonify({"error": "La targeta ha estat denegada pel banc o l'autorització ha fallat."}), 400

        registrar_pagament_db(
            reserva_id=reserva_id,
            usuari_id=data['usuari_id'],
            import_pagament=data['preu_total'],
            metode='targeta_credit',
            referencia_externa=payment_intent.id,
            estat='autoritzat'
        )

        actualitzar_estat_reserva(reserva_id, 'confirmada')
        
        reserva_confirmada = obte_detall_reserva(reserva_id)

        # Generació automàtica del PDF Backend
        try:
            if reserva_confirmada:
                pdf_path = generar_tiquet_pdf_python(reserva_confirmada)
                # Només guardem el nom del fitxer a la BDD, no la ruta absoluta
                filename = os.path.basename(pdf_path)
                actualitzar_tiquet_reserva(reserva_id, filename)
                reserva_confirmada = obte_detall_reserva(reserva_id) # Refrescar db state
        except Exception as e_pdf:
            print(f"[PDF] Error autogenerant tiquet python per la reserva {reserva_id}: {e_pdf}")

        return jsonify({
            "message": "Reserva confirmada i pagament realitzat amb èxit",
            "reserva": reserva_confirmada
        }), 201

    except Exception as e:
        actualitzar_estat_reserva(reserva_id, 'cancelada')
        return jsonify({"error": f"Error processant el pagament: {str(e)}"}), 400

def get_tiquet_pdf(reserva_id):
    """
    Endpoint per descarregar el tiquet PDF d'una reserva.
    Requereix JWT. Només el propietari o un admin pot descarregar el tiquet.
    """
    try:
        usuari_autenticat_id = get_jwt_user_id()
    except ValueError as e:
        return jsonify({"error": str(e)}), 401

    try:
        reserva = obte_detall_reserva(reserva_id)
        if not reserva:
            return jsonify({"error": "Reserva no trobada"}), 404

        # Verificar propietat o rol admin
        user_data = get_jwt_full_data()
        rol = user_data.get('tipus_usuari', '').lower()
        reserva_user_id = reserva.get('usuari', {}).get('id')
        if rol not in ['administrador', 'admin'] and reserva_user_id != usuari_autenticat_id:
            return jsonify({"error": "No tens permís per descarregar aquest tiquet"}), 403

        # Reconstruïm la ruta usant l'entorn i el nom del fitxer
        db_path = reserva.get('tiquet_path')
        storage_path = os.getenv("TICKET_STORAGE_PATH", "/app/storage/tickets")
        
        pdf_path = None
        if db_path:
            filename = os.path.basename(db_path)
            pdf_path = os.path.join(storage_path, filename)

        # Si no hi ha ruta a la BDD o el fitxer no existeix, el generem ara mateix
        if not pdf_path or not os.path.exists(pdf_path):
            print(f"[PDF] Tiquet no trobat per la reserva {reserva_id}. Generant on-demand...")
            try:
                generated_path = generar_tiquet_pdf_python(reserva)
                filename = os.path.basename(generated_path)
                actualitzar_tiquet_reserva(reserva_id, filename)
                pdf_path = generated_path
            except Exception as e_gen:
                return jsonify({"error": f"No s'ha pogut generar el tiquet: {str(e_gen)}"}), 500

        return send_file(
            pdf_path,
            as_attachment=True,
            download_name=f"tiquet_ParkLive_{reserva['codi_reserva']}.pdf",
            mimetype='application/pdf'
        )
    except (ValueError, RuntimeError) as e:
        return jsonify({"error": str(e)}), 401
    except Exception as e:
        return jsonify({"error": f"Error en descarregar el tiquet: {str(e)}"}), 500

def cancelar_reserva_usuari(reserva_id):
    """
    Controlador per cancel·lar una reserva de l'usuari.
    Només permet cancel·lar si falta més de 60 minuts per l'entrada.
    Requereix JWT i que l'usuari sigui el propietari de la reserva.
    """
    try:
        usuari_autenticat_id = get_jwt_user_id()
    except ValueError as e:
        return jsonify({"error": str(e)}), 401

    try:
        reserva = obte_detall_reserva(reserva_id)
        if not reserva:
            return jsonify({"error": "Reserva no trobada"}), 404

        # Verificar que l'usuari és el propietari
        reserva_user_id = reserva.get('usuari', {}).get('id')
        if reserva_user_id != usuari_autenticat_id:
            return jsonify({"error": "No tens permís per cancel·lar aquesta reserva"}), 403

        if reserva['estat'] == 'cancelada':
            return jsonify({"error": "Aquesta reserva ja està cancelada"}), 400

        if reserva['estat'] not in ['confirmada', 'pendent']:
            return jsonify({"error": f"No es pot cancel·lar una reserva en estat {reserva['estat']}"}), 400

        # Política de 1 hora (60 minuts)
        ara = datetime.now()
        data_entrada_str = reserva['data_entrada']
        try:
            data_entrada = datetime.fromisoformat(data_entrada_str)
        except Exception:
            return jsonify({"error": "Error en el format de la data de la reserva"}), 500

        if ara > (data_entrada - timedelta(hours=1)):
            return jsonify({
                "error": "Política de cancel·lació: No es pot cancel·lar falten menys de 60 minuts per l'entrada."
            }), 400

        # 1. Cancel·lar a Stripe si existeix un payment_intent
        pagament = reserva.get('pagament')
        if pagament and pagament.get('referencia_externa'):
            pi_id = pagament['referencia_externa']
            stripe_res = cancel_payment_intent(pi_id)
            if not stripe_res:
                return jsonify({"error": "No s'ha pogut cancel·lar la retenció de fons a Stripe."}), 500

        # 2. Actualitzar estat reserva a 'cancelada'
        success = actualitzar_estat_reserva(reserva_id, 'cancelada')
        if not success:
            return jsonify({"error": "No s'ha pogut actualitzar l'estat de la reserva a la base de dades."}), 500

        return jsonify({"message": "Reserva cancelada correctament i fons alliberats."}), 200

    except Exception as e:
        print(f"[ERROR] Cancel·lant reserva {reserva_id}: {str(e)}")
        return jsonify({"error": f"Error crític cancel·lant la reserva: {str(e)}"}), 500

def pujar_tiquet_pdf(reserva_id):
    """
    Rep un tiquet PDF generat pel frontend i el guarda al servidor i a la BDD.
    L'operació és idempotent: si ja existia un tiquet per la mateixa reserva,
    el sobreescriu sense retornar un error.
    Requereix JWT. Només el propietari o un admin pot pujar el tiquet.
    """
    try:
        usuari_autenticat_id = get_jwt_user_id()
    except ValueError as e:
        return jsonify({"error": str(e)}), 401

    try:
        if 'tiquet' not in request.files:
            return jsonify({"error": "No s'ha enviat cap fitxer (clau 'tiquet')"}), 400

        file = request.files['tiquet']
        if file.filename == '':
            return jsonify({"error": "El fitxer no té nom"}), 400

        if not file.filename.lower().endswith('.pdf'):
            return jsonify({"error": "Només s'accepten fitxers PDF"}), 400

        # Validar magic bytes del PDF (%PDF) per seguretat
        header = file.read(4)
        if header != b'%PDF':
            return jsonify({"error": "El fitxer enviat no és un PDF vàlid"}), 400
        file.seek(0)

        # Obtenir dades de la reserva i verificar propietat
        reserva = obte_detall_reserva(reserva_id)
        if not reserva:
            return jsonify({"error": "Reserva no trobada"}), 404

        user_data = get_jwt_full_data()
        rol = user_data.get('tipus_usuari', '').lower()
        reserva_user_id = reserva.get('usuari', {}).get('id')
        if rol not in ['administrador', 'admin'] and reserva_user_id != usuari_autenticat_id:
            return jsonify({"error": "No tens permís per pujar el tiquet d'aquesta reserva"}), 403

        storage_path = os.getenv("TICKET_STORAGE_PATH", "/app/storage/tickets")
        os.makedirs(storage_path, exist_ok=True)

        filename = f"tiquet_{reserva['codi_reserva']}.pdf"
        filepath = os.path.join(storage_path, filename)

        file.save(filepath)

        # A la BDD hi guardem només el nom del fitxer
        success = actualitzar_tiquet_reserva(reserva_id, filename)
        if not success:
            return jsonify({"error": "Error actualitzant la ruta a la base de dades"}), 500

        print(f"[INFO] Tiquet PDF desat correctament: {filepath}")
        return jsonify({
            "message": "Tiquet PDF sincronitzat amb èxit",
            "path": filepath
        }), 200

    except (ValueError, RuntimeError) as e:
        return jsonify({"error": str(e)}), 401
    except Exception as e:
        print(f"[ERROR] Pujant tiquet PDF {reserva_id}: {str(e)}")
        return jsonify({"error": f"Error processant la pujada del tiquet: {str(e)}"}), 500
