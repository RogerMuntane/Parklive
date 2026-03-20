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


def verify_and_change_password():
    """Endpoint per verificar el codi de reset i canviar la contrasenya"""

    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip()
    code = (payload.get("code") or "").strip()
    verification_id = payload.get("verification_id")
    new_password = payload.get("new_password") or ""
    confirm_password = payload.get("confirm_password") or ""

    if not email or not code or not new_password:
        return jsonify({"error": "Tots els camps són obligatoris"}), 400

    service = ResetCodeService()
    result = service.verify_code_and_change_password(
        email=email,
        code=code,
        verification_id=verification_id,
        new_password=new_password,
        confirm_password=confirm_password,
    )

    status_code = result.pop("status_code", 200)
    if status_code != 200:
        result.pop("_exception", None)
        return jsonify(result), status_code

    return jsonify(result), 200
