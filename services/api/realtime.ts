import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RealtimePostInsert {
  id:         string;
  user_id:    string;
  media_url:  string;
  caption:    string;
  created_at: string;
}

export interface RealtimeLikeChange {
  event:   'INSERT' | 'DELETE';
  post_id: string;
  user_id: string;
}

// ─── Posts channel ────────────────────────────────────────────────────────────

/**
 * Subscribe to new posts being inserted.
 *
 * Receive the raw insert payload — callers are responsible for fetching
 * the full post (with profile join and like counts) via the ranked_feed RPC
 * before prepending to the feed list.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToNewPosts(
  onInsert: (post: RealtimePostInsert) => void,
): () => void {
  const channel = supabase
    .channel('public:posts:inserts')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'posts' },
      (payload) => onInsert(payload.new as RealtimePostInsert),
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// ─── Likes channel ────────────────────────────────────────────────────────────

/**
 * Subscribe to like INSERT and DELETE on the likes table.
 *
 * Because like counts are stored as derived values in the feed store
 * (seeded from ranked_feed and updated optimistically), the realtime
 * handler only needs to:
 *   - INSERT: increment count if not already liked by the local user
 *   - DELETE: decrement count if not already unliked by the local user
 *
 * This prevents double-counting when a user's own optimistic update
 * races against the realtime echo.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToLikes(
  onChange: (change: RealtimeLikeChange) => void,
): () => void {
  const channel = supabase
    .channel('public:likes:changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'likes' },
      (payload) => onChange({ event: 'INSERT', post_id: payload.new.post_id, user_id: payload.new.user_id }),
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'likes' },
      (payload) => onChange({ event: 'DELETE', post_id: payload.old.post_id, user_id: payload.old.user_id }),
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// ─── Channel health ───────────────────────────────────────────────────────────

/**
 * Returns the current status of all active Supabase Realtime channels.
 * Useful for debugging subscription health in dev builds.
 */
export function getChannelStatuses(): Array<{ topic: string; state: string }> {
  return supabase.getChannels().map((ch: RealtimeChannel) => ({
    topic: (ch as any).topic ?? 'unknown',
    state: (ch as any).state  ?? 'unknown',
  }));
}
