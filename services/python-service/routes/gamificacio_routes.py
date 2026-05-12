"""
Rutes de l'API per al sistema de gamificació de ParkLive.

Gestiona el saldo de punts dels usuaris, la consulta de recompenses
disponibles i el procés de bescanvi de premis (incloent subscripcions premium).
"""

from flask import Blueprint, jsonify, request
from models.gamificacio_model import get_user_points, get_recompenses, redeem_reward, get_user_obtained_rewards

gamificacio_bp = Blueprint('gamificacio', __name__)

@gamificacio_bp.route('/punts/<int:user_id>', methods=['GET'])
def fetch_points(user_id):
    """
    Consulta el saldo actual de punts d'un usuari.

    Args:
        user_id (int): ID de l'usuari.

    Returns:
        Response: JSON amb el total de punts.
    """
    points = get_user_points(user_id)
    return jsonify({"success": True, "punts": points})

@gamificacio_bp.route('/recompenses', methods=['GET'])
def fetch_recompenses():
    """
    Llista totes les recompenses disponibles al catàleg.

    Returns:
        Response: JSON amb la llista de recompenses.
    """
    recompenses = get_recompenses()
    return jsonify({"success": True, "recompenses": recompenses})

@gamificacio_bp.route('/usuari/<int:user_id>/recompenses', methods=['GET'])
def fetch_user_rewards(user_id):
    """
    Llista les recompenses que ja han estat obtingudes per l'usuari.

    Args:
        user_id (int): ID de l'usuari.

    Returns:
        Response: JSON amb la llista de recompenses de l'usuari.
    """
    recompenses = get_user_obtained_rewards(user_id)
    return jsonify({"success": True, "recompenses": recompenses})

@gamificacio_bp.route('/bescanvi', methods=['POST'])
def process_redeem():
    """
    Processa el bescanvi d'una recompensa per punts.

    Returns:
        Response: JSON indicant èxit, missatge i possible nou token JWT.
    """
    data = request.get_json()
    user_id = data.get('usuari_id')
    reward_id = data.get('recompensa_id')

    if not user_id or not reward_id:
        return jsonify({"success": False, "error": "Falten dades obligatòries"}), 400

    success, message = redeem_reward(user_id, reward_id)
    if success:
        # Generar nou token JWT per reflectir possibles canvis en tipus_usuari (ex: premium)
        from middleware.jwt_auth import generate_jwt_token
        from models.db_connection import get_new_connection
        conn = get_new_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, nom, email, tipus_usuari FROM usuaris WHERE id = %s", (user_id,))
        user_data = cursor.fetchone()
        conn.close()

        token = generate_jwt_token(user_data) if user_data else None

        return jsonify({"success": True, "message": message, "token": token})
    else:
        return jsonify({"success": False, "error": message}), 400
