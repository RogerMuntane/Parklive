import os
from flask import Flask
from routes.aparcament_routes import aparcament_routes
from routes.reset_routes import reset_routes
from models.db_connection import db


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
