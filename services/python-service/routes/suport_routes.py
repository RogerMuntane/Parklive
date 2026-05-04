from flask import Blueprint
from controllers.suport_controller import crear_missatge_suport

suport_routes = Blueprint('suport_routes', __name__)

@suport_routes.route('/api/suport/contacte', methods=['POST'])
def handle_contacte():
    return crear_missatge_suport()
