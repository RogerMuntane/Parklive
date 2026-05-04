"""
Rutas admin per gestionar aparcaments (CRUD + uploads).
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
    """Llistar aparcaments amb filtres i paginació (admin)"""
    return get_admin_list()


@admin_aparcament_routes.route("/api/admin/aparcaments", methods=["POST"])
@jwt_required
@admin_required
def handle_aparcament():
    """Crear o actualitzar aparcament (admin)"""
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
