import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Cache schema version ─────────────────────────────────────────────────────
// Bump this whenever the cache data shape changes to auto-invalidate old data.
const SCHEMA_VERSION = 1;
const VERSION_KEY    = 'offlineCache:version';

// ─── TTLs ─────────────────────────────────────────────────────────────────────
export const TTL = {
  feed:          10 * 60 * 1000,   // 10 min  — ranked scores decay quickly
  profile:       30 * 60 * 1000,   // 30 min  — profile stats change slowly
  notifications:  5 * 60 * 1000,   //  5 min  — new notifs arrive frequently
  userPosts:     15 * 60 * 1000,   // 15 min  — user grid changes slowly
} as const;

// ─── Keys ─────────────────────────────────────────────────────────────────────
export const CacheKey = {
  feed:              ()             => 'oc:feed',
  profile:           (userId: string) => `oc:profile:${userId}`,
  userPosts:         (userId: string) => `oc:posts:${userId}`,
  notifications:     (userId: string) => `oc:notifs:${userId}`,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  v:        number;      // schema version
  data:     T;
  cachedAt: number;      // unix ms
  ttl:      number;      // ms
}

export interface CacheResult<T> {
  data:   T;
  stale:  boolean;       // true if past TTL but still returned for offline use
  age:    number;        // ms since cached
}

// ─── Core ─────────────────────────────────────────────────────────────────────

async function write<T>(key: string, data: T, ttl: number): Promise<void> {
  try {
    const entry: CacheEntry<T> = { v: SCHEMA_VERSION, data, cachedAt: Date.now(), ttl };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Non-fatal: storage full or unavailable
  }
}

/**
 * Read a cached value.
 *
 * @param key
 * @param allowStale  If true, return expired data rather than null (for offline use).
 *                    The returned `stale` flag tells the caller to refresh when online.
 */
async function read<T>(key: string, allowStale = false): Promise<CacheResult<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);

    // Schema version mismatch → treat as cache miss
    if (entry.v !== SCHEMA_VERSION) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    const age   = Date.now() - entry.cachedAt;
    const stale = age > entry.ttl;

    if (stale && !allowStale) return null;

    return { data: entry.data, stale, age };
  } catch {
    return null;
  }
}

async function remove(key: string): Promise<void> {
  try { await AsyncStorage.removeItem(key); } catch {}
}

// ─── Schema migration ─────────────────────────────────────────────────────────

/**
 * Called once on app startup. If the stored schema version doesn't match
 * SCHEMA_VERSION, all cache entries are wiped and the version is updated.
 */
export async function migrateCache(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(VERSION_KEY);
    if (Number(stored) !== SCHEMA_VERSION) {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith('oc:'));
      if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys);
      await AsyncStorage.setItem(VERSION_KEY, String(SCHEMA_VERSION));
    }
  } catch {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const offlineCache = {
  // Feed
  setFeed:    <T>(data: T) => write(CacheKey.feed(), data, TTL.feed),
  getFeed:    <T>(allowStale = false) => read<T>(CacheKey.feed(), allowStale),

  // Profile
  setProfile:  <T>(userId: string, data: T) => write(CacheKey.profile(userId), data, TTL.profile),
  getProfile:  <T>(userId: string, allowStale = false) => read<T>(CacheKey.profile(userId), allowStale),

  // User posts grid
  setUserPosts:  <T>(userId: string, data: T) => write(CacheKey.userPosts(userId), data, TTL.userPosts),
  getUserPosts:  <T>(userId: string, allowStale = false) => read<T>(CacheKey.userPosts(userId), allowStale),

  // Notifications
  setNotifications:  <T>(userId: string, data: T) => write(CacheKey.notifications(userId), data, TTL.notifications),
  getNotifications:  <T>(userId: string, allowStale = false) => read<T>(CacheKey.notifications(userId), allowStale),

  // Targeted eviction
  invalidate: remove,

  // Full wipe (e.g. on sign-out)
  clearAll: async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith('oc:'));
      if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys);
    } catch {}
  },
};
