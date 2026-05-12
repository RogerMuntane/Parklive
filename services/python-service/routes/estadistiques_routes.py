"""
Rutes de l'API per a les estadístiques de l'usuari a ParkLive.

Proporciona mètriques personals com el nombre de reserves realitzades,
punts acumulats i estalvi de temps/emissions.
"""
from flask import Blueprint
from controllers.estadistiques_controller import estadistiques_usuari

estadistiques_routes = Blueprint("estadistiques", __name__)


@estadistiques_routes.route("/api/usuari/estadistiques", methods=["GET"])
def get_estadistiques_usuari():
    """
    Obté el resum estadístic de l'usuari autenticat.

    Returns:
        Response: JSON amb mètriques d'activitat de l'usuari.
    """
    return estadistiques_usuari()
