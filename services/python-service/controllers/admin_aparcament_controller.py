"""
Controlador d'operacions administratives per a la gestió d'aparcaments (CRUD + imatges).

Protegit per autenticació JWT amb rol d'administrador o operador. Gestiona el
cicle de vida complet dels aparcaments: llistat paginator, creació, actualització
i eliminació. El processament d'imatges es delega al model `admin_aparcament_model`.
"""

from flask import jsonify, request
from models.admin_aparcament_model import (
    get_admin_aparcaments,
    count_admin_aparcaments,
    create_aparcament,
    update_aparcament,
    delete_aparcament,
    save_parking_images,
)
from middleware.jwt_auth import get_jwt_user_id


def get_admin_list():
    """
    GET /api/admin/aparcaments - Llista els aparcaments amb filtres i paginació.

    Query params:
        search (str): Cerca per nom, adreça o ciutat.
        type (str): Filtre per tipologia.
        status (str): Filtre per estat (actiu/inactiu).
        page (int): Número de pàgina (per defecte 1).
        limit (int): Registres per pàgina (màx. 100, per defecte 10).

    Returns:
        JSON 200: Llista d'aparcaments i informació de paginació.
        JSON 500: Error intern del servidor.
    """
    try:
        search = request.args.get('search', '')
        tipo = request.args.get('type', '')
        status = request.args.get('status', '')
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))

        if page < 1:
            page = 1
        if limit < 1 or limit > 100:
            limit = 10

        offset = (page - 1) * limit

        total = count_admin_aparcaments(search, tipo, status)
        data = get_admin_aparcaments(search, tipo, status, limit, offset)

        total_pages = (total + limit - 1) // limit

        return jsonify({
            'success': True,
            'data': data,
            'pagination': {
                'total': total,
                'page': page,
                'limit': limit,
                'total_pages': total_pages
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


def create_admin():
    """
    POST /api/admin/aparcaments - Crea un nou aparcament (multipart/form-data).

    Camps obligatoris del formulari: nom, tipus, adreca, ciutat, latitud, longitud.
    Camps opcionals: imatges via 'parking_images[]', tarifes, horaris, etc.
    Si el processament d'imatges falla, el rollback elimina l'aparcament creat.

    Returns:
        JSON 201: ID de l'aparcament creat.
        JSON 400: Si falten camps obligatoris o les imatges són invàlides.
        JSON 500: Error intern del servidor.
    """
    try:
        # Obtenir dades del formulari (multipart/form-data)
        data = request.form.to_dict()

        # Validar dades obligatòries
        required = ['nom', 'tipus', 'adreca', 'ciutat', 'latitud', 'longitud']
        missing = [field for field in required if not data.get(field)]
        if missing:
            return jsonify({
                'success': False,
                'error': f"Falten dades obligatòries: {', '.join(missing)}"
            }), 400

        # Crear aparcament
        parking_id = create_aparcament(data)

        # Procesar imatges si n'hi ha
        user_id = None
        try:
            user_id = get_jwt_user_id()
        except:
            pass

        if 'parking_images[]' in request.files:
            try:
                save_parking_images(
                    parking_id,
                    request.files,
                    user_id
                )
            except ValueError as ve:
                # Si falla el upload de fotos, eliminar l'aparcament creat
                delete_aparcament(parking_id)
                return jsonify({'success': False, 'error': str(ve)}), 400

        return jsonify({
            'success': True,
            'message': 'Aparcament creat correctament',
            'id': parking_id
        }), 201

    except ValueError as ve:
        return jsonify({'success': False, 'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


def update_admin():
    """
    PUT /api/admin/aparcaments - Actualitza les dades d'un aparcament existent.

    Query params:
        id (int): ID de l'aparcament a modificar (obligatori).

    Camps del formulari: mateixos que create_admin.
    Si s'envien imatges noves via 'parking_images[]', s'afegeixen a les existents.

    Returns:
        JSON 200: Confirmació de l'actualització.
        JSON 400: Si l'ID falta, no és vàlid o falten camps obligatoris.
        JSON 500: Error intern del servidor.
    """
    try:
        parking_id = request.args.get('id')
        if not parking_id:
            return jsonify({'success': False, 'error': 'ID d\'aparcament no proporcionat'}), 400

        try:
            parking_id = int(parking_id)
        except ValueError:
            return jsonify({'success': False, 'error': 'ID d\'aparcament no vàlid'}), 400

        # Obtenir dades del formulari
        data = request.form.to_dict()

        # Validar dades obligatòries
        required = ['nom', 'tipus', 'adreca', 'ciutat', 'latitud', 'longitud']
        missing = [field for field in required if not data.get(field)]
        if missing:
            return jsonify({
                'success': False,
                'error': f"Falten dades obligatòries: {', '.join(missing)}"
            }), 400

        # Actualitzar aparcament
        update_aparcament(parking_id, data)

        # Procesar imatges si n'hi ha
        user_id = None
        try:
            user_id = get_jwt_user_id()
        except:
            pass

        if 'parking_images[]' in request.files:
            try:
                save_parking_images(
                    parking_id,
                    request.files,
                    user_id
                )
            except ValueError as ve:
                return jsonify({'success': False, 'error': str(ve)}), 400

        return jsonify({
            'success': True,
            'message': 'Aparcament actualitzat correctament'
        }), 200

    except ValueError as ve:
        return jsonify({'success': False, 'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


def delete_admin():
    """
    DELETE /api/admin/aparcaments - Elimina un aparcament i tots els seus recursos.

    Query params:
        id (int): ID de l'aparcament a eliminar (obligatori).

    Returns:
        JSON 200: Confirmació de l'eliminació.
        JSON 400: Si l'ID falta o no és vàlid.
        JSON 500: Error intern del servidor.
    """
    try:
        parking_id = request.args.get('id')
        if not parking_id:
            return jsonify({'success': False, 'error': 'ID d\'aparcament no proporcionat'}), 400

        try:
            parking_id = int(parking_id)
        except ValueError:
            return jsonify({'success': False, 'error': 'ID d\'aparcament no vàlid'}), 400

        delete_aparcament(parking_id)

        return jsonify({
            'success': True,
            'message': 'Aparcament eliminat correctament'
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
