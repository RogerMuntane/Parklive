"""
Rutes de l'API per a la consulta pública i gestió d'usuaris d'aparcaments.

Defineix els endpoints per a la cerca geogràfica, detalls tècnics, disponibilitat
en temps real i gestió de favorits/valoracions per part dels usuaris.
"""

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
from controllers.valoracio_controller import create_valoracio, update_user_valoracio, serve_valoracio_photo


aparcament_routes = Blueprint("aparcaments", __name__)


@aparcament_routes.route("/api/aparcaments", methods=["GET"])
def get_aparcaments():
    """
    Retorna la llista global d'aparcaments.

    Returns:
        Response: JSON amb la llista d'aparcaments actius.
    """
    return list_aparcaments()


@aparcament_routes.route("/api/aparcaments/cerca", methods=["GET"])
def cerca_aparcaments():
    """
    Cerca avançada d'aparcaments amb filtres i geolocalització.


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
    """
    Obté el detall complet d'un aparcament específic.

    Args:
        id (int): Identificador de l'aparcament.

    Returns:
        Response: JSON amb les dades detallades de l'aparcament.
    """
    return get_aparcament_detail(id)


@aparcament_routes.route("/api/aparcaments/<int:id>/disponibilitat", methods=["GET"])
def get_aparcament_disponibilitat(id):
    """
    Consulta la disponibilitat de places per a una franja horària.


    Query params:
    - data_entrada: inici de la franja (YYYY-MM-DD HH:MM o YYYY-MM-DD HH:MM:SS)
    - data_sortida: fi de la franja (YYYY-MM-DD HH:MM o YYYY-MM-DD HH:MM:SS)
    """
    return get_disponibilitat_franja(id)


@aparcament_routes.route("/api/usuari/favorits", methods=["GET"])
def get_usuari_favorits():
    """
    Llista els aparcaments favorits de l'usuari autenticat.

    Returns:
        Response: JSON amb la llista de favorits.
    """
    return list_aparcaments_favorits_usuari()


@aparcament_routes.route("/api/usuari/favorits", methods=["POST"])
def add_usuari_favorit():
    """
    Afegeix un aparcament a la llista de favorits de l'usuari.

    Returns:
        Response: JSON amb el resultat de l'operació.
    """
    return add_aparcament_favorit()


@aparcament_routes.route("/api/usuari/favorits/<int:aparcament_id>", methods=["DELETE"])
def delete_usuari_favorit(aparcament_id):
    """
    Elimina un aparcament dels favorits de l'usuari.

    Args:
        aparcament_id (int): ID de l'aparcament a eliminar.

    Returns:
        Response: JSON amb el resultat de l'operació.
    """
    return remove_aparcament_favorit(aparcament_id)


@aparcament_routes.route("/api/aparcaments/<int:id>/valoracions", methods=["POST"])
def post_valoracio(id):
    """
    Crea una nova valoració (ressenya) per a un aparcament.

    Args:
        id (int): ID de l'aparcament a valorar.

    Returns:
        Response: JSON amb la nova valoració creada.
    """
    return create_valoracio(id)

@aparcament_routes.route("/api/aparcaments/<int:id>/valoracions/<int:valoracio_id>", methods=["PUT"])
def put_valoracio(id, valoracio_id):
    """
    Actualitza una valoració existent realitzada per l'usuari.

    Args:
        id (int): ID de l'aparcament.
        valoracio_id (int): ID de la valoració a editar.

    Returns:
        Response: JSON amb la valoració actualitzada.
    """
    return update_user_valoracio(id)

@aparcament_routes.route("/api/storage/valoracions/<filename>", methods=["GET"])
def get_valoracio_foto(filename):
    """
    Serveix fitxers d'imatge associats a les valoracions.

    Args:
        filename (str): Nom del fitxer d'imatge.

    Returns:
        Response: El fitxer d'imatge sol·licitat.
    """
    return serve_valoracio_photo(filename)

