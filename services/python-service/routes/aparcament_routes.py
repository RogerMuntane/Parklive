from flask import Blueprint
from controllers.aparcament_controller import list_aparcaments, get_aparcament_detail, search_aparcaments


aparcament_routes = Blueprint("aparcaments", __name__)


@aparcament_routes.route("/api/aparcaments", methods=["GET"])
def get_aparcaments():
    """Endpoint GET per llistar tots els aparcaments"""
    return list_aparcaments()


@aparcament_routes.route("/api/aparcaments/cerca", methods=["GET"])
def cerca_aparcaments():
    """Endpoint GET per cercar aparcaments amb filtres

    Query params disponibles:
    - ciutat: text per filtrar per ciutat
    - tipus: carrer, cobert, aire_lliure, subterrani, parking_public, parking_privat
    - estat: actiu, inactiu, manteniment, complet
    - tarifa_hora_min: preu mínim per hora
    - tarifa_hora_max: preu màxim per hora
    - tarifa_dia_min: preu mínim per dia 
    - tarifa_dia_max: preu màxim per dia
    - accessibilitat: true/false
    - carrega_electrica: true/false
    - videovigilancia: true/false
    - obert_24h: true/false
    - valoracio_min: valoració mínima (0-5)
    - latitud: latitud per cerca geogràfica
    - longitud: longitud per cerca geogràfica
    - radi_km: radi en km per cerca geogràfica (per defecte 10)
    - limite: límit de resultats (per defecte 20, màxim 100)
    - offset: offset per paginació (per defecte 0)
    """
    return search_aparcaments()


@aparcament_routes.route("/api/aparcaments/<int:id>", methods=["GET"])
def get_aparcament(id):
    """Endpoint GET per obtenir detall d'un aparcament"""
    return get_aparcament_detail(id)
