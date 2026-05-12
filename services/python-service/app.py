"""
Punt d'entrada principal del servei Python (Flask) — ParkLive.

Aquest mòdul s'encarrega de:
  - Carregar la configuració des de variables d'entorn (.env).
  - Inicialitzar la integració de Cloudinary per a la gestió d'imatges.
  - Registrar tots els blueprints de rutes de l'API REST.
  - Configurar la política CORS en funció de l'entorn (dev/producció).
  - Definir gestors d'errors globals (404, 405, 500) que retornen JSON.
  - Assegurar la connexió activa a la base de dades abans de cada petició.

Ús:
    Normalment s'executa via Gunicorn (producció) o directament amb
    `python app.py` (desenvolupament).

Variables d'entorn requerides:
    ALLOWED_ORIGINS       : Orígens CORS permesos (separats per comes).
    APP_ENV               : 'production' | 'development' (default).
    FLASK_PORT            : Port d'escolta en mode dev (default: 5000).
    TICKET_STORAGE_PATH   : Directori d'emmagatzematge de tiquets PDF.
    cloud_name            : Nom del compte Cloudinary.
    Cloudinary_API_KEY    : Clau API de Cloudinary.
    Cloudinary_API_Secret : Secret API de Cloudinary.
"""

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
import logging
import sys
import os
import cloudinary

# ---------------------------------------------------------------------------
# Configuració de logging estructurat
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Càrrega de variables d'entorn
# Primer busquem a l'arrel del projecte (un nivell amunt) i després al directori actual.
# ---------------------------------------------------------------------------
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))
load_dotenv()

# Afegir el directori actual al PYTHONPATH per a imports relatius dels blueprints.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------------------
# Inicialitzar Cloudinary per a la gestió d'imatges
# ---------------------------------------------------------------------------
cloudinary.config(
    cloud_name=os.getenv('cloud_name'),
    api_key=os.getenv('Cloudinary_API_KEY'),
    api_secret=os.getenv('Cloudinary_API_Secret'),
    secure=True
)


# ---------------------------------------------------------------------------
# Inicialització de l'aplicació Flask
# ---------------------------------------------------------------------------
app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False
if hasattr(app, 'json'):
    app.json.ensure_ascii = False

# ---------------------------------------------------------------------------
# Registre de blueprints (rutes de l'API)
# Cada blueprint encapsula un domini funcional independent.
# ---------------------------------------------------------------------------
app.register_blueprint(aparcament_routes)                          # /api/aparcaments
app.register_blueprint(admin_aparcament_routes)                    # /api/admin/aparcaments
app.register_blueprint(reset_routes)                              # /api/reset-password
app.register_blueprint(reserves_routes)                           # /api/reserves
app.register_blueprint(contribucions_routes)                      # /api/contribucions
app.register_blueprint(google_auth_routes)                        # /api/auth/google
app.register_blueprint(stripe_routes)                             # /api/stripe
app.register_blueprint(report_disponibilitat_routes)              # /api/report-disponibilitat
app.register_blueprint(estadistiques_routes)                      # /api/estadistiques
app.register_blueprint(gamificacio_bp, url_prefix='/api/gamificacio')  # /api/gamificacio
app.register_blueprint(faq_routes)                                # /api/faq
app.register_blueprint(blog_routes)                               # /api/blog
app.register_blueprint(suport_routes)                             # /api/suport

logger.info("Blueprints registrats correctament.")

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

# Apliquem CORS després de registrar els blueprints per assegurar que s'aplica a totes les rutes
CORS(app, supports_credentials=True, resources={r"/*": {"origins": _allowed_origins}})


# Health check endpoint per Docker
@app.route('/health', methods=['GET'])
def health():
    """
    Endpoint per verificar l'estat del servei.
    
    Returns:
        tuple: Resposta JSON amb l'estat 'healthy' i codi HTTP 200.
    """
    return jsonify({'status': 'healthy'}), 200


# ---------------------------------------------------------------------------
# Gestors d'errors específics — retornen sempre JSON amb CORS
# ---------------------------------------------------------------------------

@app.errorhandler(404)
def not_found(e):
    """Retorna un JSON 404 quan cap ruta coincideix amb la petició."""
    return jsonify(error="Recurs no trobat", details=str(e)), 404


@app.errorhandler(405)
def method_not_allowed(e):
    """Retorna un JSON 405 quan el mètode HTTP no és permès per la ruta."""
    return jsonify(error="Mètode no permès", details=str(e)), 405


@app.errorhandler(Exception)
def handle_exception(e):
    """
    Gestor d'errors global per a l'aplicació Flask.

    Captura qualsevol excepció no gestionada i la retorna en format JSON,
    garantint que les capçaleres CORS s'apliquin correctament.

    Args:
        e (Exception): L'excepció capturada.

    Returns:
        tuple: Resposta JSON amb descripció de l'error i codi HTTP corresponent.
               - Errors HTTP (werkzeug.HTTPException): retorna el codi i descripció originals.
               - Errors no controlats: retorna 500 amb detalls per a depuració.
    """
    import traceback
    # Delega als gestors específics per a errors HTTP de Werkzeug
    if hasattr(e, 'code') and hasattr(e, 'description'):
        return jsonify(error=str(e.description)), e.code

    # Error intern no controlat (500)
    logger.error("ERROR 500: %s\n%s", str(e), traceback.format_exc())
    return jsonify(error="Error intern del servidor", details=str(e)), 500


@app.before_request
def before_request():
    """
    Hook executat automàticament abans de cada petició HTTP.

    Comprova si la connexió singleton a la base de dades és vàlida i,
    si no ho és (connexió tancada, timeout, etc.), l'intenta reconectar.
    Registra un error si la reconnexió falla, però no atura la petició
    per no bloquejar endpoints que no necessiten DB (com /health).
    """
    try:
        if db.connection is None or not db.connection.is_connected():
            logger.warning("Connexió DB inactiva. Reconnectant...")
            db.connect()
    except Exception as e:
        logger.error("No s'ha pogut reconnectar a la DB: %s", str(e))

if __name__ == "__main__":
    flask_port = int(os.getenv('FLASK_PORT', 5000))
    is_debug = os.getenv('APP_ENV', 'development') != 'production'
    logger.info("Iniciant servidor Flask al port %s (debug=%s)...", flask_port, is_debug)
    app.run(host="0.0.0.0", port=flask_port, debug=is_debug)
