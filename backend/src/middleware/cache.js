/**
 * Lightweight TTL in-memory cache for read-heavy endpoints (weather, mandi metadata).
 */
const store = new Map();

function getCache(key) {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return null;
  }
  return hit.value;
}

function setCache(key, value, ttlMs = 300000) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

module.exports = { getCache, setCache };
