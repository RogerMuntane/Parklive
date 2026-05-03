from flask import jsonify
from models.faq_model import get_faqs

def get_faqs_list():
    """
    Controlador per obtenir totes les preguntes freqüents actives.
    """
    try:
        faqs = get_faqs()
        return jsonify({
            "success": True,
            "data": faqs
        }), 200
    except Exception as e:
        print(f"[ParkLive] Error a get_faqs_list: {str(e)}")
        return jsonify({
            "success": False,
            "error": "S'ha produït un error al servidor carregant les FAQs"
        }), 500
