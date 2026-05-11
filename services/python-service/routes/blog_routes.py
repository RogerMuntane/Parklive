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
    return get_articles_list()

@blog_routes.route("/api/blog/<slug>", methods=["GET"])
def get_blog_article(slug):
    return get_single_article(slug)

@blog_routes.route("/api/blog", methods=["POST"])
def post_blog_article():
    return create_article()

@blog_routes.route("/api/blog/<int:article_id>", methods=["PUT"])
def put_blog_article(article_id):
    return edit_article(article_id)

@blog_routes.route("/api/blog/<int:article_id>", methods=["DELETE"])
def delete_blog_article(article_id):
    return remove_article(article_id)

@blog_routes.route("/api/storage/blog/<path:filename>", methods=["GET"])
def serve_blog_photo(filename):
    from flask import send_from_directory
    from pathlib import Path
    import os
    
    base_storage = Path(__file__).parent.parent / "storage"
    blog_dir = base_storage / "blog"
    
    # Comprovar si el fitxer existeix, si no, retornar error 404
    if not (blog_dir / filename).exists():
        return {"success": False, "error": "Imatge no trobada"}, 404
        
    return send_from_directory(blog_dir, filename)
