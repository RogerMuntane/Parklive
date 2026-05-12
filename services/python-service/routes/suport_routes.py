"""
Rutes de l'API per al servei d'atenció al client i suport tècnic.

Permet als usuaris enviar missatges de contacte o incidències directament
a l'equip d'administració de ParkLive.
"""

from flask import Blueprint
from controllers.suport_controller import crear_missatge_suport

suport_routes = Blueprint('suport_routes', __name__)

@suport_routes.route('/api/suport/contacte', methods=['POST'])
def handle_contacte():
    """
    Envia un nou missatge de suport/contacte des de l'usuari.

    Returns:
        Response: JSON confirmant el registre del missatge.
    """
    return crear_missatge_suport()
