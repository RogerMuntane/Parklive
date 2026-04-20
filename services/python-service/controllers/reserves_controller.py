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
from models.stripe_model import get_user_stripe_id, createPaymentIntent, registrar_pagament_db, cancel_payment_intent
from datetime import datetime, timedelta
from utils.pdf_generator import generar_tiquet_pdf_python

def reserves_usuari_historial():
    """
    Controlador per obtenir l'historial de reserves d'un usuari
    """
    try:
        usuari_id = request.args.get('user_id')
        estat = request.args.get('estat') # Opcional: pendent, confirmada, etc.
        limit = request.args.get('limit', 20)
        offset = request.args.get('offset', 0)
        search = request.args.get('search')

        if not usuari_id:
            return jsonify({"error": "Falta el paràmetre 'user_id'"}), 400

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
    Controlador per llistar totes les reserves (Admin)
    """
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
    Controlador per obtenir el detall d'una reserva específica
    """
    try:
        reserva = obte_detall_reserva(reserva_id)
        if not reserva:
            return jsonify({"error": "Reserva no trobada"}), 404
            
        return jsonify(reserva), 200

    except Exception as e:
        return jsonify({"error": f"Error en obtenir detall reserva: {str(e)}"}), 500

def crear_nova_reserva():
    """
    Controlador per crear una nova reserva
    """
    try:
        if not request.is_json:
            return jsonify({"error": "El contingut ha de ser JSON"}), 400

        data = request.get_json()

        required_fields = ['usuari_id', 'aparcament_id', 'data_entrada', 'data_sortida', 'preu_total']
        missing_fields = [field for field in required_fields if field not in data]

        if missing_fields:
            return jsonify({
                "error": f"Falten els següents camps obligatoris: {', '.join(missing_fields)}"
            }), 400

        try:
            data['usuari_id'] = int(data['usuari_id'])
            data['aparcament_id'] = int(data['aparcament_id'])
            data['preu_total'] = float(data['preu_total'])

            if 'descompte_aplicat' in data:
                data['descompte_aplicat'] = float(data['descompte_aplicat'])
        except (ValueError, TypeError):
            return jsonify({"error": "Els camps numèrics tenen tipus invàlids"}), 400

        payment_method_id = data.get('payment_method_id')
        if not payment_method_id:
            return jsonify({"error": "Falta el paràmetre 'payment_method_id' per processar el pagament."}), 400

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
                actualitzar_estat_reserva(reserva_id, 'cancel·lada')
                return jsonify({"error": "L'usuari no té un compte de pagament vinculat."}), 400

            import_en_centims = int(data['preu_total'] * 100)
            payment_intent = createPaymentIntent(
                amount=import_en_centims,
                currency='eur',
                customer_id=stripe_customer_id,
                payment_method_id=payment_method_id
            )

            if not payment_intent or payment_intent.status not in ['succeeded', 'requires_capture']:
                actualitzar_estat_reserva(reserva_id, 'cancel·lada')
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
                    actualitzar_tiquet_reserva(reserva_id, pdf_path)
                    reserva_confirmada = obte_detall_reserva(reserva_id) # Refrescar db state
            except Exception as e_pdf:
                print(f"[PDF] Error autogenerant tiquet python per la reserva {reserva_id}: {e_pdf}")

            return jsonify({
                "message": "Reserva confirmada i pagament realitzat amb èxit",
                "reserva": reserva_confirmada
            }), 201

        except Exception as e:
            actualitzar_estat_reserva(reserva_id, 'cancel·lada')
            return jsonify({"error": f"Error processant el pagament: {str(e)}"}), 400

    except Exception as e:
        return jsonify({"error": f"Error crític en el controlador de reserves: {str(e)}"}), 500

def get_tiquet_pdf(reserva_id):
    """
    Endpoint per descarregar el tiquet PDF d'una reserva
    """
    try:
        reserva = obte_detall_reserva(reserva_id)
        if not reserva or not reserva.get('tiquet_path'):
            return jsonify({"error": "Tiquet no trobat per aquesta reserva."}), 404
        
        pdf_path = reserva['tiquet_path']
        
        if not os.path.exists(pdf_path):
            return jsonify({"error": "El fitxer físic del tiquet no existeix al servidor."}), 404
            
        return send_file(
            pdf_path,
            as_attachment=True,
            download_name=f"tiquet_ParkLive_{reserva['codi_reserva']}.pdf",
            mimetype='application/pdf'
        )
    except Exception as e:
        return jsonify({"error": f"Error en descarregar el tiquet: {str(e)}"}), 500

def cancelar_reserva_usuari(reserva_id):
    """
    Controlador per cancel·lar una reserva de l'usuari.
    Només permet cancel·lar si falta més de 60 minuts per l'entrada.
    """
    try:
        reserva = obte_detall_reserva(reserva_id)
        if not reserva:
            return jsonify({"error": "Reserva no trobada"}), 404

        if reserva['estat'] == 'cancel·lada':
            return jsonify({"error": "Aquesta reserva ja està cancel·lada"}), 400
        
        if reserva['estat'] not in ['confirmada', 'pendent']:
            return jsonify({"error": f"No es pot cancel·lar una reserva en estat {reserva['estat']}"}), 400

        # Política de 1 hora (60 minuts)
        ara = datetime.now()
        # La data_entrada ve serialitzada o com a objecte? 
        # En obte_detall_reserva es crida a serialize_value(row['data_entrada']).
        # Si és string (ISO), l'hem de parsejar.
        data_entrada_str = reserva['data_entrada']
        try:
            # ISO format: 2026-04-15T10:00:00
            data_entrada = datetime.fromisoformat(data_entrada_str)
        except Exception:
            # Fallback per si no és ISO
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
        
        # 2. Actualitzar estat reserva a 'cancel·lada'
        success = actualitzar_estat_reserva(reserva_id, 'cancel·lada')
        if not success:
            return jsonify({"error": "No s'ha pogut actualitzar l'estat de la reserva a la base de dades."}), 500

        # 3. Opcional: Podríem actualitzar l'estat del pagament a la BD si fos necessari
        # Per ara, actualitzar_estat_reserva ja hauria d'encarregar-se de la lògica de negoci

        return jsonify({"message": "Reserva cancel·lada correctament i fons alliberats."}), 200

    except Exception as e:
        print(f"[ERROR] Cancel·lant reserva {reserva_id}: {str(e)}")
        return jsonify({"error": f"Error crític cancel·lant la reserva: {str(e)}"}), 500

def pujar_tiquet_pdf(reserva_id):
    """
    Rep un tiquet PDF generat pel frontend i el guarda al servidor i a la BDD.
    L'operació és idempotent: si ja existia un tiquet per la mateixa reserva,
    el sobreescriu sense retornar un error.
    """
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
        file.seek(0)  # Rebobinar per poder guardar el fitxer sencer

        # Obtenir dades de la reserva per al nom del fitxer
        reserva = obte_detall_reserva(reserva_id)
        if not reserva:
            return jsonify({"error": "Reserva no trobada"}), 404

        # Definir ruta de guardat
        storage_path = "/app/storage/tickets"
        os.makedirs(storage_path, exist_ok=True)

        filename = f"tiquet_{reserva['codi_reserva']}.pdf"
        filepath = os.path.join(storage_path, filename)

        # Guardar fitxer físic (sobreescriu si ja existia: comportament idempotent)
        file.save(filepath)

        # Actualitzar BDD amb la ruta del fitxer
        success = actualitzar_tiquet_reserva(reserva_id, filepath)
        if not success:
            return jsonify({"error": "Error actualitzant la ruta a la base de dades"}), 500

        print(f"[INFO] Tiquet PDF desat correctament: {filepath}")
        return jsonify({
            "message": "Tiquet PDF sincronitzat amb èxit",
            "path": filepath
        }), 200

    except Exception as e:
        print(f"[ERROR] Pujant tiquet PDF {reserva_id}: {str(e)}")
        return jsonify({"error": f"Error processant la pujada del tiquet: {str(e)}"}), 500
