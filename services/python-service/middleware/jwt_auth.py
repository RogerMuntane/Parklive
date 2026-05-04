import os
import jwt
import time
from flask import request

def _get_secret():
    """Obté el secret JWT des de l'entorn. Llança RuntimeError si no està configurat."""
    secret = os.getenv('JWT_SECRET')
    if not secret:
        raise RuntimeError(
            "JWT_SECRET no està configurat. Defineix la variable d'entorn al fitxer .env."
        )
    return secret

def generate_jwt_token(user):
    """
    Genera un token JWT equivalent al de PHP.
    
    :param user: Diccionari amb les dades de l'usuari (minim 'id').
    :return: String amb el token JWT.
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
    Retorna l'ID de l'usuari si és vàlid, o llança ValueError si no ho és.
    
    :param fallback_to_header: Si és True, permetrà utilitzar X-User-ID si no hi ha Bearer (per transició).
                               Per seguretat, s'hauria de posar a False quan tot estigui migrat.
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
    Extreu i valida el JWT. Retorna el diccionari 'data' del payload
    (id, nom, email, tipus_usuari). Llança ValueError si el token no és vàlid.
    Útil per a comprovar el rol de l'usuari autenticat.
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
