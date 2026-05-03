from flask import Blueprint
from controllers.faq_controller import get_faqs_list

faq_routes = Blueprint("faqs", __name__)

@faq_routes.route("/api/faqs", methods=["GET"])
def get_all_faqs():
    """Endpoint GET per obtenir totes les preguntes freqüents"""
    return get_faqs_list()
