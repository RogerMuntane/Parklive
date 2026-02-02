from flask import Blueprint
from controllers.aparcament_controller import list_aparcaments, get_aparcament_detail


aparcament_routes = Blueprint("aparcaments", __name__)


@aparcament_routes.route("/api/aparcaments", methods=["GET"])
def get_aparcaments():
    """Endpoint GET per llistar tots els aparcaments"""
    return list_aparcaments()


@aparcament_routes.route("/api/aparcaments/<int:id>", methods=["GET"])
def get_aparcament(id):
    """Endpoint GET per obtenir detall d'un aparcament"""
    return get_aparcament_detail(id)
