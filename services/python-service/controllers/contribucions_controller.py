from flask import jsonify, request
from models.contribucions_model import crear_contribucio, get_contribucions_usuari


def crear_nova_contribucio():
    """
    Controlador per crear una nova contribució

    Espera un JSON amb:
    {
        "usuari_id": 1,
        "estat_reportat": "lliure",  // 'lliure' o 'ocupat'
        "dades": {  // opcional
            "comentari": "Hi ha 3 places lliures al segon pis",
            "foto_url": "https://..."
        },
        "latitud": 41.3851,  // opcional
        "longitud": 2.1734   // opcional
    }
    """
    try:
        # Validar que el request té dades JSON
        if not request.is_json:
            return jsonify({"error": "El contingut ha de ser JSON"}), 400

        data = request.get_json()

        # Validar camps obligatoris
        required_fields = ['usuari_id', 'estat_reportat']
        missing_fields = [field for field in required_fields if field not in data]

        if missing_fields:
            return jsonify({
                "error": f"Falten els següents camps obligatoris: {', '.join(missing_fields)}"
            }), 400

        # Validar tipus de dades
        try:
            data['usuari_id'] = int(data['usuari_id'])

            if 'latitud' in data and data['latitud']:
                data['latitud'] = float(data['latitud'])

            if 'longitud' in data and data['longitud']:
                data['longitud'] = float(data['longitud'])
        except (ValueError, TypeError):
            return jsonify({"error": "Els camps numèrics tenen tipus invàlids"}), 400

        # Crear la contribució
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
    Controlador per obtenir l'historial de contribucions d'un usuari

    Query params:
    - usuari_id: ID de l'usuari (obligatori)
    - validada: true/false (opcional)
    - limit: límit de resultats (opcional)
    - offset: offset per paginació (opcional)
    """
    try:
        usuari_id = request.args.get('usuari_id')

        if not usuari_id:
            return jsonify({"error": "Falta el paràmetre 'usuari_id'"}), 400

        try:
            usuari_id = int(usuari_id)
        except (ValueError, TypeError):
            return jsonify({"error": "usuari_id ha de ser un nombre"}), 400

        # Construir filtres
        filters = {}

        if request.args.get('validada'):
            filters['validada'] = request.args.get('validada').lower() == 'true'

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