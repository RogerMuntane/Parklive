"""
Model per a la gestió de reports de disponibilitat al carrer (crowdsourcing).

Permet als usuaris reportar l'estat (lliure/ocupat) de places d'aparcament
al carrer en temps real. Inclou validació de coordenades, control de cooldown
per evitar enviaments massius, i integració amb el model de contribucions
per persistir els reports a la base de dades.

Constants:
    COOLDOWN_SECONDS (int): Temps mínim entre dos reports del mateix usuari (60 s).
    VALID_STATUS (set): Estats vàlids en format API ('available', 'occupied').
    STATUS_TO_DB (dict): Mapatge de l'API a la BD ('available' → 'lliure').
    DB_TO_STATUS (dict): Mapatge invers de la BD a l'API.
"""

import json
from datetime import datetime, timezone
from models.db_connection import get_new_connection
from models.contribucions_model import crear_contribucio

VALID_STATUS = {'available', 'occupied'}
STATUS_TO_DB = {
    'available': 'lliure',
    'occupied': 'ocupat',
}
DB_TO_STATUS = {
    'lliure': 'available',
    'ocupat': 'occupied',
}
DEFAULT_REPORT_DISPONIBILITAT_USER_ID = 1

COOLDOWN_SECONDS = 60


class CooldownError(ValueError):
    """
    Error llançat quan un usuari intenta enviar un report massa aviat.

    Args:
        seconds_left (int|float): Segons que falten per poder enviar un nou report.
    """

    def __init__(self, seconds_left):
        self.seconds_left = int(max(1, seconds_left))
        super().__init__(
            f'Has enviado un reporte hace poco. Espera {self.seconds_left}s antes de enviar otro.'
        )


def _normalize_comment(value):
    """
    Normalitza el comentari a una cadena buida si és None o converteix a string.

    Args:
        value (Any): El valor del comentari.

    Returns:
        str: Cadena neta o buida.
    """
    if value is None:
        return ''
    return str(value).strip()


def _extract_iso_datetime(value):
    """
    Converteix un valor a datetime si és una cadena ISO 8601 vàlida.

    Args:
        value (Any): Valor a convertir.

    Returns:
        datetime|None: Objecte datetime o None si el valor és invàlid.
    """
    if not value:
        return None

    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None


def _to_comparable_datetime(value):
    """
    Normalitza un datetime a UTC sense informació de zona horària per a comparacions.

    Args:
        value (Any): Valor a normalitzar.

    Returns:
        datetime|None: Datetime naive en UTC o None si el tipus és incorrecte.
    """
    if not isinstance(value, datetime):
        return None

    if value.tzinfo is None:
        return value

    return value.astimezone(timezone.utc).replace(tzinfo=None)


def _get_last_report_for_reporter(reporter_key):
    """
    Consulta l'últim report enviat per un reporter_key específic.

    Args:
        reporter_key (str): Clau única d'identificació del reporter (anònim o autenticat).

    Returns:
        dict|None: Registre amb 'id' i 'created_at' o None si no hi ha reports anteriors.
    """
    if not reporter_key:
        return None

    conn = get_new_connection()
    if not conn:
        return None
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT id, created_at
            FROM contribucions
            WHERE JSON_UNQUOTE(JSON_EXTRACT(dades, '$.reporter_key')) = %s
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (reporter_key,),
        )
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()


def _validate_cooldown(reporter_key, now_dt):
    """
    Comprova que han passat almenys COOLDOWN_SECONDS des de l'últim report.

    Args:
        reporter_key (str): Clau del reporter a verificar.
        now_dt (datetime): Moment actual per al càlcul del temps transcorregut.

    Raises:
        CooldownError: Si no han passat prou segons des de l'últim report.
    """
    last_report = _get_last_report_for_reporter(reporter_key)
    if not last_report:
        return

    created_at = _to_comparable_datetime(_extract_iso_datetime(last_report.get('created_at')))
    if not created_at:
        return

    current = _to_comparable_datetime(now_dt)
    if not current:
        return

    elapsed_seconds = (current - created_at).total_seconds()
    if elapsed_seconds >= COOLDOWN_SECONDS:
        return

    raise CooldownError(COOLDOWN_SECONDS - elapsed_seconds)


def _parse_status(raw_status):
    """
    Valida i normalitza l'estat rebut per l'API.

    Args:
        raw_status (str): Valor en brut ('available', 'occupied').

    Returns:
        str: Estat normalitzat i validat.

    Raises:
        ValueError: Si l'estat no és un dels valors permesos.
    """
    status = str(raw_status or '').strip().lower()
    if status not in VALID_STATUS:
        raise ValueError('status ha de ser "available" o "occupied"')
    return status


def _parse_coordinates(raw_lat, raw_lon):
    """
    Valida i converteix les coordenades geogràfiques a float arrodonits.

    Args:
        raw_lat (Any): Latitud en brut.
        raw_lon (Any): Longitud en brut.

    Returns:
        tuple[float, float]: (latitud, longitud) arrodonits a 6 decimals.

    Raises:
        ValueError: Si les coordenades falten, no son numèriques, o estan fora de rang.
    """
    if raw_lat is None or raw_lon is None:
        raise ValueError('latitud i longitud són obligatoris')

    try:
        lat = float(raw_lat)
        lon = float(raw_lon)
    except (TypeError, ValueError):
        raise ValueError('latitud i longitud han de ser numèrics')

    if lat < -90 or lat > 90:
        raise ValueError('latitud fora de rang')
    if lon < -180 or lon > 180:
        raise ValueError('longitud fora de rang')

    return round(lat, 6), round(lon, 6)


def _parse_user_id(raw_user_id):
    """
    Extreu l'ID d'usuari de la petició o retorna l'usuari anònim per defecte.

    Args:
        raw_user_id (Any): ID d'usuari en brut.

    Returns:
        int: ID vàlid o DEFAULT_REPORT_DISPONIBILITAT_USER_ID si no s'ha proporcionat.

    Raises:
        ValueError: Si el valor proporcionat no és convertible a int.
    """
    if raw_user_id is not None and str(raw_user_id).strip() != '':
        try:
            return int(raw_user_id)
        except (TypeError, ValueError):
            raise ValueError('usuari_id ha de ser numèric')

    return DEFAULT_REPORT_DISPONIBILITAT_USER_ID


def _insert_report_disponibilitat_row(user_id, status, report_payload, lat, lon):
    """
    Delega la inserció del report al model de contribucions.

    Args:
        user_id (int): ID de l'usuari reporter.
        status (str): Estat en format API ('available'/'occupied').
        report_payload (dict): Dades addicionals (comentari, reporter_key).
        lat (float): Latitud de la ubicació.
        lon (float): Longitud de la ubicació.

    Returns:
        dict: Registre creat amb id, coordenades, estat i dades.
    """
    contribucio = crear_contribucio({
        'usuari_id': user_id,
        'estat_reportat': STATUS_TO_DB[status],
        'dades': report_payload,
        'latitud': lat,
        'longitud': lon,
    })

    return {
        'id': contribucio.get('id'),
        'usuari_id': contribucio.get('usuari', {}).get('id'),
        'estat_reportat': contribucio.get('estat_reportat'),
        'latitud': contribucio.get('coordenades', {}).get('latitud'),
        'longitud': contribucio.get('coordenades', {}).get('longitud'),
        'dades': contribucio.get('dades') or {},
        'created_at': contribucio.get('created_at'),
    }


def _build_report_disponibilitat_response(created, reporter_key, fallback_created_at):
    """
    Construeix el diccionari de resposta normalitzat per a l'API.

    Args:
        created (dict): Registre de contribució creat o recuperat de la BD.
        reporter_key (str|None): Clau del reporter (pot ser None en listats).
        fallback_created_at (str): Timestamp ISO de fallback si el registre no en té.

    Returns:
        dict: Resposta API amb id, type, status, coordenades, comentari i timestamps.
    """
    details = created.get('dades')
    if isinstance(details, str):
        try:
            details = json.loads(details)
        except json.JSONDecodeError:
            details = {}
    if not isinstance(details, dict):
        details = {}

    created_at = created.get('created_at')
    if isinstance(created_at, datetime):
        created_at = created_at.isoformat()

    lat = created.get('latitud')
    lon = created.get('longitud')

    return {
        'id': str(created.get('id')),
        'type': 'street_spot_availability',
        'status': DB_TO_STATUS.get(created.get('estat_reportat'), 'available'),
        'latitud': round(float(lat), 6),
        'longitud': round(float(lon), 6),
        'comment': _normalize_comment(details.get('comment') or details.get('comentari')),
        'usuari_id': created.get('usuari_id'),
        'reporter_key': reporter_key,
        'created_at': created_at or fallback_created_at,
    }


def create_report_disponibilitat(data, reporter_key=None):
    """
    Crea un nou report de disponibilitat al carrer.

    Valida l'estat, les coordenades i comprova el cooldown del reporter
    abans de persistir la contribució. En cas d'error de cooldown llança CooldownError.

    Args:
        data (dict): Dades del report: 'status', 'latitud', 'longitud',
                     'comment' (opcional), 'usuari_id' (opcional).
        reporter_key (str|None): Clau única del reporter per al control de cooldown.

    Returns:
        dict: Report creat en format API (id, status, coordenades, etc.).

    Raises:
        ValueError: Per errors de validació en els camps.
        CooldownError: Si el reporter ha enviat un report fa menys de COOLDOWN_SECONDS.
    """
    status = _parse_status(data.get('status'))
    lat, lon = _parse_coordinates(data.get('latitud'), data.get('longitud'))

    comment = _normalize_comment(data.get('comment'))
    user_id = _parse_user_id(data.get('usuari_id'))

    now_dt = datetime.now()
    _validate_cooldown(reporter_key, now_dt)

    report_payload = {
        'comment': comment,
        'reporter_key': reporter_key,
    }

    created = _insert_report_disponibilitat_row(user_id, status, report_payload, lat, lon)
    return _build_report_disponibilitat_response(created, reporter_key, now_dt.isoformat())


def list_report_disponibilitat(limit=100):
    """
    Retorna els reports de disponibilitat dels últims 30 minuts.

    Args:
        limit (int): Nombre màxim de reports a retornar (entre 1 i 500).

    Returns:
        list[dict]: Reports vàlids (amb estat reconegut) en format API.
    """
    try:
        parsed_limit = int(limit)
    except (TypeError, ValueError):
        parsed_limit = 100

    safe_limit = max(1, min(parsed_limit, 500))

    conn = get_new_connection()
    if not conn:
        return []
    cursor = conn.cursor(dictionary=True)
    rows = []
    try:
        cursor.execute(
            """
            SELECT c.id, c.usuari_id, c.estat_reportat, c.dades, c.latitud, c.longitud, c.created_at
            FROM contribucions c
            WHERE c.created_at >= NOW() - INTERVAL 30 MINUTE
            ORDER BY c.created_at DESC
            LIMIT %s OFFSET 0
            """,
            (safe_limit,),
        )
        rows = cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

    reports = []
    for row in rows:
        status = DB_TO_STATUS.get(row.get('estat_reportat'))
        if status not in VALID_STATUS:
            continue

        reports.append(_build_report_disponibilitat_response(row, None, datetime.now(timezone.utc).isoformat()))

    return reports