"""
Controlador per a les contribucions de disponibilitat (crowdsourcing d'usuaris).

Gestiona la creació i consulta de reports d'estat d'aparcament enviats pels
usuaris de l'aplicació, incloent validació de tipus de dades i paginació.
"""

from flask import jsonify, request
from models.contribucions_model import crear_contribucio, get_contribucions_usuari


def crear_nova_contribucio():
    """
    POST /api/contribucions - Crea una nova contribució de disponibilitat.

    Body JSON:
        usuari_id (int): ID de l'usuari reporter (obligatori).
        estat_reportat (str): 'lliure' o 'ocupat' (obligatori).
        dades (dict|None): Dades addicionals opcionals (comentari, foto_url).
        latitud (float|None): Coordenada latitud de la ubicació (opcional).
        longitud (float|None): Coordenada longitud de la ubicació (opcional).

    Returns:
        JSON 201: Contribució creada amb les dades persistides.
        JSON 400: Si falten camps obligatoris o hi ha errors de tipus.
        JSON 500: Error intern del servidor.
    """
    try:
        if not request.is_json:
            return jsonify({"error": "El contingut ha de ser JSON"}), 400

        data = request.get_json()

        required_fields = ['usuari_id', 'estat_reportat']
        missing_fields = [field for field in required_fields if field not in data]

        if missing_fields:
            return jsonify({
                "error": f"Falten els següents camps obligatoris: {', '.join(missing_fields)}"
            }), 400

        try:
            data['usuari_id'] = int(data['usuari_id'])

            if 'latitud' in data and data['latitud']:
                data['latitud'] = float(data['latitud'])

            if 'longitud' in data and data['longitud']:
                data['longitud'] = float(data['longitud'])
        except (ValueError, TypeError):
            return jsonify({"error": "Els camps numèrics tenen tipus invàlids"}), 400

        nova_contribucio = crear_contribucio(data)

        return jsonify({
            "message": "Contribució reportada amb èxit",
            "contribucio": nova_contribucio
        }), 201

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Error en crear la contribució: {str(e)}"}), 500


def obtenir_contribucions_usuari():
    """
    GET /api/contribucions - Retorna l'historial de contribucions d'un usuari.

    Query params:
        usuari_id (int): ID de l'usuari (obligatori).
        limit (int): Nombre màxim de resultats (opcional).
        offset (int): Desplaçament per a la paginació (opcional).

    Returns:
        JSON 200: Total i llista de contribucions.
        JSON 400: Si falta usuari_id o els paràmetres no són numèrics.
        JSON 500: Error intern del servidor.
    """
    try:
        usuari_id = request.args.get('usuari_id')

        if not usuari_id:
            return jsonify({"error": "Falta el paràmetre 'usuari_id'"}), 400

        try:
            usuari_id = int(usuari_id)
        except (ValueError, TypeError):
            return jsonify({"error": "usuari_id ha de ser un nombre"}), 400

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

        contribucions = get_contribucions_usuari(usuari_id, filters)

        return jsonify({
            "total": len(contribucions),
            "contribucions": contribucions
        }), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500