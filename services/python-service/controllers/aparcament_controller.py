from flask import jsonify
from models.aparcament_model import get_all_aparcaments, get_aparcament_by_id


def list_aparcaments():
    """Controlador per llistar tots els aparcaments"""
    try:
        aparcaments = get_all_aparcaments()
        return jsonify(aparcaments), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def get_aparcament_detail(aparcament_id):
    """Controlador per obtenir detall d'un aparcament específic"""
    try:
        # Validar que l'ID sigui un número vàlid
        try:
            aparcament_id = int(aparcament_id)
        except (ValueError, TypeError):
            return jsonify({"error": "ID d'aparcament no vàlid"}), 400

        # Obtenir l'aparcament
        aparcament = get_aparcament_by_id(aparcament_id)

        # Si no existeix, retornar 404
        if aparcament is None:
            return jsonify({"error": "Aparcament no trobat"}), 404

        # Retornar l'aparcament
        return jsonify(aparcament), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
