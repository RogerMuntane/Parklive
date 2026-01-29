from flask import Blueprint, jsonify, request

from models.reset_code import ResetCodeService

reset_bp = Blueprint("reset_bp", __name__)


@reset_bp.route("/api/auth/send-reset-code", methods=["POST"])
def send_reset_code():
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
