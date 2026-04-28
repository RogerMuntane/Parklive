from flask import Blueprint
from controllers.aparcament_controller import (
    list_aparcaments,
    get_aparcament_detail,
    search_aparcaments,
    add_aparcament_favorit,
    remove_aparcament_favorit,
    list_aparcaments_favorits_usuari,
    get_disponibilitat_franja,
)


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


@aparcament_routes.route("/api/aparcaments/<int:id>/disponibilitat", methods=["GET"])
def get_aparcament_disponibilitat(id):
    """Endpoint GET per obtenir places disponibles per una franja horària.

    Query params:
    - data_entrada: inici de la franja (YYYY-MM-DD HH:MM o YYYY-MM-DD HH:MM:SS)
    - data_sortida: fi de la franja (YYYY-MM-DD HH:MM o YYYY-MM-DD HH:MM:SS)
    """
    return get_disponibilitat_franja(id)


@aparcament_routes.route("/api/usuari/favorits", methods=["GET"])
def get_usuari_favorits():
    """Endpoint GET per llistar favorits d'un usuari autenticat"""
    return list_aparcaments_favorits_usuari()


@aparcament_routes.route("/api/usuari/favorits", methods=["POST"])
def add_usuari_favorit():
    """Endpoint POST per afegir un aparcament a favorits"""
    return add_aparcament_favorit()


@aparcament_routes.route("/api/usuari/favorits/<int:aparcament_id>", methods=["DELETE"])
def delete_usuari_favorit(aparcament_id):
    """Endpoint DELETE per eliminar un aparcament de favorits"""
    return remove_aparcament_favorit(aparcament_id)
