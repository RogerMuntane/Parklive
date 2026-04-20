from flask import jsonify, request
from models.aparcament_model import (
    get_all_aparcaments,
    get_aparcament_by_id,
    get_aparcaments_by_filters,
    add_user_favorite_parking,
    remove_user_favorite_parking,
    get_user_favorite_parkings,
)


def _get_authenticated_user_id(fallback_value=None):
    """Obté l'usuari autenticat des de capçalera i, si cal, valor fallback."""
    user_id_value = request.headers.get('X-User-ID') or fallback_value
    if user_id_value is None:
        raise ValueError("Cal iniciar sessió")

    try:
        user_id = int(user_id_value)
    except (TypeError, ValueError):
        raise ValueError("ID d'usuari no vàlid")

    if user_id <= 0:
        raise ValueError("ID d'usuari no vàlid")

    return user_id


def list_aparcaments():
    """Controlador per llistar tots els aparcaments"""
    try:
        aparcaments = get_all_aparcaments()
        return jsonify(aparcaments), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def get_aparcament_detail(aparcament_id):
    """Controlador per obtenir detall d'un aparcament específic"""
    try:
        # Validar que l'ID sigui un número vàlid
        try:
            aparcament_id = int(aparcament_id)
        except (ValueError, TypeError):
            return jsonify({"error": "ID d'aparcament no vàlid"}), 400

        # Obtenir l'aparcament
        aparcament = get_aparcament_by_id(aparcament_id)

        # Si no existeix, retornar 404
        if aparcament is None:
            return jsonify({"error": "Aparcament no trobat"}), 404

        # Retornar l'aparcament
        return jsonify(aparcament), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def search_aparcaments():
    """Controlador per cercar aparcaments amb filtres"""
    try:
        # Obtenir els filtres dels query params
        filters = {}

        # Filtres de text
        if request.args.get('ciutat'):
            filters['ciutat'] = request.args.get('ciutat')

        if request.args.get('tipus'):
            filters['tipus'] = request.args.get('tipus')

        if request.args.get('estat'):
            filters['estat'] = request.args.get('estat')

        # Filtres numèrics de tarifes
        if request.args.get('tarifa_hora_min'):
            filters['tarifa_hora_min'] = float(
                request.args.get('tarifa_hora_min'))

        if request.args.get('tarifa_hora_max'):
            filters['tarifa_hora_max'] = float(
                request.args.get('tarifa_hora_max'))

        if request.args.get('tarifa_dia_min'):
            filters['tarifa_dia_min'] = float(
                request.args.get('tarifa_dia_min'))

        if request.args.get('tarifa_dia_max'):
            filters['tarifa_dia_max'] = float(
                request.args.get('tarifa_dia_max'))

        # Filtres booleanos
        if request.args.get('accessibilitat'):
            filters['accessibilitat'] = request.args.get(
                'accessibilitat').lower() in ['true', '1', 'si']

        if request.args.get('carrega_electrica'):
            filters['carrega_electrica'] = request.args.get(
                'carrega_electrica').lower() in ['true', '1', 'si']

        if request.args.get('videovigilancia'):
            filters['videovigilancia'] = request.args.get(
                'videovigilancia').lower() in ['true', '1', 'si']

        if request.args.get('obert_24h'):
            filters['obert_24h'] = request.args.get(
                'obert_24h').lower() in ['true', '1', 'si']

        # Filtre de valoració
        if request.args.get('valoracio_min'):
            filters['valoracio_min'] = float(request.args.get('valoracio_min'))

        # Filtres geogràfics
        if request.args.get('latitud'):
            filters['latitud'] = float(request.args.get('latitud'))

        if request.args.get('longitud'):
            filters['longitud'] = float(request.args.get('longitud'))

        if request.args.get('radi_km'):
            filters['radi_km'] = float(request.args.get('radi_km'))

        # Paginació
        if request.args.get('limite'):
            filters['limite'] = int(request.args.get('limite'))

        if request.args.get('offset'):
            filters['offset'] = int(request.args.get('offset'))

        # Cridar al model amb els filtres processats
        result = get_aparcaments_by_filters(filters)
        return jsonify(result), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def add_aparcament_favorit():
    """Controlador per afegir un aparcament a favorits."""
    try:
        if not request.is_json:
            return jsonify({"error": "El contingut ha de ser JSON"}), 400

        data = request.get_json() or {}
        if 'aparcament_id' not in data:
            return jsonify({"error": "Falta el camp obligatori 'aparcament_id'"}), 400

        usuari_id = _get_authenticated_user_id(data.get('usuari_id'))
        aparcament_id = int(data['aparcament_id'])

        result = add_user_favorite_parking(usuari_id, aparcament_id)
        return jsonify({
            "message": "Aparcament afegit a favorits",
            "resultat": result,
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def remove_aparcament_favorit(aparcament_id):
    """Controlador per eliminar un aparcament de favorits."""
    try:
        usuari_id = _get_authenticated_user_id(request.args.get('usuari_id'))
        aparcament_id = int(aparcament_id)

        result = remove_user_favorite_parking(usuari_id, aparcament_id)
        return jsonify({
            "message": "Aparcament eliminat de favorits",
            "resultat": result,
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def list_aparcaments_favorits_usuari():
    """Controlador per llistar favorits d'un usuari autenticat."""
    try:
        usuari_id = _get_authenticated_user_id(request.args.get('usuari_id'))

        limit = int(request.args.get('limit', 1000))
        offset = int(request.args.get('offset', 0))
        if limit <= 0 or limit > 5000:
            limit = 1000
        if offset < 0:
            offset = 0

        favorits = get_user_favorite_parkings(usuari_id, limit, offset)
        favorits_ids = [str(item.get('id')) for item in favorits if item.get('id') is not None]

        return jsonify({
            "total": len(favorits),
            "favorits_ids": favorits_ids,
            "favorits": favorits,
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
