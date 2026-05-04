from models.db_connection import get_new_connection

def get_faqs():
    """
    Obté totes les preguntes freqüents actives, ordenades per categoria i ordre.
    """
    conn = get_new_connection()
    if not conn:
        return []
    
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT id, pregunta, resposta, categoria, ordre
            FROM faqs
            WHERE activa = TRUE
            ORDER BY categoria ASC, ordre ASC
        """
        cursor.execute(query)
        return cursor.fetchall()
    except Exception as e:
        print(f"[ParkLive] Error a get_faqs: {str(e)}")
        return []
    finally:
        cursor.close()
        conn.close()
