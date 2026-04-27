from flask import Blueprint
from controllers.report_disponibilitat_controller import (
    create_report_disponibilitat_controller,
    list_report_disponibilitat_controller,
)

report_disponibilitat_routes = Blueprint('report_disponibilitat', __name__)


@report_disponibilitat_routes.route('/api/reports/disponibilitat', methods=['POST'])
def create_report_disponibilitat_route():
    return create_report_disponibilitat_controller()


@report_disponibilitat_routes.route('/api/reports/disponibilitat', methods=['GET'])
def list_report_disponibilitat_route():
    return list_report_disponibilitat_controller()