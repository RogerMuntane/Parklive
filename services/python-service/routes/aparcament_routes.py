from flask import Blueprint
from controllers.aparcament_controller import list_aparcaments

aparcament_routes = Blueprint("aparcaments", __name__)


@aparcament_routes.route("/api/aparcaments", methods=["GET"])
def get_aparcaments():
    """Endpoint GET per llistar tots els aparcaments"""
    return list_aparcaments()
