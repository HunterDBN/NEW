import { create } from 'zustand';
import * as Network from 'expo-network';
import { replayQueue, getPendingCount } from '@/utils/syncQueue';
import { offlineCache, migrateCache } from '@/utils/offlineCache';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface OfflineState {
  isOnline:      boolean;
  isChecking:    boolean;
  syncStatus:    SyncStatus;
  pendingCount:  number;
  lastSyncedAt:  number | null;

  // Lifecycle
  init:          () => Promise<void>;
  checkNetwork:  () => Promise<boolean>;
  syncNow:       () => Promise<void>;
  refreshPending:() => Promise<void>;
}

// ─── Poll interval ────────────────────────────────────────────────────────────

const POLL_MS = 15_000; // re-check connectivity every 15s
let _pollTimer: ReturnType<typeof setInterval> | null = null;
let _prevOnline = true;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOnline:     true,
  isChecking:   false,
  syncStatus:   'idle',
  pendingCount: 0,
  lastSyncedAt: null,

  // ── init — called once from root layout ──────────────────────────────────
  init: async () => {
    // Migrate cache schema if needed
    await migrateCache();

    // Initial check
    await get().checkNetwork();

    // Poll for connectivity changes
    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(() => get().checkNetwork(), POLL_MS);
  },

  // ── checkNetwork — probe real connectivity ────────────────────────────────
  checkNetwork: async () => {
    set({ isChecking: true });

    let isOnline = false;
    try {
      const state = await Network.getNetworkStateAsync();
      isOnline = !!(state.isConnected && state.isInternetReachable);
    } catch {
      isOnline = false;
    }

    const wasOffline = !_prevOnline;
    _prevOnline = isOnline;
    set({ isOnline, isChecking: false });

    // Just came back online — replay queued actions
    if (isOnline && wasOffline) {
      await get().syncNow();
    }

    // Refresh pending count whenever we check
    await get().refreshPending();

    return isOnline;
  },

  // ── syncNow — replay all queued offline actions ───────────────────────────
  syncNow: async () => {
    const { isOnline, syncStatus } = get();
    if (!isOnline || syncStatus === 'syncing') return;

    set({ syncStatus: 'syncing' });

    try {
      await replayQueue();
      set({ syncStatus: 'synced', lastSyncedAt: Date.now(), pendingCount: 0 });
    } catch {
      set({ syncStatus: 'error' });
    } finally {
      // Reset to idle after a beat so the "synced" UI can show briefly
      setTimeout(() => set({ syncStatus: 'idle' }), 3000);
    }
  },

  // ── refreshPending — update the pending action count ────────────────────
  refreshPending: async () => {
    const count = await getPendingCount();
    set({ pendingCount: count });
  },
}));
