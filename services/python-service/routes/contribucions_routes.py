"""
Rutes de l'API per a la gestió de contribucions ciutadanes.

Permet als usuaris reportar l'estat d'ocupació de zones d'aparcament al carrer
i consultar l'historial de les seves pròpies aportacions.
"""

from flask import Blueprint
from controllers.contribucions_controller import (
    crear_nova_contribucio,
    obtenir_contribucions_usuari
)


contribucions_routes = Blueprint("contribucions", __name__)


@contribucions_routes.route("/api/contribucions", methods=["POST"])
def create_contribucio():
    """
    Registra una nova contribució de l'usuari sobre l'estat d'un aparcament.

    Endpoint POST per reportar una nova contribució

    Body JSON:
    {
        "usuari_id": 1,
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
    Consulta l'historial de contribucions d'un usuari amb filtres.

    Endpoint GET per obtenir l'historial de contribucions d'un usuari

    Query params:
    - usuari_id: ID de l'usuari (obligatori)
    - validada: true/false (opcional)
    - limit: límit de resultats (opcional, per defecte 20)
    - offset: offset per paginació (opcional, per defecte 0)
    """
    return obtenir_contribucions_usuari()