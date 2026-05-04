from models.db_connection import db
from routes.reset_routes import reset_routes
from routes.aparcament_routes import aparcament_routes
from routes.admin_aparcament_routes import admin_aparcament_routes
from routes.reserves_routes import reserves_routes
from routes.contribucions_routes import contribucions_routes
from routes.google_auth_routes import google_auth_routes
from routes.stripe_routes import stripe_routes
from routes.report_disponibilitat_routes import report_disponibilitat_routes
from routes.estadistiques_routes import estadistiques_routes
from routes.gamificacio_routes import gamificacio_bp
from routes.faq_routes import faq_routes
from routes.blog_routes import blog_routes
from routes.suport_routes import suport_routes
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

# Habilitar CORS per permetre peticions del frontend amb credencials
# Llegim els orígens permesos des de la variable d'entorn ALLOWED_ORIGINS (separats per comes).
# En dev (APP_ENV != 'production'), si ALLOWED_ORIGINS és buit, fem fallback als ports locals.
_raw_origins = os.getenv('ALLOWED_ORIGINS', '')
if _raw_origins:
    _allowed_origins = [o.strip() for o in _raw_origins.split(',') if o.strip()]
elif os.getenv('APP_ENV', 'development') != 'production':
    # Fallback per a entorns de dev sense ALLOWED_ORIGINS configurat
    _allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
else:
    # En producció sense ALLOWED_ORIGINS configurat: no es permet cap origen
    _allowed_origins = []

CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": _allowed_origins}})

# Registrar les rutes
app.register_blueprint(aparcament_routes)
app.register_blueprint(admin_aparcament_routes)
app.register_blueprint(reset_routes)
app.register_blueprint(reserves_routes)
app.register_blueprint(contribucions_routes)
app.register_blueprint(google_auth_routes)
app.register_blueprint(stripe_routes)
app.register_blueprint(report_disponibilitat_routes)
app.register_blueprint(estadistiques_routes)
app.register_blueprint(gamificacio_bp, url_prefix='/api/gamificacio')
app.register_blueprint(faq_routes)
app.register_blueprint(blog_routes)
app.register_blueprint(suport_routes)


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


from flask import Flask, jsonify, request

@app.before_request
def before_request():
    if db.connection is None or not db.connection.is_connected():
        db.connect()

if __name__ == "__main__":
    flask_port = int(os.getenv('FLASK_PORT', 5000))
    app.run(host="0.0.0.0", port=flask_port, debug=True)
