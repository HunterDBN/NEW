import { supabase } from '@/lib/supabase';
import { ApiResult, ok, fail } from './result';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType = 'like' | 'follow' | 'comment';

export interface NotificationActor {
  id:         string;
  username:   string;
  avatar_url: string | null;
}

export interface Notification {
  id:           string;
  user_id:      string;
  actor_id:     string;
  type:         NotificationType;
  reference_id: string | null;
  read:         boolean;
  created_at:   string;
  actor:        NotificationActor;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Types (extended with cursor) ────────────────────────────────────────────

export interface NotificationsPage {
  notifications: Notification[];
  hasMore:       boolean;
  nextCursor:    string | null;  // created_at of the oldest notification in this page
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

/**
 * Fetch a page of notifications using a created_at cursor.
 *
 * Notifications are ordered newest-first (DESC). The cursor is the
 * created_at of the oldest notification on the current page; the next
 * page fetches rows older than that value.
 *
 * @param cursor  Pass null for the first page; pass nextCursor from the
 *                previous page result for subsequent pages.
 */
export async function fetchNotifications(
  userId: string,
  cursor: string | null,
): Promise<ApiResult<NotificationsPage>> {
  try {
    let query = supabase
      .from('notifications')
      .select(`
        id,
        user_id,
        actor_id,
        type,
        reference_id,
        read,
        created_at,
        actor:profiles!notifications_actor_id_fkey (
          id,
          username,
          avatar_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    // Cursor: only fetch notifications older than the last seen one
    if (cursor) query = query.lt('created_at', cursor);

    const { data, error } = await query;
    if (error) throw error;

    const notifications = (data ?? []).map((raw: any) => ({
      ...raw,
      actor: Array.isArray(raw.actor) ? raw.actor[0] : raw.actor,
    })) as Notification[];

    const nextCursor = notifications.length > 0
      ? notifications[notifications.length - 1].created_at
      : null;

    return ok({ notifications, hasMore: notifications.length === PAGE_SIZE, nextCursor });
  } catch (e) {
    return fail(e);
  }
}

export async function fetchUnreadCount(userId: string): Promise<ApiResult<number>> {
  try {
    const { data, error } = await supabase.rpc('unread_notification_count', {
      p_user_id: userId,
    });
    if (error) throw error;
    return ok(Number(data ?? 0));
  } catch (e) {
    return fail(e);
  }
}

// ─── Mutate ───────────────────────────────────────────────────────────────────

export async function markNotificationRead(id: string): Promise<ApiResult<true>> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) throw error;
    return ok(true);
  } catch (e) {
    return fail(e);
  }
}

export async function markAllRead(userId: string): Promise<ApiResult<true>> {
  try {
    const { error } = await supabase.rpc('mark_all_notifications_read', {
      p_user_id: userId,
    });
    if (error) throw error;
    return ok(true);
  } catch (e) {
    return fail(e);
  }
}

export async function deleteNotification(id: string): Promise<ApiResult<true>> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return ok(true);
  } catch (e) {
    return fail(e);
  }
}

// ─── Realtime subscription ────────────────────────────────────────────────────

/**
 * Subscribe to new notifications for a user via Supabase Realtime.
 * Returns an unsubscribe function — call it on component unmount.
 */
export function subscribeToNotifications(
  userId:    string,
  onInsert:  (notification: Notification) => void,
): () => void {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        // Fetch the full notification with actor profile joined
        const { data } = await supabase
          .from('notifications')
          .select(`
            id, user_id, actor_id, type, reference_id, read, created_at,
            actor:profiles!notifications_actor_id_fkey ( id, username, avatar_url )
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          const n = data as any;
          onInsert({
            ...n,
            actor: Array.isArray(n.actor) ? n.actor[0] : n.actor,
          });
        }
      },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
