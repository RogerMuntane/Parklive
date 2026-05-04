from flask import jsonify, request
from models.blog_model import (
    get_all_articles, 
    get_article_by_slug, 
    get_article_by_id, 
    insert_article, 
    update_article, 
    delete_article
)
from controllers.aparcament_controller import _get_authenticated_user_id
from models.db_connection import get_new_connection

def _is_admin(user_id):
    """Verifica si l'usuari és administrador."""
    conn = get_new_connection()
    if not conn:
        return False
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT tipus_usuari FROM usuaris WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        return user and user['tipus_usuari'] == 'admin'
    finally:
        cursor.close()
        conn.close()

def get_articles_list():
    """Obtenir tots els articles (públics si no s'és admin)."""
    try:
        # Intentem obtenir l'usuari actual si n'hi ha
        try:
            user_id = _get_authenticated_user_id()
            is_admin = _is_admin(user_id)
        except Exception:
            is_admin = False
            
        # Si és admin mostrem tots, si no només els publicats
        publicats_nomes = not is_admin
        
        articles = get_all_articles(publicats_nomes=publicats_nomes)
        
        # Convertim dades de datetime a format ISO
        for a in articles:
            if a.get('data_publicacio'):
                a['data_publicacio'] = a['data_publicacio'].isoformat()
            if a.get('created_at'):
                a['created_at'] = a['created_at'].isoformat()
            if a.get('updated_at'):
                a['updated_at'] = a['updated_at'].isoformat()
                
        return jsonify({"success": True, "data": articles}), 200
    except Exception as e:
        print(f"[Blog] Error obtenint llista: {str(e)}")
        return jsonify({"success": False, "error": "Error intern del servidor"}), 500

def get_single_article(slug):
    """Obtenir un article pel seu slug."""
    try:
        # Aquesta funció s'usa en la pàgina de detall (la gent ho llegeix), per tant incrementem visites
        article = get_article_by_slug(slug, update_visits=True)
        if not article:
            return jsonify({"success": False, "error": "Article no trobat"}), 404
            
        if article.get('data_publicacio'):
            article['data_publicacio'] = article['data_publicacio'].isoformat()
        if article.get('created_at'):
            article['created_at'] = article['created_at'].isoformat()
            
        return jsonify({"success": True, "data": article}), 200
    except Exception as e:
        print(f"[Blog] Error obtenint article: {str(e)}")
        return jsonify({"success": False, "error": "Error intern del servidor"}), 500

def create_article():
    """Crea un nou article (només admins)."""
    try:
        try:
            user_id = _get_authenticated_user_id()
            if not _is_admin(user_id):
                return jsonify({"success": False, "error": "Accés denegat: No ets administrador"}), 403
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 401
            
        data = request.get_json()
        if not data or not data.get('titol') or not data.get('slug'):
            return jsonify({"success": False, "error": "Títol i slug obligatoris"}), 400
            
        # Comprovar si l'slug ja existeix
        existent = get_article_by_slug(data['slug'])
        if existent:
            return jsonify({"success": False, "error": "Aquest slug ja està en ús"}), 400
            
        new_id = insert_article(data, user_id)
        return jsonify({"success": True, "message": "Article creat", "id": new_id}), 201
    except Exception as e:
        print(f"[Blog] Error creant article: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

def edit_article(article_id):
    """Actualitza un article existent (només admins)."""
    try:
        try:
            user_id = _get_authenticated_user_id()
            if not _is_admin(user_id):
                return jsonify({"success": False, "error": "Accés denegat"}), 403
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 401
            
        data = request.get_json()
        if not data or not data.get('titol') or not data.get('slug'):
            return jsonify({"success": False, "error": "Títol i slug obligatoris"}), 400
            
        # Comprovar que si canviem slug no tapi un altre article
        existent = get_article_by_slug(data['slug'])
        if existent and str(existent['id']) != str(article_id):
            return jsonify({"success": False, "error": "L'slug ja està en ús per un altre article"}), 400
            
        success = update_article(article_id, data)
        if success:
            return jsonify({"success": True, "message": "Article actualitzat"}), 200
        else:
            return jsonify({"success": False, "error": "No s'ha pogut actualitzar"}), 400
    except Exception as e:
        print(f"[Blog] Error actualitzant article: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

def remove_article(article_id):
    """Elimina un article (només admins)."""
    try:
        try:
            user_id = _get_authenticated_user_id()
            if not _is_admin(user_id):
                return jsonify({"success": False, "error": "Accés denegat"}), 403
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 401
            
        success = delete_article(article_id)
        if success:
            return jsonify({"success": True, "message": "Article eliminat"}), 200
        else:
            return jsonify({"success": False, "error": "No s'ha pogut eliminar o no existeix"}), 404
    except Exception as e:
        print(f"[Blog] Error eliminant article: {str(e)}")
        return jsonify({"success": False, "error": "Error intern del servidor"}), 500
