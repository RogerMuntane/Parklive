import { pythonApi } from '../api.js';
import { getUserId, isAuthenticated } from '../utils.js';

let cachedFavoriteIds = null;
let pendingLoadPromise = null;

function getNumericUserId() {
  const rawUserId = getUserId();
  const userId = Number(rawUserId);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new Error('Cal iniciar sessio per gestionar favorits.');
  }

  return userId;
}

export function clearFavoritesCache() {
  cachedFavoriteIds = null;
  pendingLoadPromise = null;
}

export async function loadFavoriteIds({ force = false } = {}) {
  if (!isAuthenticated()) {
    clearFavoritesCache();
    return new Set();
  }

  if (!force && cachedFavoriteIds instanceof Set) {
    return new Set(cachedFavoriteIds);
  }

  if (!force && pendingLoadPromise) {
    const ids = await pendingLoadPromise;
    return new Set(ids);
  }

  const userId = getNumericUserId();
  pendingLoadPromise = (async () => {
    const response = await pythonApi.get('/api/usuari/favorits', {
      usuari_id: userId,
      limit: 1000,
      offset: 0,
    });

    const ids = Array.isArray(response?.favorits_ids)
      ? response.favorits_ids.map(String)
      : [];

    cachedFavoriteIds = new Set(ids);
    pendingLoadPromise = null;
    return ids;
  })();

  try {
    const ids = await pendingLoadPromise;
    return new Set(ids);
  } catch (error) {
    pendingLoadPromise = null;
    throw error;
  }
}

export async function isFavoriteParking(parkingId) {
  const ids = await loadFavoriteIds();
  return ids.has(String(parkingId));
}

export async function addFavoriteParking(parkingId) {
  const userId = getNumericUserId();
  await pythonApi.post('/api/usuari/favorits', {
    usuari_id: userId,
    aparcament_id: Number(parkingId),
  });

  if (!(cachedFavoriteIds instanceof Set)) {
    cachedFavoriteIds = new Set();
  }
  cachedFavoriteIds.add(String(parkingId));

  return true;
}

export async function removeFavoriteParking(parkingId) {
  const userId = getNumericUserId();
  await pythonApi.delete(`/api/usuari/favorits/${encodeURIComponent(String(parkingId))}?usuari_id=${encodeURIComponent(String(userId))}`);

  if (cachedFavoriteIds instanceof Set) {
    cachedFavoriteIds.delete(String(parkingId));
  }

  return true;
}

export async function toggleFavoriteParking(parkingId) {
  const isFavorite = await isFavoriteParking(parkingId);
  if (isFavorite) {
    await removeFavoriteParking(parkingId);
    return false;
  }

  await addFavoriteParking(parkingId);
  return true;
}
