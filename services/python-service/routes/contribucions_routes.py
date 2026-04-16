from flask import Blueprint
from controllers.contribucions_controller import (
    crear_nova_contribucio,
    obtenir_contribucions_usuari
)


contribucions_routes = Blueprint("contribucions", __name__)


@contribucions_routes.route("/api/contribucions", methods=["POST"])
def create_contribucio():
    """
    Endpoint POST per reportar una nova contribució

    Body JSON:
    {
        "usuari_id": 1,
        "aparcament_id": 5,  // opcional
        "estat_reportat": "lliure",
        "dades": {
            "comentari": "Places lliures"
        },
        "latitud": 41.3851,
        "longitud": 2.1734
    }
    """
    return crear_nova_contribucio()


@contribucions_routes.route("/api/usuari/contribucions", methods=["GET"])
def get_contribucions():
    """
    Endpoint GET per obtenir l'historial de contribucions d'un usuari

    Query params:
    - usuari_id: ID de l'usuari (obligatori)
    - validada: true/false (opcional)
    - limit: límit de resultats (opcional, per defecte 20)
    - offset: offset per paginació (opcional, per defecte 0)
    """
    return obtenir_contribucions_usuari()