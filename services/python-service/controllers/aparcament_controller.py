"""
Controlador per a la gestió pública i de favorits d'aparcaments.

Exposa endpoints per llistar, cercar i consultar aparcaments amb filtres
avançats (text, geogràfics, tarifes, accessibilitat). Gestiona també
les llistes de favorits i la consulta de disponibilitat per franja horària.
"""

from flask import jsonify, request
from datetime import datetime
from models.aparcament_model import (
    get_all_aparcaments,
    get_aparcament_by_id,
    get_aparcaments_by_filters,
    add_user_favorite_parking,
    remove_user_favorite_parking,
    get_user_favorite_parkings,
    get_places_disponibles_per_franja,
)

from middleware.jwt_auth import get_jwt_user_id

def _get_authenticated_user_id(fallback_value=None):
    """
    Extreu i valida l'ID d'usuari del token JWT de la petició.

    Si la validació JWT falla però s'ha proporcionat un `fallback_value`,
    l'utilitza com a alternativa (útil en endpoints mixtos autenticat/anònim).

    Args:
        fallback_value (int|str|None): Valor alternatiu si JWT no és present.

    Returns:
        int: L'ID de l'usuari autenticat.

    Raises:
        ValueError: Si el JWT és invàlid i no hi ha fallback disponible.
    """
    try:
        # Eliminem el fallback_to_header per fer el JWT estrictament obligatori.
        user_id = get_jwt_user_id(fallback_to_header=False)
        return user_id
    except ValueError as e:
        if fallback_value is not None:
            try:
                return int(fallback_value)
            except (ValueError, TypeError):
                pass
        raise e


def list_aparcaments():
    """
    GET /api/aparcaments - Retorna la llista completa d'aparcaments.

    Returns:
        JSON 200: Array amb tots els aparcaments.
        JSON 500: Error intern del servidor.
    """
    try:
        aparcaments = get_all_aparcaments()
        return jsonify(aparcaments), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def get_aparcament_detail(aparcament_id):
    """
    GET /api/aparcaments/<id> - Retorna el detall complet d'un aparcament.

    Args:
        aparcament_id (int|str): ID de l'aparcament (de l'URL).

    Returns:
        JSON 200: Diccionari amb totes les dades de l'aparcament.
        JSON 400: Si l'ID no és numèric.
        JSON 404: Si l'aparcament no existeix.
        JSON 500: Error intern del servidor.
    """
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
    """
    GET /api/aparcaments/search - Cerca aparcaments amb filtres avançats.

    Query params (tots opcionals):
        ciutat (str), tipus (str), disponibilitat (str, separats per coma),
        altura_min (float), tarifa_hora_min/max (float), tarifa_dia_min/max (float),
        accessibilitat/carrega_electrica/videovigilancia/obert_24h (bool: 'true'/'1'/'si'),
        valoracio_min (float), latitud/longitud/radi_km (float per cerca geogràfica),
        data_entrada/data_sortida (str), limite (int), offset (int).

    Returns:
        JSON 200: Resultats filtrats i paginats.
        JSON 400: Error de validació en els paràmetres.
        JSON 500: Error intern del servidor.
    """
    try:
        # Obtenir els filtres dels query params
        filters = {}

        # Filtres de text
        if request.args.get('ciutat'):
            filters['ciutat'] = request.args.get('ciutat')

        if request.args.get('tipus'):
            filters['tipus'] = request.args.get('tipus')

        if request.args.get('disponibilitat'):
            disp_param = request.args.get('disponibilitat')
            if ',' in disp_param:
                filters['disponibilitat'] = [e.strip() for e in disp_param.split(',')]
            else:
                filters['disponibilitat'] = disp_param

        # Filtre d'altura mínima (pel tipus de vehicle)
        if request.args.get('altura_min'):
            filters['altura_min'] = float(request.args.get('altura_min'))

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

        # Filtres de dates
        if request.args.get('data_entrada'):
            filters['data_entrada'] = request.args.get('data_entrada')
        
        if request.args.get('data_sortida'):
            filters['data_sortida'] = request.args.get('data_sortida')

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
    """
    POST /api/aparcaments/favorits - Afegeix un aparcament a la llista de favorits.

    Body JSON:
        aparcament_id (int): ID de l'aparcament a afegir (obligatori).
        usuari_id (int|None): ID d'usuari de fallback si JWT no és present.

    Returns:
        JSON 201: Resultat de l'operació d'inserció.
        JSON 400: Si falta aparcament_id o les dades no són JSON.
        JSON 401: Si JWT és invàlid i no hi ha fallback.
        JSON 500: Error intern del servidor.
    """
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
    """
    DELETE /api/aparcaments/<id>/favorits - Elimina un aparcament de favorits.

    Args:
        aparcament_id (int|str): ID de l'aparcament a eliminar (de l'URL).

    Query params:
        usuari_id (int|None): Fallback si JWT no és present.

    Returns:
        JSON 200: Confirmació de l'eliminació.
        JSON 401: Si JWT és invàlid i no hi ha fallback.
        JSON 500: Error intern del servidor.
    """
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
    """
    GET /api/aparcaments/favorits - Retorna els aparcaments favorits de l'usuari.

    Query params:
        usuari_id (int|None): Fallback si JWT no és present.
        limit (int): Nombre màxim de resultats (per defecte 1000, màx 5000).
        offset (int): Desplaçament per a la paginació.

    Returns:
        JSON 200: total, favorits_ids (llista d'IDs) i favorits (llista completa).
        JSON 401: Si JWT és invàlid i no hi ha fallback.
        JSON 500: Error intern del servidor.
    """
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


def get_disponibilitat_franja(aparcament_id):
    """
    Controlador per obtenir les places disponibles d'un aparcament per una franja horària.

    Query params:
    - data_entrada: inici de la franja (format: YYYY-MM-DD HH:MM o YYYY-MM-DD HH:MM:SS)
    - data_sortida: fi de la franja (format: YYYY-MM-DD HH:MM o YYYY-MM-DD HH:MM:SS)
    """
    try:
        aparcament_id = int(aparcament_id)
    except (ValueError, TypeError):
        return jsonify({"error": "ID d'aparcament no vàlid"}), 400

    data_entrada_str = request.args.get('data_entrada')
    data_sortida_str = request.args.get('data_sortida')

    if not data_entrada_str or not data_sortida_str:
        return jsonify({"error": "Cal especificar 'data_entrada' i 'data_sortida'"}), 400

    # Acceptar formats amb o sense segons
    FORMATS = ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M']

    def parse_dt(s):
        for fmt in FORMATS:
            try:
                return datetime.strptime(s, fmt)
            except ValueError:
                continue
        raise ValueError(f"Format de data no reconegut: {s}")

    try:
        data_entrada = parse_dt(data_entrada_str)
        data_sortida = parse_dt(data_sortida_str)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    if data_sortida <= data_entrada:
        return jsonify({"error": "La data de sortida ha de ser posterior a la d'entrada"}), 400

    try:
        resultat = get_places_disponibles_per_franja(aparcament_id, data_entrada, data_sortida)
        if resultat is None:
            return jsonify({"error": "Aparcament no trobat"}), 404
        return jsonify(resultat), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
