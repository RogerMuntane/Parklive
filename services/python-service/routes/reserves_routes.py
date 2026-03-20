from flask import Blueprint
from controllers.reserves_controller import (
    reserves_usuari_historial,
    totes_reserves,
    reserva_perEstat,
    detall_reserva,
    crear_nova_reserva
)


reserves_routes = Blueprint("reserves", __name__)


@reserves_routes.route("/api/usuari/reserves", methods=["GET"])
def get_usuari_reserves():
    """
    Endpoint GET per obtenir l'historial de reserves d'un usuari

    Query params opcionals:
    - usuari_id: ID de l'usuari (obligatori)
    - estat: pendent, confirmada, en_curs, completada, cancel·lada
    - data_desde: data mínima en format YYYY-MM-DD
    - data_fins: data màxima en format YYYY-MM-DD
    - aparcament_id: filtre per aparcament específic
    - limit: límit de resultats (per defecte 20, màxim 100)
    - offset: offset per paginació (per defecte 0)
    """
    return reserves_usuari_historial()


@reserves_routes.route("/api/reserves", methods=["GET"])
def get_all_reserves():
    """
    Endpoint GET per llistar totes les reserves (admin)

    Query params opcionals:
    - usuari_id: filtre per usuari
    - aparcament_id: filtre per aparcament
    - estat: pendent, confirmada, en_curs, completada, cancel·lada
    - data_desde: data mínima en format YYYY-MM-DD
    - data_fins: data màxima en format YYYY-MM-DD
    - limit: límit de resultats (per defecte 20, màxim 100)
    - offset: offset per paginació (per defecte 0)
    """
    return totes_reserves()


@reserves_routes.route("/api/reserves/estat", methods=["GET"])
def get_reserves_by_estat():
    """
    Endpoint GET per obtenir reserves per estat

    Query params:
    - estat: pendent, confirmada, en_curs, completada, cancel·lada (obligatori)
    - limit: límit de resultats (per defecte 20, màxim 100)
    - offset: offset per paginació (per defecte 0)
    """
    return reserva_perEstat()


@reserves_routes.route("/api/reserves/<int:reserva_id>", methods=["GET"])
def get_reserva_detail(reserva_id):
    """
    Endpoint GET per obtenir el detall d'una reserva específica

    Path param:
    - reserva_id: ID de la reserva
    """
    return detall_reserva(reserva_id)

@reserves_routes.route("/api/reserves", methods=["POST"])
def create_reserva():
    """
    Endpoint POST per crear una nova reserva

    Body JSON:
    {
        "usuari_id": 1,
        "aparcament_id": 5,
        "data_entrada": "2026-03-15 10:00:00",
        "data_sortida": "2026-03-15 18:00:00",
        "preu_total": 24.50,
        "descompte_aplicat": 0.00,
        "notes": "Notes opcionals"
    }
    """
    return crear_nova_reserva()