from flask import jsonify, request
from models.db_connection import get_new_connection

def crear_missatge_suport():
    """Endpoint per rebre missatges del formulari de contacte"""
    data = request.get_json()
    
    nom = data.get('nom')
    email = data.get('email')
    assumpte_raw = data.get('assumpte')
    missatge = data.get('missatge')
    usuari_id = data.get('usuari_id') # Opcional si l'usuari està loguejat

    if not all([nom, email, assumpte_raw, missatge]):
        return jsonify({'error': 'Tots els camps són obligatoris'}), 400

    # Mapeig de valors del formulari a l'ENUM de la base de dades
    mapeig_categories = {
        'suport': 'tecnic',
        'facturacio': 'pagament',
        'suggeriment': 'general',
        'altres': 'altres'
    }
    categoria = mapeig_categories.get(assumpte_raw, 'general')

    conn = get_new_connection()
    if not conn:
        return jsonify({'error': 'No s\'ha pogut connectar a la base de dades'}), 500

    try:
        cursor = conn.cursor()
        query = """
            INSERT INTO missatges_suport (usuari_id, nom, email, assumpte, missatge, categoria, estat, prioritat)
            VALUES (%s, %s, %s, %s, %s, %s, 'pendent', 'mitjana')
        """
        # Fem servir assumpte_raw com a títol del missatge a la columna 'assumpte' de la BD
        cursor.execute(query, (usuari_id, nom, email, assumpte_raw, missatge, categoria))
        conn.commit()
        cursor.close()
        return jsonify({'message': 'Missatge rebut correctament'}), 201
    except Exception as e:
        print(f"[DB] Error guardant missatge de suport: {e}")
        return jsonify({'error': 'No s\'ha pogut guardar el missatge'}), 500
    finally:
        conn.close()
