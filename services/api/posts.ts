import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import { ApiResult, ok, fail } from './result';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PostProfile {
  username:   string;
  avatar_url: string | null;
}

export interface Post {
  id:         string;
  user_id:    string;
  media_url:  string;
  caption:    string;
  created_at: string;
  profiles:   PostProfile;
  like_count: number;
  user_liked: boolean;
}

export interface FeedPage {
  posts:   Post[];
  hasMore: boolean;
}

export interface CreatePostInput {
  caption:   string;
  base64:    string;
  mimeType:  string;
  fileName:  string;
  bucket?:   string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const PAGE_SIZE = 8;

function normaliseRpcRow(raw: any): Post {
  return {
    id:         raw.id,
    user_id:    raw.user_id,
    media_url:  raw.media_url,
    caption:    raw.caption ?? '',
    created_at: raw.created_at,
    profiles: {
      username:   raw.username   ?? 'unknown',
      avatar_url: raw.avatar_url ?? null,
    },
    like_count: Number(raw.like_count ?? 0),
    user_liked: Boolean(raw.user_liked),
  };
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

/**
 * Fetch a ranked feed page via the `ranked_feed` Postgres RPC.
 * score = (likes × 2) + (is_following × 5) − (age_in_hours × 0.5)
 *
 * Why offset is correct here (not cursor):
 *   Cursor pagination requires a stable, monotonic sort key — something
 *   that doesn't change between page fetches. The `score` column is
 *   computed from likes and age, both of which change continuously.
 *   A cursor like `score < last_seen_score` would skip or repeat rows
 *   as scores shift between page 1 and page 2 loading.
 *
 *   Offset has the well-known "shifting rows" problem too, but for a
 *   ranked feed it's the lesser evil: a missed or duplicate post is
 *   far less harmful than a broken pagination contract. Users who scroll
 *   deep enough to notice are served by pull-to-refresh anyway.
 */
export async function fetchFeedPage(
  userId: string | null,
  offset: number,
): Promise<ApiResult<FeedPage>> {
  try {
    const { data, error } = await supabase.rpc('ranked_feed', {
      p_user_id: userId,
      p_limit:   PAGE_SIZE,
      p_offset:  offset,
    });
    if (error) throw error;

    const posts = (data ?? []).map(normaliseRpcRow);
    return ok({ posts, hasMore: posts.length === PAGE_SIZE });
  } catch (e) {
    return fail(e);
  }
}

// ─── Single post ──────────────────────────────────────────────────────────────

export async function fetchPostById(
  postId: string,
  userId: string | null,
): Promise<ApiResult<Post>> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, user_id, media_url, caption, created_at,
        profiles ( username, avatar_url ),
        like_count:likes ( count ),
        user_liked:likes ( id )
      `)
      .eq('id', postId)
      .eq('user_liked.user_id', userId ?? '')
      .single();

    if (error) throw error;

    const raw = data as any;
    const post: Post = {
      id:         raw.id,
      user_id:    raw.user_id,
      media_url:  raw.media_url,
      caption:    raw.caption ?? '',
      created_at: raw.created_at,
      profiles:   raw.profiles,
      like_count: Array.isArray(raw.like_count) ? (raw.like_count[0]?.count ?? 0) : 0,
      user_liked: Array.isArray(raw.user_liked)  ? raw.user_liked.length > 0 : false,
    };
    return ok(post);
  } catch (e) {
    return fail(e);
  }
}

// ─── Posts by user ────────────────────────────────────────────────────────────

export interface PostThumb {
  id:         string;
  media_url:  string;
  created_at: string;
}

/**
 * Fetch a page of a user's post thumbnails using a created_at cursor.
 *
 * Why cursor over offset here:
 *   - Posts are ordered by created_at DESC, which is strictly monotonic.
 *   - A new post inserted at the top never shifts older rows' positions,
 *     so the cursor stays stable across pages regardless of new activity.
 *   - Offset on a large profile (10k+ posts) requires Postgres to scan
 *     and discard rows up to the offset; cursor uses the index directly.
 *
 * @param cursor  created_at of the last post seen (exclusive). Pass null
 *                for the first page.
 */
export async function fetchUserPosts(
  userId: string,
  cursor: string | null,
): Promise<ApiResult<{ posts: PostThumb[]; hasMore: boolean; nextCursor: string | null }>> {
  try {
    let query = supabase
      .from('posts')
      .select('id, media_url, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    // Cursor: fetch only rows older than the last seen post
    if (cursor) query = query.lt('created_at', cursor);

    const { data, error } = await query;
    if (error) throw error;

    const posts = (data ?? []) as PostThumb[];

    // Next cursor is the created_at of the oldest post in this page
    const nextCursor = posts.length > 0
      ? posts[posts.length - 1].created_at
      : null;

    return ok({ posts, hasMore: posts.length === PAGE_SIZE, nextCursor });
  } catch (e) {
    return fail(e);
  }
}

// ─── Create post ──────────────────────────────────────────────────────────────

export async function uploadMedia(
  userId: string,
  { base64, mimeType, fileName, bucket = 'posts' }: Pick<CreatePostInput, 'base64' | 'mimeType' | 'fileName' | 'bucket'>,
): Promise<ApiResult<string>> {
  try {
    const filePath    = `${userId}/${Date.now()}_${fileName}`;
    const arrayBuffer = decode(base64);

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, arrayBuffer, { contentType: mimeType, upsert: false });

    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    if (!data?.publicUrl) throw new Error('Failed to retrieve public URL.');

    return ok(data.publicUrl);
  } catch (e) {
    return fail(e);
  }
}

export async function createPost(
  userId: string,
  { caption, base64, mimeType, fileName, bucket }: CreatePostInput,
): Promise<ApiResult<{ postId: string; publicUrl: string }>> {
  // 1. Upload media
  const uploadResult = await uploadMedia(userId, { base64, mimeType, fileName, bucket });
  if (uploadResult.error) return uploadResult;

  // 2. Insert post row
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert({ user_id: userId, media_url: uploadResult.data, caption: caption.trim() })
      .select('id')
      .single();

    if (error) throw error;
    return ok({ postId: data.id, publicUrl: uploadResult.data });
  } catch (e) {
    return fail(e);
  }
}

// ─── Delete post ──────────────────────────────────────────────────────────────

export async function deletePost(postId: string): Promise<ApiResult<true>> {
  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;
    return ok(true);
  } catch (e) {
    return fail(e);
  }
}
