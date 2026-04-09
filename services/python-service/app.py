from models.db_connection import db
from routes.reset_routes import reset_routes
from routes.aparcament_routes import aparcament_routes
from routes.reserves_routes import reserves_routes
from routes.contribucions_routes import contribucions_routes
from routes.google_auth_routes import google_auth_routes
from routes.stripe_routes import stripe_routes
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import sys
import os

# Carregar variables d'entorn des del fitxer .env (a l'arrel o al directori actual)
# Primer busquem a l'arrel del projecte (un nivell amunt del servei) i després al directori actual
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))
load_dotenv()

# Afegir el directori actual al PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False
if hasattr(app, 'json'):
    app.json.ensure_ascii = False

# Habilitar CORS per permetre peticions del frontend
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Registrar les rutes
app.register_blueprint(aparcament_routes)
app.register_blueprint(reset_routes)
app.register_blueprint(reserves_routes)
app.register_blueprint(contribucions_routes)
app.register_blueprint(google_auth_routes)
app.register_blueprint(stripe_routes)


# Health check endpoint per Docker
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200


# Gestor d'errors global per assegurar que retornem JSON i capçaleres CORS en cas de 500
@app.errorhandler(Exception)
def handle_exception(e):
    # Passa els errors HTTP (404, 405, etc.) tal qual
    if hasattr(e, 'code') and hasattr(e, 'description'):
        return jsonify(error=str(e.description)), e.code
    
    # Per a errors no controlats (500)
    import traceback
    print(f"ERROR 500: {str(e)}")
    traceback.print_exc()
    return jsonify(error="Error intern del servidor", details=str(e)), 500


@app.before_request
def before_request():
    if db.connection is None or not db.connection.is_connected():
        db.connect()


if __name__ == "__main__":
    flask_port = int(os.getenv('FLASK_PORT', 5000))
    app.run(host="0.0.0.0", port=flask_port, debug=True)
