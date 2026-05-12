"""
Model per a la gestió administrativa dels aparcaments.

Aquest mòdul gestiona les operacions CRUD (Crear, Llegir, Actualitzar, Esborrar)
d'aparcaments des d'una perspectiva d'administració. Inclou lògica complexa
per al processament d'imatges mitjançant Cloudinary per a l'optimització (WebP)
i el posterior emmagatzematge local de les versions optimitzades.
"""

from models.db_connection import get_new_connection
from shared.serializers import serialize_rows
import os
from pathlib import Path
import hashlib
import cloudinary.uploader
import requests as http_requests
import logging
from PIL import Image

# Configurar logger per a fallades de Cloudinary
log_file = Path(__file__).parent.parent.parent / "logs" / "image_processing.log"
# Ens assegurem que el directori existeix
log_file.parent.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    filename=str(log_file),
    level=logging.ERROR,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants de configuració per a imatges
MAX_PARKING_IMAGES = 10
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/webp'}


def get_admin_aparcaments(search='', tipo='', status='', limit=10, offset=0):
    """
    Obté una llista d'aparcaments amb filtres i paginació per al panell d'administració.
    
    Args:
        search (str): Text per cercar per nom, adreça o ciutat.
        tipo (str): Filtre per tipus d'aparcament.
        status (str): Filtre per estat (actiu, inactiu).
        limit (int): Nombre màxim de resultats.
        offset (int): Desplaçament per a la paginació.
        
    Returns:
        list: Llista de diccionaris amb les dades dels aparcaments.
    """
    conn = get_new_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        query = "SELECT * FROM aparcaments WHERE 1=1"
        params = []

        if search:
            query += " AND (nom LIKE %s OR adreca LIKE %s OR ciutat LIKE %s)"
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])

        if tipo:
            query += " AND tipus = %s"
            params.append(tipo)

        if status:
            query += " AND estat = %s"
            params.append(status)

        query += " ORDER BY id DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cursor.execute(query, params)
        parkings = cursor.fetchall()

        return serialize_rows(parkings) if parkings else []
    finally:
        cursor.close()
        conn.close()


def count_admin_aparcaments(search='', tipo='', status=''):
    """
    Compta el nombre total d'aparcaments que coincideixen amb els filtres.
    
    Args:
        search (str): Text de cerca.
        tipo (str): Filtre de tipus.
        status (str): Filtre d'estat.
        
    Returns:
        int: Total d'aparcaments trobats.
    """
    conn = get_new_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        query = "SELECT COUNT(*) as total FROM aparcaments WHERE 1=1"
        params = []

        if search:
            query += " AND (nom LIKE %s OR adreca LIKE %s OR ciutat LIKE %s)"
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])

        if tipo:
            query += " AND tipus = %s"
            params.append(tipo)

        if status:
            query += " AND estat = %s"
            params.append(status)

        cursor.execute(query, params)
        result = cursor.fetchone()

        return result['total'] if result else 0
    finally:
        cursor.close()
        conn.close()


def create_aparcament(data):
    """
    Crea un nou aparcament a la base de dades.
    
    Args:
        data (dict): Dades de l'aparcament (nom, adreça, coordenades, tarifes, etc.).
        
    Returns:
        int: L'ID de l'aparcament creat.
        
    Raises:
        Exception: Si hi ha un error en la transacció o la inserció.
    """
    conn = get_new_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        conn.start_transaction()

        query = """
            INSERT INTO aparcaments (
                nom, tipus, adreca, ciutat, codi_postal, latitud, longitud,
                capacitat_total, places_disponibles, tarifa_hora, tarifa_dia,
                horari_obertura, horari_tancament, obert_24h, accessibilitat,
                carrega_electrica, videovigilancia, altura_maxima, estat, verificat
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s, %s
            )
        """

        obert_24h = 1 if str(data.get('obert_24h', '0')) == '1' else 0
        accessibilitat = 1 if str(data.get('accessibilitat', '0')) == '1' else 0
        carrega_electrica = 1 if str(data.get('carrega_electrica', '0')) == '1' else 0
        videovigilancia = 1 if str(data.get('videovigilancia', '0')) == '1' else 0
        verificat = 1 if str(data.get('verificat', '0')) == '1' else 0

        capacitat_total = int(data.get('capacitat_total', 0))
        places_disponibles = int(data.get('places_disponibles', capacitat_total))

        cursor.execute(query, (
            data.get('nom'),
            data.get('tipus'),
            data.get('adreca'),
            data.get('ciutat'),
            data.get('codi_postal', ''),
            float(data.get('latitud', 0)),
            float(data.get('longitud', 0)),
            capacitat_total,
            places_disponibles,
            float(data.get('tarifa_hora')) if data.get('tarifa_hora') else None,
            float(data.get('tarifa_dia')) if data.get('tarifa_dia') else None,
            data.get('horari_obertura') if not obert_24h else None,
            data.get('horari_tancament') if not obert_24h else None,
            obert_24h,
            accessibilitat,
            carrega_electrica,
            videovigilancia,
            float(data.get('altura_maxima')) if data.get('altura_maxima') else None,
            data.get('estat', 'actiu'),
            verificat
        ))

        parking_id = cursor.lastrowid
        conn.commit()

        return parking_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()


def update_aparcament(parking_id, data):
    """
    Actualitza les dades d'un aparcament existent.
    
    Args:
        parking_id (int): ID de l'aparcament a modificar.
        data (dict): Nous valors per als camps de l'aparcament.
        
    Returns:
        bool: True si l'actualització ha estat exitosa.
    """
    conn = get_new_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        conn.start_transaction()

        query = """
            UPDATE aparcaments SET
                nom = %s, tipus = %s, adreca = %s, ciutat = %s,
                codi_postal = %s, latitud = %s, longitud = %s,
                capacitat_total = %s, places_disponibles = %s,
                tarifa_hora = %s, tarifa_dia = %s,
                horari_obertura = %s, horari_tancament = %s,
                obert_24h = %s, accessibilitat = %s,
                carrega_electrica = %s, videovigilancia = %s,
                altura_maxima = %s, estat = %s, verificat = %s
            WHERE id = %s
        """

        obert_24h = 1 if str(data.get('obert_24h', '0')) == '1' else 0
        accessibilitat = 1 if str(data.get('accessibilitat', '0')) == '1' else 0
        carrega_electrica = 1 if str(data.get('carrega_electrica', '0')) == '1' else 0
        videovigilancia = 1 if str(data.get('videovigilancia', '0')) == '1' else 0
        verificat = 1 if str(data.get('verificat', '0')) == '1' else 0

        capacitat_total = int(data.get('capacitat_total', 0))
        places_disponibles = int(data.get('places_disponibles', capacitat_total))

        cursor.execute(query, (
            data.get('nom'),
            data.get('tipus'),
            data.get('adreca'),
            data.get('ciutat'),
            data.get('codi_postal', ''),
            float(data.get('latitud', 0)),
            float(data.get('longitud', 0)),
            capacitat_total,
            places_disponibles,
            float(data.get('tarifa_hora')) if data.get('tarifa_hora') else None,
            float(data.get('tarifa_dia')) if data.get('tarifa_dia') else None,
            data.get('horari_obertura') if not obert_24h else None,
            data.get('horari_tancament') if not obert_24h else None,
            obert_24h,
            accessibilitat,
            carrega_electrica,
            videovigilancia,
            float(data.get('altura_maxima')) if data.get('altura_maxima') else None,
            data.get('estat', 'actiu'),
            verificat,
            parking_id
        ))

        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()


def delete_aparcament(parking_id):
    """
    Elimina un aparcament i les seves fotografies associades tant de la BD com del disc.
    
    Args:
        parking_id (int): ID de l'aparcament a esborrar.
        
    Returns:
        bool: True si s'ha eliminat correctament.
    """
    conn = get_new_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        conn.start_transaction()

        # Eliminar fotos del disc abans d'eliminar el registre de la BD
        delete_parking_photos_from_disk(parking_id)

        query = "DELETE FROM aparcaments WHERE id = %s"
        cursor.execute(query, (parking_id,))

        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()


def count_parking_photos(parking_id):
    """
    Retorna el nombre de fotografies que té un aparcament.
    """
    conn = get_new_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        query = "SELECT COUNT(*) as total FROM fotografies_aparcaments WHERE aparcament_id = %s"
        cursor.execute(query, (parking_id,))
        result = cursor.fetchone()

        return result['total'] if result else 0
    finally:
        cursor.close()
        conn.close()


def save_parking_images(parking_id, files, user_id=None):
    """
    Processa i guarda múltiples imatges per a un aparcament.
    
    El procés segueix aquests passos per a cada fitxer:
    1. Validació de tipus MIME i mida.
    2. Pujada a Cloudinary per a l'optimització (conversió a WebP i qualitat automàtica).
    3. Descàrrega de la versió optimitzada des de Cloudinary.
    4. Emmagatzematge local de la imatge optimitzada.
    5. Inserció de la ruta relativa a la base de dades.
    6. Fallback a processament local amb Pillow si Cloudinary falla.

    Args:
        parking_id (int): ID de l'aparcament.
        files (dict|list): Fitxers provinents de la petició multipart.
        user_id (int|None): ID de l'usuari que realitza la pujada.
        
    Returns:
        list: Llista de les URLs relatives de les imatges guardades.
        
    Raises:
        ValueError: Si se supera el màxim d'imatges o el format és invàlid.
        Exception: Per errors en el sistema de fitxers o base de dades.
    """

    if not files:
        return []

    # Normalitzar a llista si és un dict multipart de Flask
    files_list = []
    if hasattr(files, 'getlist'):
        files_list = files.getlist('parking_images[]')
    elif isinstance(files, dict) and 'parking_images[]' in files:
        file_obj = files['parking_images[]']
        files_list = file_obj if isinstance(file_obj, list) else [file_obj]
    elif isinstance(files, list):
        files_list = files

    # Filtrar fitxers buits
    files_list = [f for f in files_list if f and f.filename]

    if not files_list:
        return []

    if len(files_list) > MAX_PARKING_IMAGES:
        raise ValueError(f"Només es poden pujar un màxim de {MAX_PARKING_IMAGES} imatges.")

    existing_count = count_parking_photos(parking_id)
    if (existing_count + len(files_list)) > MAX_PARKING_IMAGES:
        raise ValueError(
            f"Aquest aparcament ja té {existing_count} imatges. "
            f"El màxim permès és {MAX_PARKING_IMAGES}."
        )

    # Preparar directori de destí
    base_storage = Path(__file__).parent.parent / "storage"
    parking_dir = base_storage / "aparcaments" / str(parking_id)

    try:
        parking_dir.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        raise Exception(f"No s'ha pogut crear el directori de les imatges: {str(e)}")

    saved_urls = []
    conn = get_new_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        conn.start_transaction()

        ordre = existing_count + 1
        for file_obj in files_list:
            # Validar tipus MIME
            mime_type = file_obj.content_type or 'application/octet-stream'
            if mime_type not in ALLOWED_MIME_TYPES:
                raise ValueError(
                    f"Format no permès per {file_obj.filename}. "
                    f"Només JPG, PNG i WebP."
                )

            # Validar mida
            file_obj.seek(0, 2)
            file_size = file_obj.tell()
            file_obj.seek(0)

            if file_size > MAX_IMAGE_SIZE_BYTES:
                raise ValueError(
                    f"La imatge {file_obj.filename} supera la mida màxima de 5MB."
                )

            # Generar nom de fitxer i rutes
            random_hash = hashlib.md5(
                f"{parking_id}_{ordre}_{file_size}".encode()
            ).hexdigest()[:8]
            safe_filename = f"parking_{parking_id}_{random_hash}.webp"
            target_path = parking_dir / safe_filename
            relative_url = f"/storage/aparcaments/{parking_id}/{safe_filename}"
            cloud_public_id = f"parklive_tmp/parking_{parking_id}_{random_hash}"

            try:
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
                    # FALLBACK: Optimització local amb Pillow
                    logger.error(f"Error Cloudinary (parking {parking_id}): {str(cloud_err)}")
                    
                    file_obj.seek(0)
                    img = Image.open(file_obj)
                    if img.mode in ("RGBA", "P"):
                        img = img.convert("RGBA")
                    else:
                        img = img.convert("RGB")
                    img.save(target_path, "WEBP", quality=80)
            finally:
                pass

            # 4. Inserir registre a BD amb la ruta local
            query = """
                INSERT INTO fotografies_aparcaments
                (aparcament_id, usuari_id, url, verificada, ordre)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(query, (
                parking_id,
                user_id,
                relative_url,
                1,  # verificada=true per imatges d'admin
                ordre
            ))

            saved_urls.append(relative_url)
            ordre += 1

        conn.commit()
    except Exception as e:
        conn.rollback()
        # Neteja de fitxers si la transacció falla
        for url in saved_urls:
            try:
                file_path = Path(f"services/python-service/{url}")
                if file_path.exists():
                    file_path.unlink()
            except:
                pass
        raise e
    finally:
        cursor.close()
        conn.close()

    return saved_urls


def delete_parking_photos_from_disk(parking_id):
    """
    Elimina físicament totes les fotografies d'un aparcament del disc dur.
    
    Args:
        parking_id (int): ID de l'aparcament del qual es volen esborrar les fotos.
    """
    try:
        base_storage = Path(__file__).parent.parent / "storage"
        parking_dir = base_storage / "aparcaments" / str(parking_id)

        if parking_dir.exists():
            for file in parking_dir.glob("*"):
                file.unlink()
            parking_dir.rmdir()
    except Exception as e:
        print(f"Error netejar fotos de {parking_id}: {str(e)}")
        pass

