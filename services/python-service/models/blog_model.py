"""
Model per a la gestió del blog.

Aquest mòdul gestiona els articles del blog: llistat, lectura per slug/ID,
creació, actualització i eliminació.
"""

from models.db_connection import get_new_connection

def get_all_articles(publicats_nomes=True):
    """
    Retorna la llista d'articles del blog amb informació de l'autor.
    
    Args:
        publicats_nomes (bool): Si és True, només retorna articles amb publicat=True.
        
    Returns:
        list: Llista de diccionaris amb les dades dels articles.
    """
    conn = get_new_connection()
    if not conn:
        return []
    
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT a.*, u.nom as autor_nom, u.cognoms as autor_cognoms 
            FROM articles_blog a
            JOIN usuaris u ON a.autor_id = u.id
        """
        if publicats_nomes:
            query += " WHERE a.publicat = TRUE "
        query += " ORDER BY a.data_publicacio DESC, a.created_at DESC"
        
        cursor.execute(query)
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

def get_article_by_slug(slug, update_visits=False):
    """
    Retorna un article concret identificat pel seu slug (URL amigable).
    
    Args:
        slug (str): L'identificador de l'article.
        update_visits (bool): Si és True, incrementa el comptador de visites.
        
    Returns:
        dict|None: Les dades de l'article o None si no es troba.
    """
    conn = get_new_connection()
    if not conn:
        return None
    
    cursor = conn.cursor(dictionary=True)
    try:
        # Actualitzar visites si es demana
        if update_visits:
            cursor.execute("UPDATE articles_blog SET visites = visites + 1 WHERE slug = %s", (slug,))
            conn.commit()
            
        query = """
            SELECT a.*, u.nom as autor_nom, u.cognoms as autor_cognoms 
            FROM articles_blog a
            JOIN usuaris u ON a.autor_id = u.id
            WHERE a.slug = %s
        """
        cursor.execute(query, (slug,))
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

def get_article_by_id(article_id):
    """
    Retorna un article concret identificat pel seu ID numèric.
    
    Args:
        article_id (int): ID de l'article.
        
    Returns:
        dict|None: Les dades de l'article o None si no es troba.
    """
    conn = get_new_connection()
    if not conn:
        return None
    
    cursor = conn.cursor(dictionary=True)
    try:
        query = "SELECT * FROM articles_blog WHERE id = %s"
        cursor.execute(query, (article_id,))
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()

def insert_article(data, autor_id):
    """
    Insereix un nou article a la base de dades.
    
    Args:
        data (dict): Dades de l'article (titol, slug, contingut, etc.).
        autor_id (int): ID de l'usuari que crea l'article.
        
    Returns:
        int: L'ID de l'article acabat de crear.
        
    Raises:
        Exception: Si hi ha un error de connexió o d'inserció.
    """
    conn = get_new_connection()
    if not conn:
        raise Exception("Error de connexió a la BD")
    
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            INSERT INTO articles_blog (titol, slug, contingut, resum, autor_id, categoria, imatge_destacada, publicat, data_publicacio)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            data.get('titol'),
            data.get('slug'),
            data.get('contingut'),
            data.get('resum'),
            autor_id,
            data.get('categoria', 'altres'),
            data.get('imatge_destacada'),
            data.get('publicat', False),
            data.get('data_publicacio') if data.get('publicat') else None
        ))
        conn.commit()
        return cursor.lastrowid
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def update_article(article_id, data):
    """
    Actualitza les dades d'un article existent.
    
    Args:
        article_id (int): ID de l'article a modificar.
        data (dict): Nous valors per als camps de l'article.
        
    Returns:
        bool: True si s'ha actualitzat almenys una fila.
    """
    conn = get_new_connection()
    if not conn:
        raise Exception("Error de connexió a la BD")
    
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            UPDATE articles_blog 
            SET titol = %s, slug = %s, contingut = %s, resum = %s, 
                categoria = %s, imatge_destacada = %s, publicat = %s, data_publicacio = %s
            WHERE id = %s
        """
        cursor.execute(query, (
            data.get('titol'),
            data.get('slug'),
            data.get('contingut'),
            data.get('resum'),
            data.get('categoria', 'altres'),
            data.get('imatge_destacada'),
            data.get('publicat', False),
            data.get('data_publicacio'),
            article_id
        ))
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def delete_article(article_id):
    """
    Elimina permanentment un article pel seu ID.
    
    Args:
        article_id (int): ID de l'article a esborrar.
        
    Returns:
        bool: True si l'eliminació ha estat exitosa.
    """
    conn = get_new_connection()
    if not conn:
        raise Exception("Error de connexió a la BD")
    
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM articles_blog WHERE id = %s", (article_id,))
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

