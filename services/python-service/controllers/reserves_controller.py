from flask import jsonify, request
from models.reserves_model import (
    get_reserves_usuari,
    get_totes_reserves,
    get_reserves_per_estat,
    obte_detall_reserva,
    crear_reserva
)


def reserves_usuari_historial():
    """
    Controlador per obtenir l'historial de reserves d'un usuari
    Requereix l'usuari_id en la sessió o headers d'autenticació
    """
    try:
        # Obtenir usuari_id de la request (dels query params o headers)
        usuari_id = request.args.get(
            'usuari_id') or request.headers.get('X-User-ID')

        if not usuari_id:
            return jsonify({"error": "Falta l'usuari_id"}), 400

        try:
            usuari_id = int(usuari_id)
        except (ValueError, TypeError):
            return jsonify({"error": "usuari_id ha de ser un nombre"}), 400

        # Construir filtres des dels query params
        filters = {}

        # Filtre per estat
        if request.args.get('estat'):
            filters['estat'] = request.args.get('estat')

        # Filtres per dates
        if request.args.get('data_desde'):
            filters['data_desde'] = request.args.get('data_desde')

        if request.args.get('data_fins'):
            filters['data_fins'] = request.args.get('data_fins')

        # Filtre per aparcament
        if request.args.get('aparcament_id'):
            try:
                filters['aparcament_id'] = int(
                    request.args.get('aparcament_id'))
            except (ValueError, TypeError):
                return jsonify({"error": "aparcament_id ha de ser un nombre"}), 400

        # Paginació
        if request.args.get('limit'):
            try:
                filters['limit'] = int(request.args.get('limit'))
            except (ValueError, TypeError):
                return jsonify({"error": "limit ha de ser un nombre"}), 400

        if request.args.get('offset'):
            try:
                filters['offset'] = int(request.args.get('offset'))
            except (ValueError, TypeError):
                return jsonify({"error": "offset ha de ser un nombre"}), 400

        # Obtenir reserves
        result = get_reserves_usuari(usuari_id, filters)
        return jsonify(result), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def totes_reserves():
    """
    Controlador per llistar totes les reserves (admin)
    Aplicar filtres opcionals
    """
    try:
        # Aquí es podria verificar si l'usuari té permisos d'admin

        filters = {}

        if request.args.get('usuari_id'):
            try:
                filters['usuari_id'] = int(request.args.get('usuari_id'))
            except (ValueError, TypeError):
                return jsonify({"error": "usuari_id ha de ser un nombre"}), 400

        if request.args.get('aparcament_id'):
            try:
                filters['aparcament_id'] = int(
                    request.args.get('aparcament_id'))
            except (ValueError, TypeError):
                return jsonify({"error": "aparcament_id ha de ser un nombre"}), 400

        if request.args.get('estat'):
            filters['estat'] = request.args.get('estat')

        if request.args.get('data_desde'):
            filters['data_desde'] = request.args.get('data_desde')

        if request.args.get('data_fins'):
            filters['data_fins'] = request.args.get('data_fins')

        if request.args.get('limit'):
            try:
                filters['limit'] = int(request.args.get('limit'))
            except (ValueError, TypeError):
                return jsonify({"error": "limit ha de ser un nombre"}), 400

        if request.args.get('offset'):
            try:
                filters['offset'] = int(request.args.get('offset'))
            except (ValueError, TypeError):
                return jsonify({"error": "offset ha de ser un nombre"}), 400

        result = get_totes_reserves(filters)
        return jsonify(result), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def reserva_perEstat():
    """
    Controlador per obtenir reserves filtrades per estat
    Path param: estat (pendent, confirmada, en_curs, completada, cancel·lada)
    """
    try:
        estat = request.args.get('estat')

        if not estat:
            return jsonify({"error": "Falta el paràmetre estat"}), 400

        filters = {}

        if request.args.get('limit'):
            try:
                filters['limit'] = int(request.args.get('limit'))
            except (ValueError, TypeError):
                return jsonify({"error": "limit ha de ser un nombre"}), 400

        if request.args.get('offset'):
            try:
                filters['offset'] = int(request.args.get('offset'))
            except (ValueError, TypeError):
                return jsonify({"error": "offset ha de ser un nombre"}), 400

        result = get_reserves_per_estat(estat, filters)
        return jsonify(result), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def detall_reserva(reserva_id):
    """Controlador per obtenir el detall d'una reserva específica"""
    try:
        try:
            reserva_id = int(reserva_id)
        except (ValueError, TypeError):
            return jsonify({"error": "ID de reserva invàlid"}), 400

        reserva = obte_detall_reserva(reserva_id)

        if reserva is None:
            return jsonify({"error": "Reserva no trobada"}), 404

        return jsonify(reserva), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def crear_nova_reserva():
    """
    Controlador per crear una nova reserva

    Espera un JSON amb:
    {
        "usuari_id": 1,
        "aparcament_id": 5,
        "data_entrada": "2026-03-15 10:00:00",
        "data_sortida": "2026-03-15 18:00:00",
        "preu_total": 24.50,
        "descompte_aplicat": 0.00,  # Opcional
        "notes": "Arribada aproximada a les 10h"  # Opcional
    }
    """
    try:
        # Validar que el request té dades JSON
        if not request.is_json:
            return jsonify({"error": "El contingut ha de ser JSON"}), 400

        data = request.get_json()

        # Validar camps obligatoris
        required_fields = ['usuari_id', 'aparcament_id', 'data_entrada', 'data_sortida', 'preu_total']
        missing_fields = [field for field in required_fields if field not in data]

        if missing_fields:
            return jsonify({
                "error": f"Falten els següents camps obligatoris: {', '.join(missing_fields)}"
            }), 400

        # Validar tipus de dades
        try:
            data['usuari_id'] = int(data['usuari_id'])
            data['aparcament_id'] = int(data['aparcament_id'])
            data['preu_total'] = float(data['preu_total'])

            if 'descompte_aplicat' in data:
                data['descompte_aplicat'] = float(data['descompte_aplicat'])
        except (ValueError, TypeError):
            return jsonify({"error": "Els camps numèrics tenen tipus invàlids"}), 400

        # Crear la reserva
        nova_reserva = crear_reserva(data)

        return jsonify({
            "message": "Reserva creada amb èxit",
            "reserva": nova_reserva
        }), 201

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Error en crear la reserva: {str(e)}"}), 500
