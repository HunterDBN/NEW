import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type QueuedActionType =
  | 'like'
  | 'unlike'
  | 'follow'
  | 'unfollow'
  | 'create_comment'
  | 'delete_comment';

export interface QueuedAction {
  id:        string;          // uuid — for deduplication
  type:      QueuedActionType;
  payload:   Record<string, string>;
  queuedAt:  number;          // unix ms
  attempts:  number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUEUE_KEY     = 'syncQueue:pending';
const MAX_ATTEMPTS  = 3;
const MAX_AGE_MS    = 7 * 24 * 60 * 60 * 1000; // 7 days — discard very old actions

// ─── Persistence helpers ──────────────────────────────────────────────────────

async function loadQueue(): Promise<QueuedAction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const actions: QueuedAction[] = JSON.parse(raw);
    // Discard expired actions
    const cutoff = Date.now() - MAX_AGE_MS;
    return actions.filter(a => a.queuedAt > cutoff);
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedAction[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

// ─── Enqueue ──────────────────────────────────────────────────────────────────

/**
 * Enqueue an action to be replayed when the device comes back online.
 *
 * Deduplication:
 *   like + unlike for the same post cancel each other out — if the opposite
 *   action is already queued, we remove it instead of adding a new entry.
 *   Same for follow/unfollow.
 */
export async function enqueue(
  type:    QueuedActionType,
  payload: Record<string, string>,
): Promise<void> {
  const queue = await loadQueue();

  // Cancel-out logic for toggle pairs
  const opposite: Partial<Record<QueuedActionType, QueuedActionType>> = {
    like:       'unlike',
    unlike:     'like',
    follow:     'unfollow',
    unfollow:   'follow',
  };

  const counterType = opposite[type];

  if (counterType) {
    const counterKey = _dedupeKey(counterType, payload);
    const existingIdx = queue.findIndex(
      a => a.type === counterType && _dedupeKey(a.type, a.payload) === counterKey,
    );

    if (existingIdx !== -1) {
      // Opposite already queued — cancel both
      queue.splice(existingIdx, 1);
      await saveQueue(queue);
      return;
    }
  }

  const action: QueuedAction = {
    id:       `${type}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type,
    payload,
    queuedAt: Date.now(),
    attempts: 0,
  };

  queue.push(action);
  await saveQueue(queue);
}

/** Key used to identify "the same logical action" for deduplication */
function _dedupeKey(type: QueuedActionType, payload: Record<string, string>): string {
  switch (type) {
    case 'like':
    case 'unlike':
      return `${type}:${payload.postId}:${payload.userId}`;
    case 'follow':
    case 'unfollow':
      return `${type}:${payload.followerId}:${payload.followingId}`;
    case 'create_comment':
      return `${type}:${payload.postId}:${payload.body}`;
    case 'delete_comment':
      return `${type}:${payload.commentId}`;
    default:
      return `${type}:${JSON.stringify(payload)}`;
  }
}

// ─── Replay ───────────────────────────────────────────────────────────────────

/**
 * Replay all queued actions against Supabase.
 * Called when the device comes back online.
 *
 * - Successful actions are removed from the queue.
 * - Failed actions have their attempt count incremented.
 * - Actions that exceed MAX_ATTEMPTS are silently dropped.
 *
 * Returns the number of successfully replayed actions.
 */
export async function replayQueue(): Promise<number> {
  const queue = await loadQueue();
  if (!queue.length) return 0;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  let replayed  = 0;
  const remaining: QueuedAction[] = [];

  for (const action of queue) {
    if (action.attempts >= MAX_ATTEMPTS) continue; // drop silently

    const success = await _executeAction(action, user.id);

    if (success) {
      replayed++;
    } else {
      remaining.push({ ...action, attempts: action.attempts + 1 });
    }
  }

  await saveQueue(remaining);
  return replayed;
}

async function _executeAction(action: QueuedAction, userId: string): Promise<boolean> {
  try {
    switch (action.type) {
      case 'like': {
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: action.payload.postId, user_id: userId });
        if (error && error.code !== '23505') throw error; // ignore duplicate
        return true;
      }

      case 'unlike': {
        const { error } = await supabase
          .from('likes')
          .delete()
          .match({ post_id: action.payload.postId, user_id: userId });
        if (error) throw error;
        return true;
      }

      case 'follow': {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: userId, following_id: action.payload.followingId });
        if (error && error.code !== '23505') throw error;
        return true;
      }

      case 'unfollow': {
        const { error } = await supabase
          .from('follows')
          .delete()
          .match({ follower_id: userId, following_id: action.payload.followingId });
        if (error) throw error;
        return true;
      }

      case 'create_comment': {
        const { error } = await supabase
          .from('comments')
          .insert({
            post_id: action.payload.postId,
            user_id: userId,
            body:    action.payload.body,
          });
        if (error) throw error;
        return true;
      }

      case 'delete_comment': {
        const { error } = await supabase
          .from('comments')
          .delete()
          .eq('id', action.payload.commentId);
        if (error) throw error;
        return true;
      }

      default:
        return true; // unknown action — drop it
    }
  } catch {
    return false;
  }
}

// ─── Queue inspection (for debug UI / sync banner) ────────────────────────────

export async function getPendingCount(): Promise<number> {
  const queue = await loadQueue();
  return queue.length;
}

export async function clearQueue(): Promise<void> {
  try { await AsyncStorage.removeItem(QUEUE_KEY); } catch {}
}
