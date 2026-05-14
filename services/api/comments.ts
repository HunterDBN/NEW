import { supabase } from '@/lib/supabase';
import { ApiResult, ok, fail } from './result';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommentAuthor {
  id:         string;
  username:   string;
  avatar_url: string | null;
}

export interface Comment {
  id:         string;
  post_id:    string;
  user_id:    string;
  body:       string;
  created_at: string;
  author:     CommentAuthor;
}

export interface CommentsPage {
  comments: Comment[];
  hasMore:  boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 30;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalise(raw: any): Comment {
  const author = Array.isArray(raw.author) ? raw.author[0] : raw.author;
  return {
    id:         raw.id,
    post_id:    raw.post_id,
    user_id:    raw.user_id,
    body:       raw.body,
    created_at: raw.created_at,
    author: {
      id:         author?.id         ?? raw.user_id,
      username:   author?.username   ?? 'unknown',
      avatar_url: author?.avatar_url ?? null,
    },
  };
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchComments(
  postId: string,
  cursor: string | null,   // created_at of the oldest comment loaded (for pagination)
): Promise<ApiResult<CommentsPage>> {
  try {
    let query = supabase
      .from('comments')
      .select(`
        id, post_id, user_id, body, created_at,
        author:profiles!comments_user_id_fkey ( id, username, avatar_url )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(PAGE_SIZE);

    // Load older comments when paginating up
    if (cursor) query = query.lt('created_at', cursor);

    const { data, error } = await query;
    if (error) throw error;

    const comments = (data ?? []).map(normalise);
    return ok({ comments, hasMore: comments.length === PAGE_SIZE });
  } catch (e) {
    return fail(e);
  }
}

export async function fetchCommentCount(postId: string): Promise<ApiResult<number>> {
  try {
    const { count, error } = await supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) throw error;
    return ok(count ?? 0);
  } catch (e) {
    return fail(e);
  }
}

// ─── Mutate ───────────────────────────────────────────────────────────────────

export async function createComment(
  postId: string,
  userId: string,
  body:   string,
): Promise<ApiResult<Comment>> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: userId, body: body.trim() })
      .select(`
        id, post_id, user_id, body, created_at,
        author:profiles!comments_user_id_fkey ( id, username, avatar_url )
      `)
      .single();

    if (error) throw error;
    return ok(normalise(data));
  } catch (e) {
    return fail(e);
  }
}

export async function deleteComment(id: string): Promise<ApiResult<true>> {
  try {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return ok(true);
  } catch (e) {
    return fail(e);
  }
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

/**
 * Subscribe to new comments on a post via Supabase Realtime.
 * Returns an unsubscribe function — call it on component unmount.
 */
export function subscribeToComments(
  postId:   string,
  onInsert: (comment: Comment) => void,
  onDelete: (id: string) => void,
): () => void {
  const channel = supabase
    .channel(`comments:${postId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'comments',
        filter: `post_id=eq.${postId}`,
      },
      async (payload) => {
        // Fetch full comment with joined author
        const { data } = await supabase
          .from('comments')
          .select(`
            id, post_id, user_id, body, created_at,
            author:profiles!comments_user_id_fkey ( id, username, avatar_url )
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) onInsert(normalise(data));
      },
    )
    .on(
      'postgres_changes',
      {
        event:  'DELETE',
        schema: 'public',
        table:  'comments',
        filter: `post_id=eq.${postId}`,
      },
      (payload) => onDelete(payload.old.id),
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
