from flask import jsonify, request
from models.report_disponibilitat_model import (
    create_report_disponibilitat,
    list_report_disponibilitat,
    CooldownError,
    COOLDOWN_SECONDS,
)


def _resolve_reporter_key(payload):
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


from middleware.jwt_auth import get_jwt_user_id

def _resolve_request_user_id(payload):
    candidate = payload.get('usuari_id')
    if candidate is not None and str(candidate).strip() != '':
        try:
            return int(candidate)
        except (TypeError, ValueError):
            pass

    try:
        # JWT estrictament obligatori.
        return get_jwt_user_id(fallback_to_header=False)
    except ValueError:
        return None


def create_report_disponibilitat_controller():
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
    try:
        limit = request.args.get('limit', 100)
        reports = list_report_disponibilitat(limit=limit)
        return jsonify({
            'total': len(reports),
            'reports': reports,
        }), 200
    except Exception as err:
        return jsonify({'error': f'Error obtenint reports: {str(err)}'}), 500