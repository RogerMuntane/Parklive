"""
Controlador per a la recuperació de contrasenya via codi de verificació.

Gestiona dos endpoints del flux de recuperació:
1. Sol·licitud d'enviament del codi per email.
2. Verificació del codi i establiment de la nova contrasenya.

Delega la lògica de negoci a `ResetCodeService`, eliminant detalls
d'excepció interns de la resposta per seguretat.
"""

from models.reset_code import ResetCodeService
from flask import request, jsonify


def send_reset_code():
    """
    POST /api/reset/send - Sol·licita l'enviament d'un codi de recuperació per email.

    Body JSON:
        email (str): Adreça de correu electrònic de l'usuari.

    Returns:
        JSON 200: Confirmació d'enviament amb missatge de resposta.
        JSON 400: Si l'email no ha estat proporcionat.
        Altres codis: Propagats des de ResetCodeService (p. ex. 404 si l'usuari no existeix).
    """
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip()

    if not email:
        return jsonify({"error": "No s'ha pogut obtenir l'email"}), 400

    service = ResetCodeService()
    result = service.create_and_send_code(email)

    status_code = result.pop("status_code", 200)
    if status_code != 200:
        result.pop("_exception", None)  # No exposar detalls interns
        return jsonify(result), status_code

    return jsonify(result), 200


def verify_and_change_password():
    """
    POST /api/reset/verify - Verifica el codi i aplica la nova contrasenya.

    Body JSON:
        email (str): Adreça de correu electrònic.
        code (str): Codi de 6 dígits rebut per email.
        verification_id (str|None): ID de verificació addicional (opcional).
        new_password (str): Nova contrasenya a establir.
        confirm_password (str): Confirmació de la nova contrasenya.

    Returns:
        JSON 200: Confirmació del canvi de contrasenya.
        JSON 400: Si falten camps obligatoris o el codi és incorrecte.
        Altres codis: Propagats des de ResetCodeService.
    """
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
        result.pop("_exception", None)  # No exposar detalls interns
        return jsonify(result), status_code

    return jsonify(result), 200
