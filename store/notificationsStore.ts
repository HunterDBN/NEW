import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllRead,
  deleteNotification,
  subscribeToNotifications,
  Notification,
} from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifStatus = 'idle' | 'loading' | 'loadingMore' | 'refreshing' | 'error';

interface NotificationsState {
  notifications:  Notification[];
  unreadCount:    number;
  status:         NotifStatus;
  hasMore:        boolean;
  error:          string | null;

  init:           (userId: string) => Promise<void>;
  refresh:        (userId: string) => Promise<void>;
  loadMore:       (userId: string) => Promise<void>;
  dispose:        () => void;

  markRead:       (id: string) => Promise<void>;
  markAllAsRead:  (userId: string) => Promise<void>;
  remove:         (id: string) => Promise<void>;

  _prepend:       (notification: Notification) => void;
}

// ─── Cursor singleton (outside store — no re-render on change) ────────────────

// created_at of the oldest notification fetched; used as the next-page cursor
let _cursor:      string | null = null;
let _fetching                   = false;
let _unsubscribe: (() => void) | null = null;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount:   0,
  status:        'idle',
  hasMore:       true,
  error:         null,

  // ── init — first page (cursor = null) + unread count + realtime ──────────
  init: async (userId: string) => {
    if (_fetching) return;
    _fetching = true;
    _cursor   = null;
    set({ status: 'loading', hasMore: true, error: null });

    const [notifResult, countResult] = await Promise.all([
      fetchNotifications(userId, null),
      fetchUnreadCount(userId),
    ]);

    _fetching = false;

    if (notifResult.error) {
      set({ status: 'error', error: notifResult.error.message });
      return;
    }

    _cursor = notifResult.data.nextCursor;
    set({
      notifications: notifResult.data.notifications,
      hasMore:       notifResult.data.hasMore,
      unreadCount:   countResult.data ?? 0,
      status:        'idle',
    });

    // Realtime — dispose previous channel first
    _unsubscribe?.();
    _unsubscribe = subscribeToNotifications(userId, (n) => get()._prepend(n));
  },

  // ── refresh — reset cursor, reload from top ───────────────────────────────
  refresh: async (userId: string) => {
    if (_fetching) return;
    _fetching = true;
    _cursor   = null;
    set({ status: 'refreshing', hasMore: true, error: null });

    const [notifResult, countResult] = await Promise.all([
      fetchNotifications(userId, null),
      fetchUnreadCount(userId),
    ]);

    _fetching = false;

    if (notifResult.error) {
      set({ status: 'error', error: notifResult.error.message });
      return;
    }

    _cursor = notifResult.data.nextCursor;
    set({
      notifications: notifResult.data.notifications,
      hasMore:       notifResult.data.hasMore,
      unreadCount:   countResult.data ?? 0,
      status:        'idle',
    });
  },

  // ── loadMore — pass current cursor to fetch the next page ────────────────
  loadMore: async (userId: string) => {
    const { hasMore } = get();
    if (!hasMore || _fetching) return;
    _fetching = true;
    set({ status: 'loadingMore' });

    const { data, error } = await fetchNotifications(userId, _cursor);
    _fetching = false;

    if (error) { set({ status: 'idle' }); return; }

    // Advance cursor to oldest notification in this page
    if (data.nextCursor) _cursor = data.nextCursor;

    set(s => ({
      notifications: [...s.notifications, ...data.notifications],
      hasMore:       data.hasMore,
      status:        'idle',
    }));
  },

  dispose: () => {
    _unsubscribe?.();
    _unsubscribe = null;
  },

  // ── optimistic mutations ──────────────────────────────────────────────────

  markRead: async (id: string) => {
    const target = get().notifications.find(n => n.id === id);
    if (!target || target.read) return;

    set(s => ({
      notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
      unreadCount:   Math.max(0, s.unreadCount - 1),
    }));

    const { error } = await markNotificationRead(id);
    if (error) {
      set(s => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, read: false } : n),
        unreadCount:   s.unreadCount + 1,
      }));
    }
  },

  markAllAsRead: async (userId: string) => {
    const prev = get().notifications;
    set(s => ({
      notifications: s.notifications.map(n => ({ ...n, read: true })),
      unreadCount:   0,
    }));
    const { error } = await markAllRead(userId);
    if (error) set({ notifications: prev });
  },

  remove: async (id: string) => {
    const prev   = get().notifications;
    const target = prev.find(n => n.id === id);
    set(s => ({
      notifications: s.notifications.filter(n => n.id !== id),
      unreadCount:   target && !target.read
        ? Math.max(0, s.unreadCount - 1)
        : s.unreadCount,
    }));
    const { error } = await deleteNotification(id);
    if (error) set({ notifications: prev });
  },

  _prepend: (notification: Notification) => {
    set(s => ({
      notifications: [notification, ...s.notifications],
      unreadCount:   s.unreadCount + 1,
    }));
  },
}));
