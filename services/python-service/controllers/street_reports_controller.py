from flask import jsonify, request
from models.street_reports_model import create_street_report, CooldownError, COOLDOWN_SECONDS


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


def create_street_availability_report():
    if not request.is_json:
        return jsonify({'error': 'El contingut ha de ser JSON'}), 400

    payload = request.get_json() or {}
    reporter_key = _resolve_reporter_key(payload)

    try:
        report = create_street_report(payload, reporter_key=reporter_key)
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
