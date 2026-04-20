"""
estadistiques_routes.py
Blueprint de rutes per a les estadístiques de l'usuari.
"""
from flask import Blueprint
from controllers.estadistiques_controller import estadistiques_usuari

estadistiques_routes = Blueprint("estadistiques", __name__)


@estadistiques_routes.route("/api/usuari/estadistiques", methods=["GET"])
def get_estadistiques_usuari():
    """Endpoint per obtenir totes les estadístiques d'un usuari"""
    return estadistiques_usuari()
