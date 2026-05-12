"""
Controlador per a la gestió de reports de disponibilitat al carrer.

Exposa endpoints per crear i llistar reports crowdsourced de places d'aparcament.
Inclou resolució de la identitat del reporter (autenticat via JWT o anònim via IP)
i control de cooldown per evitar enviaments repetitius.
"""

from flask import jsonify, request
from models.report_disponibilitat_model import (
    create_report_disponibilitat,
    list_report_disponibilitat,
    CooldownError,
    COOLDOWN_SECONDS,
)
from middleware.jwt_auth import get_jwt_user_id


def _resolve_reporter_key(payload):
    """
    Determina una clau única d'identificació del reporter per al control de cooldown.

    Prioritza l'ID d'usuari autenticat, i en cas de ser anònim usa la IP
    del client extreta de X-Forwarded-For o remote_addr.

    Args:
        payload (dict): Cos de la petició JSON amb possibles camps d'identitat.

    Returns:
        str: Clau del reporter en format 'user:<id>' o 'ip:<adreça>'.
    """
    user_id = payload.get('usuari_id')
    if user_id is not None and str(user_id).strip() != '':
        return f'user:{user_id}'

    forwarded_for = request.headers.get('X-Forwarded-For', '')
    if forwarded_for:
        ip = forwarded_for.split(',')[0].strip()
        if ip:
            return f'ip:{ip}'

    remote_addr = request.remote_addr or 'unknown'
    return f'ip:{remote_addr}'


def _resolve_request_user_id(payload):
    """
    Resol l'ID d'usuari de la petició prioritzant el payload sobre el JWT.

    Si el payload conté 'usuari_id', l'utilitza directament. Si no, intenta
    obtenir l'ID des del token JWT. Retorna None si no es pot resoldre.

    Args:
        payload (dict): Cos de la petició JSON.

    Returns:
        int|None: ID de l'usuari o None si no s'ha pogut identificar.
    """
    candidate = payload.get('usuari_id')
    if candidate is not None and str(candidate).strip() != '':
        try:
            return int(candidate)
        except (TypeError, ValueError):
            pass

    try:
        return get_jwt_user_id(fallback_to_header=False)
    except ValueError:
        return None


def create_report_disponibilitat_controller():
    """
    POST /api/reports/disponibilitat - Crea un nou report de disponibilitat al carrer.

    Resol la identitat del reporter i aplica el control de cooldown.
    Accepta tant usuaris autenticats com anònims (identificats per IP).

    Body JSON:
        status (str): 'available' o 'occupied' (obligatori).
        latitud (float): Coordenada latitud (obligatori).
        longitud (float): Coordenada longitud (obligatori).
        comment (str|None): Comentari opcional.
        usuari_id (int|None): ID d'usuari si autenticat (opcional).

    Returns:
        JSON 201: Report creat amb cooldown_seconds i dades del report.
        JSON 400: Error de validació en els camps.
        JSON 429: Cooldown actiu (inclou cooldown_seconds_left).
        JSON 500: Error intern del servidor.
    """
    if not request.is_json:
        return jsonify({'error': 'El contingut ha de ser JSON'}), 400

    payload = request.get_json() or {}
    resolved_user_id = _resolve_request_user_id(payload)
    payload['usuari_id'] = resolved_user_id
    reporter_key = _resolve_reporter_key(payload)

    try:
        report = create_report_disponibilitat(payload, reporter_key=reporter_key)
        return jsonify({
            'message': 'Reporte enviado correctamente',
            'cooldown_seconds': COOLDOWN_SECONDS,
            'report': report,
        }), 201
    except CooldownError as err:
        return jsonify({
            'error': str(err),
            'cooldown_seconds_left': err.seconds_left,
        }), 429
    except ValueError as err:
        return jsonify({'error': str(err)}), 400
    except Exception as err:
        return jsonify({'error': f'Error creando reporte: {str(err)}'}), 500


def list_report_disponibilitat_controller():
    """
    GET /api/reports/disponibilitat - Llista els reports recents (últims 30 min).

    Query params:
        limit (int): Nombre màxim de reports a retornar (per defecte 100, màx 500).

    Returns:
        JSON 200: Total i llista de reports en format API.
        JSON 500: Error intern del servidor.
    """
    try:
        limit = request.args.get('limit', 100)
        reports = list_report_disponibilitat(limit=limit)
        return jsonify({
            'total': len(reports),
            'reports': reports,
        }), 200
    except Exception as err:
        return jsonify({'error': f'Error obtenint reports: {str(err)}'}), 500