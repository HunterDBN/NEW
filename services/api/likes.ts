import { supabase } from '@/lib/supabase';
import { ApiResult, ok, fail } from './result';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LikeState {
  liked: boolean;
  count: number;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

/** Fetch like count + whether a specific user has liked a post */
export async function fetchLikeState(
  postId: string,
  userId: string | null,
): Promise<ApiResult<LikeState>> {
  try {
    const [countRes, likedRes] = await Promise.all([
      supabase
        .from('likes')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId),

      userId
        ? supabase
            .from('likes')
            .select('id')
            .match({ post_id: postId, user_id: userId })
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (countRes.error) throw countRes.error;

    return ok({
      count: countRes.count ?? 0,
      liked: !!likedRes.data,
    });
  } catch (e) {
    return fail(e);
  }
}

// ─── Mutate ───────────────────────────────────────────────────────────────────

export async function likePost(
  postId: string,
  userId: string,
): Promise<ApiResult<true>> {
  try {
    const { error } = await supabase
      .from('likes')
      .insert({ post_id: postId, user_id: userId });

    // Ignore duplicate-key errors (unique constraint) — idempotent
    if (error && error.code !== '23505') throw error;
    return ok(true);
  } catch (e) {
    return fail(e);
  }
}

export async function unlikePost(
  postId: string,
  userId: string,
): Promise<ApiResult<true>> {
  try {
    const { error } = await supabase
      .from('likes')
      .delete()
      .match({ post_id: postId, user_id: userId });

    if (error) throw error;
    return ok(true);
  } catch (e) {
    return fail(e);
  }
}

/** Toggle helper — determines current state then calls like or unlike */
export async function toggleLike(
  postId:     string,
  userId:     string,
  isLiked:    boolean,
): Promise<ApiResult<true>> {
  return isLiked
    ? unlikePost(postId, userId)
    : likePost(postId, userId);
}
