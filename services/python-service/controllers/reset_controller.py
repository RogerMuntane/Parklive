from models.reset_code import ResetCodeService
from flask import request, jsonify


def send_reset_code():
    """Endpoint per solicitar un codi de reset de contrasenya"""

    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip()

    if not email:
        return jsonify({"error": "No s'ha pogut obtenir l'email"}), 400

    service = ResetCodeService()
    result = service.create_and_send_code(email)

    status_code = result.pop("status_code", 200)
    if status_code != 200:
        # Eliminem detalls interns
        result.pop("_exception", None)
        return jsonify(result), status_code

    return jsonify(result), 200
