"""
Model per a la gestió de les Preguntes Freqüents (FAQs).

Aquest mòdul permet recuperar la llista de preguntes i respostes d'ajuda
configurades al sistema per a la seva visualització al frontend.
"""

from models.db_connection import get_new_connection


def get_faqs():
    """
    Obté totes les preguntes freqüents actives configurades a la base de dades.
    
    Les preguntes es filtren per l'estat 'activa' i s'ordenen jeràrquicament
    per la seva categoria i, posteriorment, pel camp 'ordre' definit per 
    l'administrador.

    Returns:
        list[dict]: Llista de diccionaris que contenen 'id', 'pregunta', 
                    'resposta', 'categoria' i 'ordre'. Retorna una llista 
                    buida en cas d'error o si no n'hi ha cap de disponible.
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
        faqs = cursor.fetchall()
        return faqs
    except Exception as e:
        print(f"[ParkLive] Error a get_faqs: {str(e)}")
        return []
    finally:
        cursor.close()
        conn.close()
