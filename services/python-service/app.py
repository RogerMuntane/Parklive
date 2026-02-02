from models.db_connection import db
from routes.reset_routes import reset_routes
from routes.aparcament_routes import aparcament_routes
from flask import Flask
import sys
import os

# Afegir el directori actual al PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


app = Flask(__name__)

# Registrar les rutes
app.register_blueprint(aparcament_routes)
app.register_blueprint(reset_routes)

# Connectar a la base de dades a l'inici


@app.before_request
def before_request():
    if db.connection is None or not db.connection.is_connected():
        db.connect()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
