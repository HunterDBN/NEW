import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import {
  fetchComments,
  createComment,
  deleteComment,
  subscribeToComments,
  Comment,
} from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type CommentStatus = 'idle' | 'loading' | 'loadingMore' | 'posting' | 'error';

interface PostComments {
  comments:  Comment[];
  status:    CommentStatus;
  hasMore:   boolean;
  count:     number;
  cursor:    string | null;   // created_at of oldest loaded comment
}

interface CommentsState {
  // Keyed by postId — each post has its own slice
  posts: Record<string, PostComments>;

  // Actions
  open:         (postId: string) => Promise<void>;
  loadMore:     (postId: string) => Promise<void>;
  post:         (postId: string, body: string) => Promise<void>;
  remove:       (postId: string, commentId: string) => Promise<void>;
  close:        (postId: string) => void;
  getCount:     (postId: string) => number;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const empty = (): PostComments => ({
  comments: [],
  status:   'loading',
  hasMore:  true,
  count:    0,
  cursor:   null,
});

// ─── Active subscription registry ─────────────────────────────────────────────
// Stored outside Zustand so unsubscribe fns don't trigger re-renders

const subs: Record<string, () => void> = {};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCommentsStore = create<CommentsState>((set, get) => ({
  posts: {},

  // ── open — initial load + realtime subscription ───────────────────────────
  open: async (postId: string) => {
    const existing = get().posts[postId];
    // Already loaded (sheet re-opened) — don't refetch, just resubscribe
    if (existing && existing.status === 'idle') {
      if (!subs[postId]) _subscribe(postId, set, get);
      return;
    }

    set(s => ({ posts: { ...s.posts, [postId]: empty() } }));

    const { data, error } = await fetchComments(postId, null);

    if (error) {
      set(s => ({
        posts: { ...s.posts, [postId]: { ...s.posts[postId], status: 'error' } },
      }));
      return;
    }

    const cursor = data.comments.length > 0
      ? data.comments[0].created_at   // oldest comment (list is asc)
      : null;

    set(s => ({
      posts: {
        ...s.posts,
        [postId]: {
          comments: data.comments,
          status:   'idle',
          hasMore:  data.hasMore,
          count:    data.comments.length,
          cursor,
        },
      },
    }));

    _subscribe(postId, set, get);
  },

  // ── loadMore — paginate upward (older comments) ───────────────────────────
  loadMore: async (postId: string) => {
    const slice = get().posts[postId];
    if (!slice || !slice.hasMore || slice.status === 'loadingMore') return;

    set(s => ({
      posts: { ...s.posts, [postId]: { ...s.posts[postId], status: 'loadingMore' } },
    }));

    const { data, error } = await fetchComments(postId, slice.cursor);
    if (error) {
      set(s => ({
        posts: { ...s.posts, [postId]: { ...s.posts[postId], status: 'idle' } },
      }));
      return;
    }

    const newCursor = data.comments.length > 0
      ? data.comments[0].created_at
      : slice.cursor;

    set(s => {
      const prev = s.posts[postId];
      return {
        posts: {
          ...s.posts,
          [postId]: {
            ...prev,
            comments: [...data.comments, ...prev.comments],
            hasMore:  data.hasMore,
            count:    prev.count + data.comments.length,
            cursor:   newCursor,
            status:   'idle',
          },
        },
      };
    });
  },

  // ── post — optimistic add ─────────────────────────────────────────────────
  post: async (postId: string, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    set(s => ({
      posts: { ...s.posts, [postId]: { ...s.posts[postId], status: 'posting' } },
    }));

    const { data, error } = await createComment(postId, user.id, trimmed);

    if (error) {
      set(s => ({
        posts: { ...s.posts, [postId]: { ...s.posts[postId], status: 'idle' } },
      }));
      return;
    }

    // Realtime will also fire, but we dedupe by id so the optimistic add wins
    set(s => {
      const prev = s.posts[postId];
      const alreadyExists = prev?.comments.some(c => c.id === data.id);
      return {
        posts: {
          ...s.posts,
          [postId]: {
            ...prev,
            comments: alreadyExists ? prev.comments : [...(prev?.comments ?? []), data],
            count:    alreadyExists ? prev.count : prev.count + 1,
            status:   'idle',
          },
        },
      };
    });
  },

  // ── remove — optimistic delete ────────────────────────────────────────────
  remove: async (postId: string, commentId: string) => {
    const prev = get().posts[postId];
    if (!prev) return;

    // Optimistic
    set(s => ({
      posts: {
        ...s.posts,
        [postId]: {
          ...s.posts[postId],
          comments: s.posts[postId].comments.filter(c => c.id !== commentId),
          count:    Math.max(0, s.posts[postId].count - 1),
        },
      },
    }));

    const { error } = await deleteComment(commentId);
    if (error) {
      // Rollback
      set(s => ({ posts: { ...s.posts, [postId]: prev } }));
    }
  },

  // ── close — unsubscribe channel, keep cached data ────────────────────────
  close: (postId: string) => {
    if (subs[postId]) {
      subs[postId]();
      delete subs[postId];
    }
  },

  getCount: (postId: string) => get().posts[postId]?.count ?? 0,
}));

// ─── Realtime helper (outside store to avoid circular references) ─────────────

function _subscribe(
  postId: string,
  set: (fn: (s: CommentsState) => CommentsState) => void,
  get: () => CommentsState,
) {
  if (subs[postId]) return; // already subscribed

  subs[postId] = subscribeToComments(
    postId,
    // onInsert — dedupe against optimistic adds
    (comment: Comment) => {
      set(s => {
        const slice = s.posts[postId];
        if (!slice) return s;
        const alreadyExists = slice.comments.some(c => c.id === comment.id);
        return {
          ...s,
          posts: {
            ...s.posts,
            [postId]: {
              ...slice,
              comments: alreadyExists ? slice.comments : [...slice.comments, comment],
              count:    alreadyExists ? slice.count : slice.count + 1,
            },
          },
        };
      });
    },
    // onDelete
    (id: string) => {
      set(s => {
        const slice = s.posts[postId];
        if (!slice) return s;
        return {
          ...s,
          posts: {
            ...s.posts,
            [postId]: {
              ...slice,
              comments: slice.comments.filter(c => c.id !== id),
              count:    Math.max(0, slice.count - 1),
            },
          },
        };
      });
    },
  );
}
