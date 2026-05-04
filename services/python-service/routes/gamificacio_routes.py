from flask import Blueprint, jsonify, request
from models.gamificacio_model import get_user_points, get_recompenses, redeem_reward, get_user_obtained_rewards

gamificacio_bp = Blueprint('gamificacio', __name__)

@gamificacio_bp.route('/punts/<int:user_id>', methods=['GET'])
def fetch_points(user_id):
    points = get_user_points(user_id)
    return jsonify({"success": True, "punts": points})

@gamificacio_bp.route('/recompenses', methods=['GET'])
def fetch_recompenses():
    recompenses = get_recompenses()
    return jsonify({"success": True, "recompenses": recompenses})

@gamificacio_bp.route('/usuari/<int:user_id>/recompenses', methods=['GET'])
def fetch_user_rewards(user_id):
    recompenses = get_user_obtained_rewards(user_id)
    return jsonify({"success": True, "recompenses": recompenses})

@gamificacio_bp.route('/bescanvi', methods=['POST'])
def process_redeem():
    data = request.get_json()
    user_id = data.get('usuari_id')
    reward_id = data.get('recompensa_id')
    
    if not user_id or not reward_id:
        return jsonify({"success": False, "error": "Falten dades obligatòries"}), 400
        
    success, message = redeem_reward(user_id, reward_id)
    if success:
        return jsonify({"success": True, "message": message})
    else:
        return jsonify({"success": False, "error": message}), 400
