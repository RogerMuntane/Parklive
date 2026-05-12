"""
Rutes de l'API per a la gestió del blog de ParkLive.

Inclou la lectura pública d'articles i les operacions administratives
de creació, edició i eliminació de contingut.
"""

from flask import Blueprint
from controllers.blog_controller import (
    get_articles_list,
    get_single_article,
    create_article,
    edit_article,
    remove_article
)

blog_routes = Blueprint("blog", __name__)

@blog_routes.route("/api/blog", methods=["GET"])
def get_blog_list():
    """
    Retorna la llista completa d'articles del blog.

    Returns:
        Response: JSON amb la llista d'articles.
    """
    return get_articles_list()

@blog_routes.route("/api/blog/<slug>", methods=["GET"])
def get_blog_article(slug):
    """
    Obté un article específic del blog mitjançant el seu slug.

    Args:
        slug (str): Identificador amigable de l'article (slug).

    Returns:
        Response: JSON amb l'article detallat.
    """
    return get_single_article(slug)

@blog_routes.route("/api/blog", methods=["POST"])
def post_blog_article():
    """
    Crea un nou article al blog.

    Requereix autenticació d'administrador (gestionat al controlador).

    Returns:
        Response: JSON amb l'article creat.
    """
    return create_article()

@blog_routes.route("/api/blog/<int:article_id>", methods=["PUT"])
def put_blog_article(article_id):
    """
    Actualitza un article existent.

    Args:
        article_id (int): ID de l'article a modificar.

    Returns:
        Response: JSON amb el resultat de l'actualització.
    """
    return edit_article(article_id)

@blog_routes.route("/api/blog/<int:article_id>", methods=["DELETE"])
def delete_blog_article(article_id):
    """
    Elimina un article del blog.

    Args:
        article_id (int): ID de l'article a eliminar.

    Returns:
        Response: JSON amb el resultat de l'eliminació.
    """
    return remove_article(article_id)

@blog_routes.route("/api/storage/blog/<path:filename>", methods=["GET"])
def serve_blog_photo(filename):
    """
    Serveix imatges de portada i contingut del blog.

    Args:
        filename (str): Nom del fitxer d'imatge.

    Returns:
        Response: Fitxer binari de la imatge.
    """
    from flask import send_from_directory
    from pathlib import Path
    import os
    
    base_storage = Path(__file__).parent.parent / "storage"
    blog_dir = base_storage / "blog"
    
    # Comprovar si el fitxer existeix, si no, retornar error 404
    if not (blog_dir / filename).exists():
        return {"success": False, "error": "Imatge no trobada"}, 404
        
    return send_from_directory(blog_dir, filename)
