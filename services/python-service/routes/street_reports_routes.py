from flask import Blueprint
from controllers.street_reports_controller import (
    create_street_availability_report,
    list_street_availability_reports,
)

street_reports_routes = Blueprint('street_reports', __name__)


@street_reports_routes.route('/api/reports/street-availability', methods=['POST'])
def create_street_report_route():
    return create_street_availability_report()


@street_reports_routes.route('/api/reports/street-availability', methods=['GET'])
def list_street_reports_route():
    return list_street_availability_reports()
