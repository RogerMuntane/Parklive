const REPORT_DISPONIBILITAT_CACHE_KEY = 'parklive_report_disponibilitat_cache_v1';
const REPORT_DISPONIBILITAT_CACHE_LIMIT = 50;

function normalizeReport(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const status = String(raw.status || '').trim().toLowerCase();
  if (status !== 'available' && status !== 'occupied') return null;

  const lat = Number(raw.latitud);
  const lon = Number(raw.longitud);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const createdAt = String(raw.created_at || '').trim();
  const createdAtMs = Date.parse(createdAt);

  return {
    id: String(raw.id || `${createdAt}-${lat}-${lon}`),
    status,
    latitud: Number(lat.toFixed(6)),
    longitud: Number(lon.toFixed(6)),
    comment: String(raw.comment || '').trim(),
    usuari_id: raw.usuari_id ?? null,
    created_at: Number.isFinite(createdAtMs) ? new Date(createdAtMs).toISOString() : new Date().toISOString(),
  };
}

function readCacheRows() {
  try {
    const raw = globalThis.localStorage.getItem(REPORT_DISPONIBILITAT_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCacheRows(rows) {
  try {
    globalThis.localStorage.setItem(REPORT_DISPONIBILITAT_CACHE_KEY, JSON.stringify(rows));
    globalThis.dispatchEvent(new CustomEvent('report-disponibilitat-updated', { detail: { rows } }));
  } catch {
    // Ignorem errors d'escriptura en localStorage.
  }
}

export function getReportDisponibilitatCacheKey() {
  return REPORT_DISPONIBILITAT_CACHE_KEY;
}

export function getCachedReportDisponibilitat() {
  return readCacheRows()
    .map((row) => normalizeReport(row))
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function appendReportDisponibilitatToCache(report) {
  const normalized = normalizeReport(report);
  if (!normalized) return;

  const existing = getCachedReportDisponibilitat();
  const withoutCurrent = existing.filter((row) => row.id !== normalized.id);
  const nextRows = [normalized, ...withoutCurrent]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, REPORT_DISPONIBILITAT_CACHE_LIMIT);

  writeCacheRows(nextRows);
}

export function mergeReportDisponibilitatIntoCache(reports = []) {
  const existing = getCachedReportDisponibilitat();
  const normalizedIncoming = (Array.isArray(reports) ? reports : [])
    .map((report) => normalizeReport(report))
    .filter(Boolean);

  const mergedById = new Map();
  [...existing, ...normalizedIncoming].forEach((row) => {
    mergedById.set(row.id, row);
  });

  const merged = Array.from(mergedById.values())
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, REPORT_DISPONIBILITAT_CACHE_LIMIT);

  writeCacheRows(merged);
  return merged;
}