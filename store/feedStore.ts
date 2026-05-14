import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { offlineCache } from '@/utils/offlineCache';
import { fetchFeedPage, fetchPostById, subscribeToNewPosts, RealtimePostInsert } from '@/services/api';
import { useLikesStore } from './likesStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FeedPost {
  id:         string;
  user_id:    string;
  media_url:  string;
  caption:    string;
  created_at: string;
  profiles: {
    username:   string;
    avatar_url: string | null;
  };
  like_count: number;
  user_liked: boolean;
}

export type FeedStatus =
  | 'idle'
  | 'loading'
  | 'refreshing'
  | 'loadingMore'
  | 'error';

interface FeedState {
  posts:          FeedPost[];
  status:         FeedStatus;
  hasMore:        boolean;
  fromCache:      boolean;
  error:          string | null;
  newPostCount:   number;   // unread live posts since last refresh

  init:           () => Promise<void>;
  refresh:        () => Promise<void>;
  loadMore:       () => Promise<void>;
  retry:          () => Promise<void>;
  dispose:        () => void;
  clearNewPosts:  () => void;
  _prependPost:   (post: FeedPost) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Feed cached via offlineCache.setFeed / getFeed

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function seedLikes(posts: FeedPost[]) {
  useLikesStore.getState().seed(posts);
}

// ─── Subscription singleton (outside store — no re-render on change) ──────────

let _unsubPosts: (() => void) | null = null;
let _offset   = 0;
let _fetching = false;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useFeedStore = create<FeedState>((set, get) => ({
  posts:         [],
  status:        'loading',
  hasMore:       true,
  fromCache:     false,
  error:         null,
  newPostCount:  0,

  // ── init — cache-first, background refresh, then subscribe ───────────────
  init: async () => {
    if (_fetching) return;

    const cachedResult = await offlineCache.getFeed<FeedPost[]>(true); // allowStale=true for offline
    const cached = cachedResult?.data ?? null;
    if (cached?.length) {
      set({ posts: cached, fromCache: true, status: 'idle' });
      seedLikes(cached);
    } else {
      set({ status: 'loading' });
    }

    _fetching = true;
    _offset   = 0;

    const userId = await getUserId();
    const { data, error } = await fetchFeedPage(userId, 0);

    if (error) {
      _fetching = false;
      if (!get().fromCache) set({ error: error.message, status: 'error' });
      else                  set({ status: 'idle' });
      return;
    }

    _offset = data.posts.length;
    if (!data.hasMore) set({ hasMore: false });

    await offlineCache.setFeed(data.posts);
    seedLikes(data.posts);
    set({ posts: data.posts, fromCache: false, status: 'idle', error: null });
    _fetching = false;

    // Open realtime channel (idempotent — noop if already subscribed)
    _startPostSubscription(userId);
  },

  // ── refresh — always network, resets channel ─────────────────────────────
  refresh: async () => {
    if (_fetching) return;
    _fetching = true;
    _offset   = 0;
    set({ status: 'refreshing', hasMore: true, error: null, newPostCount: 0 });

    const userId = await getUserId();
    const { data, error } = await fetchFeedPage(userId, 0);

    if (error) {
      set({ error: error.message, status: 'error' });
      _fetching = false;
      return;
    }

    _offset = data.posts.length;
    if (!data.hasMore) set({ hasMore: false });

    await offlineCache.setFeed(data.posts);
    seedLikes(data.posts);
    set({ posts: data.posts, fromCache: false, status: 'idle' });
    _fetching = false;
  },

  // ── loadMore ──────────────────────────────────────────────────────────────
  loadMore: async () => {
    const { hasMore } = get();
    if (!hasMore || _fetching) return;
    _fetching = true;
    set({ status: 'loadingMore' });

    const userId = await getUserId();
    const { data, error } = await fetchFeedPage(userId, _offset);

    if (error) {
      set({ error: error.message, status: 'idle' });
      _fetching = false;
      return;
    }

    _offset += data.posts.length;
    if (!data.hasMore) set({ hasMore: false });

    seedLikes(data.posts);
    set(state => ({ posts: [...state.posts, ...data.posts], status: 'idle' }));
    _fetching = false;
  },

  retry: async () => {
    set({ error: null });
    await get().init();
  },

  // ── dispose — close channel on logout / screen unmount ───────────────────
  dispose: () => {
    _unsubPosts?.();
    _unsubPosts = null;
  },

  // ── clearNewPosts — called when user taps "N new posts" banner ───────────
  clearNewPosts: () => set({ newPostCount: 0 }),

  // ── _prependPost — called by realtime handler ────────────────────────────
  _prependPost: (post: FeedPost) => {
    set(state => {
      // Dedupe: skip if the post is already in the list
      if (state.posts.some(p => p.id === post.id)) return state;
      return {
        posts:        [post, ...state.posts],
        newPostCount: state.newPostCount + 1,
        // Offset shifts by 1 so subsequent loadMore pages are still correct
        // (we bump it here synchronously; _offset is outside state)
      };
    });
    _offset += 1;
    // Seed likes for the new post
    seedLikes([post]);
  },
}));

// ─── Post subscription (singleton, outside store) ─────────────────────────────

function _startPostSubscription(userId: string | null) {
  if (_unsubPosts) return; // already open

  _unsubPosts = subscribeToNewPosts(async (raw: RealtimePostInsert) => {
    // Don't surface the current user's own posts — they're already in the feed
    // after createPost returns. Other users' posts prepend with a count badge.
    const { data } = await fetchPostById(raw.id, userId);
    if (!data) return;

    // Map Post → FeedPost (shapes match; both come from the same table)
    const feedPost: FeedPost = {
      id:         data.id,
      user_id:    data.user_id,
      media_url:  data.media_url,
      caption:    data.caption,
      created_at: data.created_at,
      profiles:   data.profiles,
      like_count: data.like_count,
      user_liked: data.user_liked,
    };

    useFeedStore.getState()._prependPost(feedPost);
  });
}
