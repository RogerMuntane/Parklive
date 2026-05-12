"""
Controlador per a les preguntes freqüents (FAQ).

Exposa un únic endpoint públic per recuperar totes les FAQs actives
ordenades per categoria i ordre de visualització.
"""

from flask import jsonify
from models.faq_model import get_faqs


def get_faqs_list():
    """
    GET /api/faqs - Retorna totes les preguntes freqüents actives.

    Returns:
        JSON 200: Llista de FAQs amb 'success' True i 'data' (list).
        JSON 500: Si hi ha un error intern al recuperar les dades.
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
