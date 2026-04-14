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
    """Endpoint per l'historial d'un usuari"""
    return reserves_usuari_historial()

@reserves_routes.route("/api/reserves", methods=["GET"])
def get_all_reserves():
    """Endpoint per llistar totes les reserves (admin)"""
    return llistar_reserves()

@reserves_routes.route("/api/reserves/<int:reserva_id>", methods=["GET"])
def get_reserva_detail(reserva_id):
    """Endpoint pel detall d'una reserva"""
    return detall_reserva(reserva_id)

@reserves_routes.route("/api/reserves", methods=["POST"])
def create_reserva():
    """Endpoint per crear una nova reserva"""
    return crear_nova_reserva()

@reserves_routes.route("/api/reserves/<int:reserva_id>/pdf", methods=["GET"])
def download_reserva_pdf(reserva_id):
    """Endpoint per descarregar el tiquet PDF de la reserva"""
    return get_tiquet_pdf(reserva_id)

@reserves_routes.route("/api/reserves/<int:reserva_id>/tiquet/pujar", methods=["POST"])
def upload_reserva_pdf(reserva_id):
    """Endpoint per pujar el tiquet PDF generat al frontend"""
    return pujar_tiquet_pdf(reserva_id)

@reserves_routes.route("/api/reserves/<int:reserva_id>/cancel", methods=["POST"])
def cancel_reserva(reserva_id):
    """Endpoint per analitzar i cancel·lar una reserva"""
    return cancelar_reserva_usuari(reserva_id)