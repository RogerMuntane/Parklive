import json
from datetime import datetime, timezone
from models.db_connection import get_db_connection
from models.contribucions_model import crear_contribucio

VALID_STATUS = {'available', 'occupied'}
STATUS_TO_DB = {
    'available': 'lliure',
    'occupied': 'ocupat',
}
DB_TO_STATUS = {
    'lliure': 'available',
    'ocupat': 'occupied',
    'parcial': 'available',
}
DEFAULT_STREET_REPORT_USER_ID = 1

COOLDOWN_SECONDS = 60


class CooldownError(ValueError):
    def __init__(self, seconds_left):
        self.seconds_left = int(max(1, seconds_left))
        super().__init__(
            f'Has enviado un reporte hace poco. Espera {self.seconds_left}s antes de enviar otro.'
        )


def _normalize_comment(value):
    if value is None:
        return ''
    return str(value).strip()


def _extract_iso_datetime(value):
    if not value:
        return None

    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None


def _to_comparable_datetime(value):
    if not isinstance(value, datetime):
        return None

    if value.tzinfo is None:
        return value

    return value.astimezone(timezone.utc).replace(tzinfo=None)


def _get_last_report_for_reporter(reporter_key):
    if not reporter_key:
        return None

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT
                id,
                created_at
            FROM contribucions
            WHERE JSON_UNQUOTE(JSON_EXTRACT(dades, '$.source')) = 'street_report'
              AND JSON_UNQUOTE(JSON_EXTRACT(dades, '$.reporter_key')) = %s
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (reporter_key,),
        )
        return cursor.fetchone()
    finally:
        cursor.close()


def _validate_cooldown(reporter_key, now_dt):
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
    status = str(raw_status or '').strip().lower()
    if status not in VALID_STATUS:
        raise ValueError('status ha de ser "available" o "occupied"')
    return status


def _parse_coordinates(raw_lat, raw_lon):
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
    if raw_user_id is not None and str(raw_user_id).strip() != '':
        try:
            return int(raw_user_id)
        except (TypeError, ValueError):
            raise ValueError('usuari_id ha de ser numèric')

    return DEFAULT_STREET_REPORT_USER_ID


def _insert_street_report_row(user_id, status, report_payload, lat, lon):
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


def _build_street_report_response(created, reporter_key, fallback_created_at):
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


def create_street_report(data, reporter_key=None):
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

    created = _insert_street_report_row(user_id, status, report_payload, lat, lon)
    return _build_street_report_response(created, reporter_key, now_dt.isoformat())


def list_street_reports(limit=100):
    """Retorna reports recents de disponibilitat al carrer des de la BD."""
    try:
        parsed_limit = int(limit)
    except (TypeError, ValueError):
        parsed_limit = 100

    safe_limit = max(1, min(parsed_limit, 500))

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    rows = []
    try:
        cursor.execute(
            """
            SELECT
                c.id,
                c.usuari_id,
                c.estat_reportat,
                c.dades,
                c.latitud,
                c.longitud,
                c.created_at
            FROM contribucions c
            ORDER BY c.created_at DESC
            LIMIT %s OFFSET 0
            """,
            (safe_limit,),
        )
        rows = cursor.fetchall()
    finally:
        cursor.close()

    reports = []
    for row in rows:
        status = DB_TO_STATUS.get(row.get('estat_reportat'))
        if status not in VALID_STATUS:
            continue

        reports.append(_build_street_report_response(row, None, datetime.now(timezone.utc).isoformat()))

    return reports
