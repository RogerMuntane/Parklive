"""
Rutes de l'API per a la gestió de reserves d'aparcament.

Aquest blueprint gestiona tot el cicle de vida d'una reserva: creació,
consulta d'historial per a l'usuari, gestió de tiquets PDF i cancel·lacions.
"""

from flask import Blueprint
from controllers.reserves_controller import (
    reserves_usuari_historial,
    llistar_reserves,
    detall_reserva,
    crear_nova_reserva,
    get_tiquet_pdf,
    cancelar_reserva_usuari,
    pujar_tiquet_pdf
)

reserves_routes = Blueprint("reserves", __name__)

@reserves_routes.route("/api/usuari/reserves", methods=["GET"])
def get_usuari_reserves():
    """
    Llista l'historial complet de reserves de l'usuari autenticat.

    Returns:
        Response: JSON amb el llistat de reserves de l'usuari.
    """
    return reserves_usuari_historial()

@reserves_routes.route("/api/reserves", methods=["GET"])
def get_all_reserves():
    """
    Llista totes les reserves del sistema (ús administratiu).

    Returns:
        Response: JSON amb totes les reserves existents.
    """
    return llistar_reserves()

@reserves_routes.route("/api/reserves/<int:reserva_id>", methods=["GET"])
def get_reserva_detail(reserva_id):
    """
    Obté la informació detallada d'una reserva específica.

    Args:
        reserva_id (int): ID de la reserva.

    Returns:
        Response: JSON amb les dades de la reserva.
    """
    return detall_reserva(reserva_id)

@reserves_routes.route("/api/reserves", methods=["POST"])
def create_reserva():
    """
    Crea una nova reserva d'aparcament.

    Returns:
        Response: JSON amb la reserva creada.
    """
    return crear_nova_reserva()

@reserves_routes.route("/api/reserves/<int:reserva_id>/pdf", methods=["GET"])
def download_reserva_pdf(reserva_id):
    """
    Genera i serveix el tiquet en format PDF per a una reserva.

    Args:
        reserva_id (int): ID de la reserva.

    Returns:
        Response: El fitxer PDF del tiquet.
    """
    return get_tiquet_pdf(reserva_id)

@reserves_routes.route("/api/reserves/<int:reserva_id>/tiquet/pujar", methods=["POST"])
def upload_reserva_pdf(reserva_id):
    """
    Pujar un tiquet PDF pre-generat (fallback o administratiu).

    Args:
        reserva_id (int): ID de la reserva.

    Returns:
        Response: Resultat de la pujada.
    """
    return pujar_tiquet_pdf(reserva_id)

@reserves_routes.route("/api/reserves/<int:reserva_id>/cancel", methods=["POST"])
def cancel_reserva(reserva_id):
    """
    Analitza les condicions i executa la cancel·lació d'una reserva.

    Args:
        reserva_id (int): ID de la reserva a cancel·lar.

    Returns:
        Response: Resultat de la cancel·lació.
    """
    return cancelar_reserva_usuari(reserva_id)