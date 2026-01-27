from flask import Flask
from routes.aparcament_routes import aparcament_routes

app = Flask(__name__)

# Registrar les rutes
app.register_blueprint(aparcament_routes)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
