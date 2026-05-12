"""
Middleware d'autenticació i autorització basat en JWT.

Aquest mòdul proporciona funcions per generar, extreure i validar tokens JWT,
així com decoradors per protegir les rutes de Flask segons el rol de l'usuari.
"""

import os
import jwt
import time
from flask import request
from functools import wraps
from flask import jsonify

def _get_secret():
    """
    Obté el secret JWT des de les variables d'entorn.
    
    Returns:
        str: El secret configurat.
        
    Raises:
        RuntimeError: Si JWT_SECRET no està configurat al fitxer .env.
    """
    secret = os.getenv('JWT_SECRET')
    if not secret:
        raise RuntimeError(
            "JWT_SECRET no està configurat. Defineix la variable d'entorn al fitxer .env."
        )
    return secret

def generate_jwt_token(user):
    """
    Genera un token JWT equivalent al de PHP.
    
    El token inclou dades bàsiques de l'usuari i metadades estàndard (iat, iss, exp).

    Args:
        user (dict): Diccionari amb les dades de l'usuari (minim 'id').
        
    Returns:
        str: El token JWT generat.
    """
    secret_key = _get_secret()
    issued_at = int(time.time())
    expire = issued_at + 3600  # 1 hora

    # Intenta obtenir el server_name de request si estem dins d'un context Flask,
    # sinó usa un valor per defecte com PHP
    try:
        server_name = request.host
    except Exception:
        server_name = 'parklive.local'

    payload = {
        'iat': issued_at,
        'iss': server_name,
        'nbf': issued_at,
        'exp': expire,
        'sub': user.get('id'),
        'data': {
            'id': user.get('id'),
            'nom': user.get('nom', ''),
            'email': user.get('email', ''),
            'tipus_usuari': user.get('tipus_usuari', 'basic')
        }
    }

    token = jwt.encode(payload, secret_key, algorithm="HS256")
    return token

def get_jwt_user_id(fallback_to_header=False):
    """
    Extreu i valida el token JWT de la capçalera Authorization: Bearer <token>.
    
    Args:
        fallback_to_header (bool): Depreccat. Si és True, permetia l'ús de X-User-ID.

    Returns:
        int: L'ID de l'usuari autenticat.
        
    Raises:
        ValueError: Si el token falta, és invàlid o ha caducat.
    """
    auth_header = request.headers.get('Authorization')

    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        secret_key = _get_secret()

        try:
            # Utilitzem decode amb els mateixos algoritmes que usa PHP per defecte
            decoded = jwt.decode(token, secret_key, algorithms=["HS256"])
            user_data = decoded.get('data', {})
            user_id = user_data.get('id')

            if user_id:
                return int(user_id)
            else:
                raise ValueError("Token JWT vàlid però no conté ID d'usuari")

        except jwt.ExpiredSignatureError:
            raise ValueError("El token d'autenticació ha caducat. Torna a iniciar sessió.")
        except jwt.InvalidTokenError:
            raise ValueError("Token d'autenticació invàlid.")

    # DEPRECAT: El fallback X-User-ID ha estat eliminat per seguretat.
    # Tot l'accés requereix un Bearer JWT vàlid.
    raise ValueError("Cal iniciar sessió (Token no trobat)")


def get_jwt_full_data():
    """
    Extreu i valida el JWT, retornant totes les dades del payload.

    Returns:
        dict: Diccionari 'data' del payload (id, nom, email, tipus_usuari).
        
    Raises:
        ValueError: Si el token falta o és invàlid.
    """
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        secret_key = _get_secret()
        try:
            decoded = jwt.decode(token, secret_key, algorithms=["HS256"])
            return decoded.get('data', {})
        except jwt.ExpiredSignatureError:
            raise ValueError("El token d'autenticació ha caducat. Torna a iniciar sessió.")
        except jwt.InvalidTokenError:
            raise ValueError("Token d'autenticació invàlid.")
    raise ValueError("Cal iniciar sessió (Token no trobat)")


def jwt_required(f):
    """
    Decorador per requerir que l'usuari estigui autenticat amb un JWT vàlid.
    
    Args:
        f (function): La funció (ruta) a protegir.
        
    Returns:
        function: La funció decorada que verifica l'autenticació abans d'executar-se.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            get_jwt_user_id()  # Validar JWT
            return f(*args, **kwargs)
        except ValueError as e:
            return jsonify({'success': False, 'error' : str(e)}), 401
    return decorated_function


def admin_required(f):
    """
    Decorador per requerir que l'usuari tingui el rol d'administrador o operador.
    
    Args:
        f (function): La funció (ruta) a protegir.
        
    Returns:
        function: La funció decorada que verifica els permisos abans d'executar-se.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            user_data = get_jwt_full_data()
            user_role = user_data.get('tipus_usuari', '').lower()

            # Acceptar 'admin', 'administrador' o 'operador'
            if user_role not in ['admin', 'administrador', 'operador']:
                return jsonify({
                    'success': False,
                    'error': 'No tens permisos per realitzar aquesta acció'
                }), 403

            return f(*args, **kwargs)
        except ValueError as e:
            return jsonify({'success': False, 'error': str(e)}), 401
    return decorated_function

