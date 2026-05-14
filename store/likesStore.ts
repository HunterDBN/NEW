import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { toggleLike, subscribeToLikes, RealtimeLikeChange } from '@/services/api';
import { enqueue } from '@/utils/syncQueue';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LikeEntry {
  liked: boolean;
  count: number;
}

interface LikesState {
  likes:    Record<string, LikeEntry>;
  seed:     (posts: Array<{ id: string; user_liked: boolean; like_count: number }>) => void;
  toggle:   (postId: string) => Promise<void>;
  isLiked:  (postId: string) => boolean;
  getCount: (postId: string) => number;
  startRealtimeSync: (myUserId: string) => void;
  stopRealtimeSync:  () => void;
}

// ─── Subscription singleton ───────────────────────────────────────────────────

let _unsubLikes: (() => void) | null = null;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useLikesStore = create<LikesState>((set, get) => ({
  likes: {},

  seed: (posts) => {
    set(state => {
      const next = { ...state.likes };
      for (const p of posts) {
        if (!(p.id in next)) {
          next[p.id] = { liked: p.user_liked, count: p.like_count };
        }
      }
      return { likes: next };
    });
  },

  toggle: async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const current   = get().likes[postId] ?? { liked: false, count: 0 };
    const nextLiked = !current.liked;
    const nextCount = nextLiked ? current.count + 1 : Math.max(0, current.count - 1);

    // Optimistic update — immediate regardless of network
    set(state => ({
      likes: { ...state.likes, [postId]: { liked: nextLiked, count: nextCount } },
    }));

    // Try live mutation; if offline, enqueue for later
    const { error } = await toggleLike(postId, user.id, current.liked);

    if (error) {
      // Network failure — check if it's a connectivity issue
      const isOfflineError = error.message?.includes('network') ||
                             error.message?.includes('fetch') ||
                             error.message?.includes('Failed');

      if (isOfflineError) {
        // Persist to sync queue — action will replay when back online
        await enqueue(
          nextLiked ? 'like' : 'unlike',
          { postId, userId: user.id },
        );
        // Keep optimistic state — it matches the queued action
      } else {
        // Non-network error (e.g. constraint violation) — rollback
        set(state => ({ likes: { ...state.likes, [postId]: current } }));
      }
    }
  },

  isLiked:  (postId) => get().likes[postId]?.liked ?? false,
  getCount: (postId) => get().likes[postId]?.count ?? 0,

  startRealtimeSync: (myUserId: string) => {
    if (_unsubLikes) return;

    _unsubLikes = subscribeToLikes((change: RealtimeLikeChange) => {
      if (change.user_id === myUserId) return; // skip own — already handled optimistically

      const postId = change.post_id;
      set(state => {
        const entry = state.likes[postId];
        if (!entry) return state;

        const nextCount = change.event === 'INSERT'
          ? entry.count + 1
          : Math.max(0, entry.count - 1);

        return {
          likes: { ...state.likes, [postId]: { ...entry, count: nextCount } },
        };
      });
    });
  },

  stopRealtimeSync: () => {
    _unsubLikes?.();
    _unsubLikes = null;
  },
}));
