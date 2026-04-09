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
from models.stripe_model import get_user_stripe_id, createPaymentIntent, registrar_pagament_db
from utils.pdf_generator import generar_tiquet_pdf

def reserves_usuari_historial():
    """
    Controlador per obtenir l'historial de reserves d'un usuari
    """
    try:
        usuari_id = request.args.get('user_id')
        estat = request.args.get('estat') # Opcional: pendent, confirmada, etc.
        limit = request.args.get('limit', 20)
        offset = request.args.get('offset', 0)

        if not usuari_id:
            return jsonify({"error": "Falta el paràmetre 'user_id'"}), 400

        reserves = get_reserves_usuari(usuari_id, estat, int(limit), int(offset))
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

            if not payment_intent or payment_intent.status != 'succeeded':
                actualitzar_estat_reserva(reserva_id, 'cancel·lada')
                return jsonify({"error": "La targeta ha estat denegada pel banc."}), 400

            registrar_pagament_db(
                reserva_id=reserva_id,
                usuari_id=data['usuari_id'],
                import_pagament=data['preu_total'],
                metode='targeta_credit',
                referencia_externa=payment_intent.id,
                estat='completat'
            )

            actualitzar_estat_reserva(reserva_id, 'confirmada')
            
            try:
                reserva_per_pdf = obte_detall_reserva(reserva_id)
                pdf_path = generar_tiquet_pdf(reserva_per_pdf)
                actualitzar_tiquet_reserva(reserva_id, pdf_path)
            except Exception as pdf_error:
                print(f"[!] Error generant el PDF automàtic: {str(pdf_error)}")
            
            reserva_confirmada = obte_detall_reserva(reserva_id)

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
