"""
Controlador per a la gestió de missatges de suport/contacte.

Gestiona el formulari de contacte de l'aplicació, mapejant les categories
del formulari als valors ENUM de la base de dades i persistent els missatges
a la taula `missatges_suport` amb estat inicial 'pendent'.
"""

from flask import jsonify, request
from models.db_connection import get_new_connection


def crear_missatge_suport():
    """
    POST /api/suport - Processa i desa un missatge del formulari de contacte.

    Accepta un JSON amb els camps del formulari i mapeja l'assumpte enviat
    pel frontend al valor ENUM corresponent de la base de dades.

    Body JSON:
        nom (str): Nom del remitent.
        email (str): Correu electrònic del remitent.
        assumpte (str): Categoria del formulari ('suport', 'facturacio', 'suggeriment', 'altres').
        missatge (str): Contingut del missatge.
        usuari_id (int|None): ID de l'usuari si està autenticat (opcional).

    Returns:
        JSON 201: Confirmació de recepció correcta.
        JSON 400: Si falten camps obligatoris.
        JSON 500: Si hi ha error de connexió o d'inserció a la BD.
    """
    data = request.get_json()

    nom = data.get('nom')
    email = data.get('email')
    assumpte_raw = data.get('assumpte')
    missatge = data.get('missatge')
    usuari_id = data.get('usuari_id')  # Opcional si l'usuari està autenticat

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
        return jsonify({'error': "No s'ha pogut connectar a la base de dades"}), 500

    try:
        cursor = conn.cursor()
        query = """
            INSERT INTO missatges_suport (usuari_id, nom, email, assumpte, missatge, categoria, estat, prioritat)
            VALUES (%s, %s, %s, %s, %s, %s, 'pendent', 'mitjana')
        """
        # assumpte_raw s'usa com a títol a la columna 'assumpte'; categoria deriva el tipus ENUM
        cursor.execute(query, (usuari_id, nom, email, assumpte_raw, missatge, categoria))
        conn.commit()
        cursor.close()
        return jsonify({'message': 'Missatge rebut correctament'}), 201
    except Exception as e:
        print(f"[DB] Error guardant missatge de suport: {e}")
        return jsonify({'error': "No s'ha pogut guardar el missatge"}), 500
    finally:
        conn.close()
