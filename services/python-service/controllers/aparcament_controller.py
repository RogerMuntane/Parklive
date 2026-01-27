from flask import jsonify
from models.aparcament_model import get_all_aparcaments


def list_aparcaments():
    """Controlador per llistar tots els aparcaments"""
    try:
        aparcaments = get_all_aparcaments()
        return jsonify(aparcaments), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
