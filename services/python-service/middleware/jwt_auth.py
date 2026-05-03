import os
import jwt
import time
from flask import request

def generate_jwt_token(user):
    """
    Genera un token JWT equivalent al de PHP.
    
    :param user: Diccionari amb les dades de l'usuari (minim 'id').
    :return: String amb el token JWT.
    """
    secret_key = os.getenv('JWT_SECRET', 'default_secret_key_needs_to_be_replaced')
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
        secret_key = os.getenv('JWT_SECRET', 'default_secret_key_needs_to_be_replaced')
        
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
    
    # Fallback insegur per mantenir retrocompatibilitat transitòria si és necessari
    if fallback_to_header:
        user_id_value = request.headers.get('X-User-ID')
        if user_id_value:
            try:
                return int(user_id_value)
            except (TypeError, ValueError):
                pass
                
    raise ValueError("Cal iniciar sessió (Token no trobat)")
