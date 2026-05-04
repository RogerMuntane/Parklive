from flask import jsonify, request
from models.db_connection import get_new_connection
from models.valoracio_model import add_valoracio
from controllers.aparcament_controller import _get_authenticated_user_id
def update_valoracio(valoracio_id, puntuacio, comentari=None):
    """
    Actualitza una valoració existent.
    Verifica que l'usuari autenticat sigui el propietari de la valoració.
    """
    try:
        usuari_id = _get_authenticated_user_id()
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 401

    conn = get_new_connection()
    if not conn:
        raise Exception("No s'ha pogut establir connexió amb la base de dades")

    cursor = conn.cursor(dictionary=True)
    try:
        # Verificar propietat
        cursor.execute("SELECT usuari_id FROM valoracions WHERE id = %s", (valoracio_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"success": False, "error": "Valoració no trobada"}), 404
        if row['usuari_id'] != usuari_id:
            return jsonify({"success": False, "error": "No tens permís per editar aquesta valoració"}), 403

        # Actualitzar
        query = """
            UPDATE valoracions
            SET puntuacio = %s, comentari = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """
        cursor.execute(query, (puntuacio, comentari, valoracio_id))
        conn.commit()
        return jsonify({"success": True, "message": "Valoració actualitzada correctament"}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def create_valoracio(aparcament_id):
    """
    Controlador per crear una nova valoració per a un aparcament.
    """
    try:
        if not request.is_json:
            return jsonify({"success": False, "error": "El contingut ha de ser JSON"}), 400
            
        data = request.get_json()
        puntuacio = data.get('puntuacio')
        comentari = data.get('comentari')
        
        if not puntuacio:
            return jsonify({"success": False, "error": "La puntuació és obligatòria"}), 400
            
        try:
            puntuacio = int(puntuacio)
            if puntuacio < 1 or puntuacio > 5:
                raise ValueError()
        except (ValueError, TypeError):
            return jsonify({"success": False, "error": "La puntuació ha de ser un número entre 1 i 5"}), 400
            
        try:
            usuari_id = _get_authenticated_user_id()
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 401
            
        try:
            aparcament_id = int(aparcament_id)
        except (ValueError, TypeError):
            return jsonify({"success": False, "error": "ID d'aparcament no vàlid"}), 400
            
        valoracio_id = add_valoracio(usuari_id, aparcament_id, puntuacio, comentari)
        
        return jsonify({
            "success": True,
            "message": "Valoració creada correctament",
            "id": valoracio_id
        }), 201
        
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        print(f"[ParkLive] Error a create_valoracio: {str(e)}")
        return jsonify({"success": False, "error": "S'ha produït un error al servidor"}), 500


def update_user_valoracio(aparcament_id):
    """
    Actualitza la valoració d'un usuari per a un aparcament existent.
    Busca la valoració del usuari i la actualitza.
    """
    try:
        if not request.is_json:
            return jsonify({"success": False, "error": "El contingut ha de ser JSON"}), 400
        
        data = request.get_json()
        puntuacio = data.get('puntuacio')
        comentari = data.get('comentari')
        if not puntuacio:
            return jsonify({"success": False, "error": "La puntuació és obligatòria"}), 400
        
        try:
            puntuacio = int(puntuacio)
            if puntuacio < 1 or puntuacio > 5:
                raise ValueError()
        except (ValueError, TypeError):
            return jsonify({"success": False, "error": "La puntuació ha de ser un número entre 1 i 5"}), 400
        
        try:
            usuari_id = _get_authenticated_user_id()
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 401
        
        try:
            aparcament_id = int(aparcament_id)
        except (ValueError, TypeError):
            return jsonify({"success": False, "error": "ID d'aparcament no vàlid"}), 400
        
        # Buscar valoració existent
        from models.valoracio_model import get_valoracions_aparcament
        valoracions = get_valoracions_aparcament(aparcament_id, limit=1000)
        user_val = next((v for v in valoracions if v.get('usuari_id') == usuari_id), None)
        if not user_val:
            return jsonify({"success": False, "error": "Valoració no existent"}), 404
        
        # Actualitzar
        result = update_valoracio(user_val['id'], puntuacio, comentari)
        # result is a Flask response already
        return result
    except Exception as e:
        print(f"[ParkLive] Error a update_user_valoracio: {str(e)}")
        return jsonify({"success": False, "error": "Error intern"}), 500
