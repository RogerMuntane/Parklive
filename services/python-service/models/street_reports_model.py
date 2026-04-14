import json
import os
import uuid
from datetime import datetime, timezone

REPORTS_FILE = '/app/storage/street_reports.jsonl'
VALID_STATUS = {'available', 'occupied'}

COOLDOWN_SECONDS = 60


class CooldownError(ValueError):
    def __init__(self, seconds_left):
        self.seconds_left = int(max(1, seconds_left))
        super().__init__(
            f'Has enviado un reporte hace poco. Espera {self.seconds_left}s antes de enviar otro.'
        )


def _ensure_storage_dir():
    os.makedirs(os.path.dirname(REPORTS_FILE), exist_ok=True)


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


def _get_last_report_for_reporter(reporter_key):
    if not reporter_key or not os.path.exists(REPORTS_FILE):
        return None

    try:
        with open(REPORTS_FILE, 'r', encoding='utf-8') as file:
            lines = file.readlines()
    except OSError:
        return None

    for line in reversed(lines):
        row = line.strip()
        if not row:
            continue

        try:
            parsed = json.loads(row)
        except json.JSONDecodeError:
            continue

        if parsed.get('reporter_key') == reporter_key:
            return parsed

    return None


def _validate_cooldown(reporter_key, now_dt):
    last_report = _get_last_report_for_reporter(reporter_key)
    if not last_report:
        return

    created_at = _extract_iso_datetime(last_report.get('created_at'))
    if not created_at:
        return

    elapsed_seconds = (now_dt - created_at).total_seconds()
    if elapsed_seconds >= COOLDOWN_SECONDS:
        return

    raise CooldownError(COOLDOWN_SECONDS - elapsed_seconds)


def create_street_report(data, reporter_key=None):
    status = str(data.get('status', '')).strip().lower()
    if status not in VALID_STATUS:
        raise ValueError('status ha de ser "available" o "occupied"')

    lat = data.get('latitud')
    lon = data.get('longitud')
    if lat is None or lon is None:
        raise ValueError('latitud i longitud són obligatoris')

    try:
        lat = float(lat)
        lon = float(lon)
    except (TypeError, ValueError):
        raise ValueError('latitud i longitud han de ser numèrics')

    if lat < -90 or lat > 90:
        raise ValueError('latitud fora de rang')
    if lon < -180 or lon > 180:
        raise ValueError('longitud fora de rang')

    comment = _normalize_comment(data.get('comment'))
    user_id = data.get('usuari_id')
    if user_id is not None and str(user_id).strip() != '':
        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            raise ValueError('usuari_id ha de ser numèric')
    else:
        user_id = None

    now_dt = datetime.now(timezone.utc)
    _validate_cooldown(reporter_key, now_dt)

    report = {
        'id': str(uuid.uuid4()),
        'type': 'street_spot_availability',
        'status': status,
        'latitud': round(lat, 6),
        'longitud': round(lon, 6),
        'comment': comment,
        'usuari_id': user_id,
        'reporter_key': reporter_key,
        'created_at': now_dt.isoformat(),
    }

    _ensure_storage_dir()
    with open(REPORTS_FILE, 'a', encoding='utf-8') as file:
        file.write(json.dumps(report, ensure_ascii=False) + '\n')

    return report
