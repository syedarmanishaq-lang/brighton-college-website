/* Tiny localStorage cache — stale-while-revalidate for public reads.
   Purpose: repeat visits (and OFFLINE visits) render instantly from the
   last saved data while a fresh fetch runs in the background.
   - Keys are namespaced `bc:` so a stale entry can never collide.
   - Reads never throw (private mode / full storage just means no cache).
   - Admin writes never read this cache: admin lists always fetch live. */
const PREFIX = 'bc:';

export function cacheGet(key) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || typeof entry !== 'object' || !('v' in entry)) return null;
    return entry;
  } catch {
    return null;
  }
}

/* Returns the cached value when it is younger than ttlMs, else null. */
export function cacheFresh(key, ttlMs) {
  const entry = cacheGet(key);
  if (!entry) return null;
  if (Date.now() - (entry.at || 0) > ttlMs) return null;
  return entry.v;
}

/* Returns the cached value regardless of age (offline fallback). */
export function cacheStale(key) {
  const entry = cacheGet(key);
  return entry ? entry.v : null;
}

export function cacheSet(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), v: value }));
  } catch {
    /* storage full or unavailable — caching is best-effort only */
  }
}

export function cacheClear(prefix) {
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(PREFIX + prefix)) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
