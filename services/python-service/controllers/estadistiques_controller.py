"""
estadistiques_controller.py
Controlador per a les estadístiques de l'usuari.
Agrega totes les dades necessàries en una sola resposta JSON.
"""
from flask import jsonify, request
from middleware.jwt_auth import get_jwt_user_id, get_jwt_full_data
from models.estadistiques_model import (
    get_kpis_usuari,
    get_despesa_mensual,
    get_distribucio_tipus_aparcament,
    get_reserves_per_estat,
    get_contribucions_per_tipus,
    get_reserves_per_dia_setmana,
    get_top_aparcaments,
    get_dades_detall,
    get_gamificacio_usuari,
)


def estadistiques_usuari():
    """
    Retorna totes les estadístiques de l'usuari en un únic endpoint agregat.
    Requereix autenticació JWT. L'usuari només pot consultar les seves pròpies dades;
    el rol administrador pot consultar les de qualsevol usuari.
    """
    # 1. Autenticar l'usuari
    try:
        usuari_autenticat_id = get_jwt_user_id()
    except ValueError as e:
        return jsonify({'error': str(e)}), 401

    # 2. Obtenir i validar user_id del query param
    usuari_id_param = request.args.get('user_id')
    if usuari_id_param:
        try:
            usuari_id = int(usuari_id_param)
        except ValueError:
            return jsonify({'error': "El paràmetre 'user_id' ha de ser un enter vàlid"}), 400

        # 3. Verificar propietat o rol admin
        if usuari_id != usuari_autenticat_id:
            try:
                user_data = get_jwt_full_data()
                rol = user_data.get('tipus_usuari', '').lower()
                if rol not in ['administrador', 'admin']:
                    return jsonify({'error': 'No tens permís per veure aquestes estadístiques'}), 403
            except (ValueError, RuntimeError) as e:
                return jsonify({'error': str(e)}), 401
    else:
        usuari_id = usuari_autenticat_id

    try:
        kpis = get_kpis_usuari(usuari_id)
        despesa_mensual = get_despesa_mensual(usuari_id, mesos=8)
        distribucio_tipus = get_distribucio_tipus_aparcament(usuari_id)
        reserves_per_estat = get_reserves_per_estat(usuari_id)
        contribucions_per_tipus = get_contribucions_per_tipus(usuari_id)
        dies_setmana = get_reserves_per_dia_setmana(usuari_id)
        top_aparcaments = get_top_aparcaments(usuari_id, limit=5)
        dades_detall = get_dades_detall(usuari_id)
        gamificacio = get_gamificacio_usuari(usuari_id)

        return jsonify({
            'kpis': kpis,
            'despesa_mensual': despesa_mensual,
            'distribucio_tipus': distribucio_tipus,
            'reserves_per_estat': reserves_per_estat,
            'contribucions_per_tipus': contribucions_per_tipus,
            'dies_setmana': dies_setmana,
            'top_aparcaments': top_aparcaments,
            'dades_detall': dades_detall,
            'gamificacio': gamificacio,
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"[ERROR] estadistiques_usuari: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f"Error obtenint estadístiques: {str(e)}"}), 500
