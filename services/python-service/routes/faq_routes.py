"""
Rutes de l'API per a la consulta de preguntes freqüents (FAQ).

Permet obtenir la llista categoritzada de dubtes comuns per a l'usuari.
"""

from flask import Blueprint
from controllers.faq_controller import get_faqs_list

faq_routes = Blueprint("faqs", __name__)

@faq_routes.route("/api/faqs", methods=["GET"])
def get_all_faqs():
    """
    Retorna la llista completa de preguntes freqüents.

    Returns:
        Response: JSON amb la llista de FAQs.
    """
    return get_faqs_list()
