"""
Rutes de l'API per a la gestió administrativa d'aparcaments.

Aquest blueprint defineix els endpoints protegits que permeten als administradors
realitzar operacions CRUD (Crear, Llegir, Actualitzar, Eliminar) sobre la base
de dades d'aparcaments de ParkLive.

Totes les rutes d'aquest fitxer requereixen:
    - Autenticació vàlida (JWT).
    - Rol d'administrador o operador.
"""

from flask import Blueprint
from controllers.admin_aparcament_controller import (
    get_admin_list,
    create_admin,
    update_admin,
    delete_admin,
)
from middleware.jwt_auth import jwt_required, admin_required


admin_aparcament_routes = Blueprint("admin_aparcaments", __name__)


@admin_aparcament_routes.route("/api/admin/aparcaments", methods=["GET"])
@jwt_required
@admin_required
def list_admin_aparcaments():
    """
    Llista tots els aparcaments amb dades administratives.

    Permet obtenir una llista completa per a la gestió del panell d'administració,
    incloent filtres tècnics i estat del sistema.

    Returns:
        Response: Llista d'aparcaments en format JSON.
    """
    return get_admin_list()


@admin_aparcament_routes.route("/api/admin/aparcaments", methods=["POST"])
@jwt_required
@admin_required
def handle_aparcament():
    """
    Gestor d'accions POST per a la gestió d'aparcaments.

    Aquest endpoint actua com a multiplexor segons el paràmetre 'action'
    de la query string per realitzar operacions de creació, edició o esborrat.

    Query Params:
        action (str): 'create', 'update' o 'delete'.

    Returns:
        Response: Resultat de l'operació realitzada.
    """
    from flask import request

    action = request.args.get('action', '')

    if action == 'create':
        return create_admin()
    elif action == 'update':
        return update_admin()
    elif action == 'delete':
        return delete_admin()
    else:
        return {'success': False, 'error': 'Acció no vàlida'}, 400
