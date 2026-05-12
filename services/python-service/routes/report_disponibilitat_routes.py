"""
Rutes de l'API per a la gestió de reports de disponibilitat de l'aparcament.

Permet als usuaris reportar incidències o canvis en la disponibilitat real
d'un aparcament i consultar els reports existents.
"""

from flask import Blueprint
from controllers.report_disponibilitat_controller import (
    create_report_disponibilitat_controller,
    list_report_disponibilitat_controller,
)

report_disponibilitat_routes = Blueprint('report_disponibilitat', __name__)


@report_disponibilitat_routes.route('/api/reports/disponibilitat', methods=['POST'])
def create_report_disponibilitat_route():
    """
    Crea un nou report sobre la disponibilitat d'un aparcament.

    Returns:
        Response: JSON amb el resultat de la creació.
    """
    return create_report_disponibilitat_controller()


@report_disponibilitat_routes.route('/api/reports/disponibilitat', methods=['GET'])
def list_report_disponibilitat_route():
    """
    Llista els reports de disponibilitat recents.

    Returns:
        Response: JSON amb la llista de reports.
    """
    return list_report_disponibilitat_controller()