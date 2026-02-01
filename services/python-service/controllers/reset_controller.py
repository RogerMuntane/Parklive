from models.reset_code import ResetCodeService
from flask import request, jsonify


def send_reset_code():
    """Endpoint per solicitar un codi de reset de contrasenya"""

    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip()

    if not email:
        return jsonify({"error": "L'email és obligatori"}), 400

    service = ResetCodeService()
    result = service.create_and_send_code(email)

    status_code = result.pop("status_code", 200)
    if status_code != 200:
        # Eliminem detalls interns
        result.pop("_exception", None)
        return jsonify(result), status_code

    return jsonify(result), 200


def verify_and_reset_password():
    """Endpoint per verificar el codi i canviar la contrasenya"""

    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip()
    code = (payload.get("code") or "").strip()
    new_password = payload.get("new_password") or ""

    # Validar inputs
    if not email:
        return jsonify({"error": "L'email és obligatori"}), 400
    if not code:
        return jsonify({"error": "El codi és obligatori"}), 400
    if not new_password or len(new_password) < 6:
        return (
            jsonify(
                {"error": "La contrasenya ha de tenir almenys 6 caràcters"}
            ),
            400,
        )

    service = ResetCodeService()
    result = service.verify_code_and_reset_password(email, code, new_password)

    status_code = result.pop("status_code", 200)
    if status_code != 200:
        # Eliminem detalls interns
        result.pop("_exception", None)
        return jsonify(result), status_code

    return jsonify(result), 200
