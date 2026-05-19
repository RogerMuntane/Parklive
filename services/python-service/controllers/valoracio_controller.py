"""
Controlador per a la gestió de valoracions d'aparcaments.

Gestiona la creació, consulta i actualització de ressenyes d'usuaris.
Inclou processament d'imatges via Cloudinary (amb fallback Pillow local)
i serveix les imatges optimitzades des del directori storage/valoracions.
"""
import os
import uuid
import hashlib
import json
import logging
import requests as http_requests
import cloudinary.uploader
from flask import request, jsonify, send_from_directory
from pathlib import Path
from PIL import Image
from werkzeug.utils import secure_filename

# Configurar logger per a fallades de Cloudinary (valoracions)
log_dir = Path(__file__).parent.parent / "logs"
log_dir.mkdir(parents=True, exist_ok=True)
log_file = log_dir / "valoracio_images.log"

logging.basicConfig(
    filename=str(log_file),
    level=logging.ERROR,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def _process_valoracio_image(file_obj):
    """
    Optimitza i desa una imatge de valoració en format WebP.

    Puja la imatge a Cloudinary per aplicar transformació q_auto + f_webp,
    la descarrega i la desa localment a storage/valoracions/. Si Cloudinary
    falla, usa Pillow com a fallback per optimitzar localment.

    Args:
        file_obj (FileStorage): Objecte fitxer de la petició multipart.

    Returns:
        str|None: Nom del fitxer WebP desat localment, o None si falla tot el procés.
    """
    if not file_obj or not file_obj.filename:
        return None

    try:
        base_storage = Path(__file__).parent.parent / "storage"
        valoracions_dir = base_storage / "valoracions"
        valoracions_dir.mkdir(parents=True, exist_ok=True)

        # Generar nom segur amb hash basat en el contingut aproximat (nom + tamany)
        file_obj.seek(0, os.SEEK_END)
        file_size = file_obj.tell()
        file_obj.seek(0)

        random_hash = hashlib.md5(
            f"{file_obj.filename}_{file_size}".encode()
        ).hexdigest()[:8]

        # Guardem com a webp per defecte per optimitzar espai
        safe_filename = f"val_{random_hash}_{uuid.uuid4().hex[:6]}.webp"
        target_path = valoracions_dir / safe_filename

        cloud_public_id = f"parklive_valoracions/val_{random_hash}"

        try:
            # 1. Pujar a Cloudinary → transformació q_auto + f_webp
            file_obj.seek(0)
            upload_result = cloudinary.uploader.upload(
                file_obj,
                public_id=cloud_public_id,
                overwrite=True,
                resource_type='image',
                format='webp',
                transformation=[{'quality': 'auto', 'fetch_format': 'webp'}]
            )
            optimized_url = upload_result.get('secure_url')

            # 2. Descarregar la versió optimitzada i desar localment
            img_response = http_requests.get(optimized_url, timeout=30)
            img_response.raise_for_status()
            with open(target_path, 'wb') as out_file:
                out_file.write(img_response.content)

        except Exception as cloud_err:
            # FALLBACK: Si falla Cloudinary, optimitzem localment amb Pillow
            logger.error(f"Error Cloudinary (valoracio image): {str(cloud_err)}")

            file_obj.seek(0)
            img = Image.open(file_obj)

            # Convertir a RGB/RGBA si cal per desar com a WebP
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGBA")
            else:
                img = img.convert("RGB")

            # Desar localment com a WebP optimitzat
            img.save(target_path, "WEBP", quality=80)

        return safe_filename
    except Exception as e:
        logger.error(f"Error crític processant imatge valoracio: {str(e)}")
        return None

def serve_valoracio_photo(filename):
    """
    GET /api/valoracions/foto/<filename> - Serveix una imatge de valoració.

    Args:
        filename (str): Nom del fitxer WebP dins del directori storage/valoracions.

    Returns:
        Response: Contingut de la imatge amb el content-type correcte.
        JSON 404: Si la imatge no existeix al directori.
    """
    try:
        # Ruta absoluta al directori de valoracions
        base_storage = Path(__file__).parent.parent / "storage"
        valoracions_dir = base_storage / "valoracions"

        return send_from_directory(str(valoracions_dir), filename)
    except Exception as e:
        print(f"[ParkLive] Error servint foto de valoració: {e}")
        return jsonify({"error": "Imatge no trobada"}), 404

from models.db_connection import get_new_connection
from models.valoracio_model import add_valoracio
from controllers.aparcament_controller import _get_authenticated_user_id
def update_valoracio(valoracio_id, puntuacio, comentari=None):
    """
    Actualitza la puntuació i el comentari d'una valoració existent.

    Comprova que l'usuari autenticat via JWT és el propietari de la valoració
    abans d'aplicar cap canvi.

    Args:
        valoracio_id (int): ID de la valoració a modificar.
        puntuacio (int): Nova puntuació (1-5).
        comentari (str|None): Nou text del comentari (opcional).

    Returns:
        JSON 200: Confirmació de l'actualització.
        JSON 401: Si el JWT falta o és invàlid.
        JSON 403: Si l'usuari no és el propietari de la valoració.
        JSON 404: Si la valoració no existeix.
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
    POST /api/aparcaments/<id>/valoracions - Crea una nova valoració.

    Accepta tant peticions multipart/form-data (amb imatges) com JSON pur.
    Processa un màxim de 3 imatges adjuntes i les desa en WebP optimitzat.

    Args:
        aparcament_id (int|str): ID de l'aparcament a valorar (de l'URL).

    Body (multipart o JSON):
        puntuacio (int): Puntuació entre 1 i 5 (obligatori).
        comentari (str|None): Text de la ressenya (opcional).
        aspectes_valorats (list|None): Aspectes seleccionats en JSON (opcional).
        fotos_url[] (File[]): Fins a 3 imatges adjuntes (opcional, només multipart).

    Returns:
        JSON 201: ID de la valoració creada.
        JSON 400: Si la puntuació falta, està fora de rang o l'ID d'aparcament és invàlid.
        JSON 401: Si el JWT falta o és invàlid.
        JSON 500: Error intern del servidor.
    """
    try:
        # Determinar si és multipart o json
        is_multipart = request.content_type and request.content_type.startswith('multipart/form-data')

        if is_multipart:
            data = request.form.to_dict()
            aspectes_raw = data.get('aspectes_valorats')
            aspectes_valorats = json.loads(aspectes_raw) if aspectes_raw else []

            fotos_url = []
            # 'fotos_url[]' o 'fotos_url'
            files = request.files.getlist('fotos_url[]') if 'fotos_url[]' in request.files else request.files.getlist('fotos_url')

            if files:
                for file_obj in files[:3]:
                    processed_filename = _process_valoracio_image(file_obj)
                    if processed_filename:
                        fotos_url.append(processed_filename)
        else:
            if not request.is_json:
                return jsonify({"success": False, "error": "El format de la petició no és vàlid"}), 400
            data = request.get_json()
            aspectes_valorats = data.get('aspectes_valorats', [])
            fotos_url = []

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

        valoracio_id = add_valoracio(usuari_id, aparcament_id, puntuacio, comentari, aspectes_valorats, fotos_url)

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
    PUT /api/aparcaments/<id>/valoracions - Actualitza la valoració de l'usuari autenticat.

    Cerca la valoració existent de l'usuari per a l'aparcament i la modifica.
    Delega l'actualització efectiva a la funció `update_valoracio`.

    Args:
        aparcament_id (int|str): ID de l'aparcament (de l'URL).

    Body JSON:
        puntuacio (int): Nova puntuació entre 1 i 5 (obligatori).
        comentari (str|None): Nou comentari (opcional).

    Returns:
        JSON 200: Confirmació de l'actualització.
        JSON 400: Si la puntuació és invàlida o el cos no és JSON.
        JSON 401: Si el JWT falta o és invàlid.
        JSON 404: Si l'usuari no ha valorat previàment aquest aparcament.
        JSON 500: Error intern del servidor.
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
