import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data:      T;
  cachedAt:  number; // unix ms
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── postCache ────────────────────────────────────────────────────────────────

/**
 * Minimal key-value cache backed by AsyncStorage.
 *
 * get(key)        — returns data if present and not expired, else null
 * set(key, data)  — stores data with a timestamp
 * clear(key)      — removes one entry
 * clearAll()      — removes every entry whose key starts with the prefix
 *
 * TTL is checked on read, not on write, so stale entries sit quietly
 * until they're accessed. For a feed that runs stale-while-revalidate
 * this is fine — we show stale data, then refresh immediately.
 */
const CACHE_PREFIX = 'postCache:';

async function get<T>(key: string, ttlMs = DEFAULT_TTL_MS): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    const age = Date.now() - entry.cachedAt;

    if (age > ttlMs) return null; // expired — treat as miss

    return entry.data;
  } catch {
    return null; // corrupt entry — treat as miss
  }
}

async function set<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, cachedAt: Date.now() };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Storage write failures are non-fatal — the app still works, just uncached
  }
}

async function clear(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_PREFIX + key);
  } catch {}
}

async function clearAll(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys);
  } catch {}
}

export const postCache = { get, set, clear, clearAll };
