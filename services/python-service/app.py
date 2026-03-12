from models.db_connection import db
from routes.reset_routes import reset_routes
from routes.aparcament_routes import aparcament_routes
from routes.reserves_routes import reserves_routes
from routes.contribucions_routes import contribucions_routes
from routes.google_auth_routes import google_auth_routes
from flask import Flask, jsonify
from flask_cors import CORS
import sys
import os

# Afegir el directori actual al PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


app = Flask(__name__)

# Habilitar CORS per permetre peticions del frontend
frontend_port = os.getenv('FRONTEND_PORT', '3000')
CORS(app, origins=[
    f"http://localhost:{frontend_port}",
    f"http://127.0.0.1:{frontend_port}",
])

# Registrar les rutes
app.register_blueprint(aparcament_routes)
app.register_blueprint(reset_routes)
app.register_blueprint(reserves_routes)
app.register_blueprint(contribucions_routes)
app.register_blueprint(google_auth_routes)


# Health check endpoint per Docker
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200


@app.before_request
def before_request():
    if db.connection is None or not db.connection.is_connected():
        db.connect()


if __name__ == "__main__":
    flask_port = int(os.getenv('FLASK_PORT', 5000))
    app.run(host="0.0.0.0", port=flask_port, debug=True)
