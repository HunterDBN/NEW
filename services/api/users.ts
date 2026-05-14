import { supabase } from '@/lib/supabase';
import { ApiResult, ok, fail } from './result';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Profile {
  id:         string;
  username:   string;
  avatar_url: string | null;
  bio:        string | null;
}

export interface ProfileStats {
  followers:  number;
  following:  number;
  postCount:  number;
}

export interface FullProfile extends Profile, ProfileStats {}

export interface UpdateProfileInput {
  username?:   string;
  avatar_url?: string | null;
  bio?:        string | null;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchProfile(userId: string): Promise<ApiResult<Profile>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, bio')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return ok(data as Profile);
  } catch (e) {
    return fail(e);
  }
}

/** Fetch profile + follower/following/post counts in two parallel round trips */
export async function fetchFullProfile(userId: string): Promise<ApiResult<FullProfile>> {
  try {
    const [profileRes, followersRes, followingRes, postsRes] = await Promise.all([
      supabase.from('profiles').select('id, username, avatar_url, bio').eq('id', userId).single(),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id',  userId),
      supabase.from('posts').select('id',   { count: 'exact', head: true }).eq('user_id',      userId),
    ]);

    if (profileRes.error) throw profileRes.error;

    return ok({
      ...(profileRes.data as Profile),
      followers: followersRes.count  ?? 0,
      following: followingRes.count  ?? 0,
      postCount: postsRes.count      ?? 0,
    });
  } catch (e) {
    return fail(e);
  }
}

/** Fetch the signed-in user's profile row (used by session store) */
export async function fetchSessionProfile(
  userId: string,
  email:  string,
): Promise<ApiResult<{ id: string; email: string; username: string | null; avatar_url: string | null; bio: string | null }>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('username, avatar_url, bio')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return ok({ id: userId, email, ...data });
  } catch (e) {
    return fail(e);
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<ApiResult<Profile>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(input)
      .eq('id', userId)
      .select('id, username, avatar_url, bio')
      .single();

    if (error) throw error;
    return ok(data as Profile);
  } catch (e) {
    return fail(e);
  }
}

// ─── Follow state ─────────────────────────────────────────────────────────────

/** Returns true if followerId follows followingId */
export async function fetchIsFollowing(
  followerId:  string,
  followingId: string,
): Promise<ApiResult<boolean>> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .match({ follower_id: followerId, following_id: followingId })
      .maybeSingle();

    if (error) throw error;
    return ok(!!data);
  } catch (e) {
    return fail(e);
  }
}

export async function followUser(
  followerId:  string,
  followingId: string,
): Promise<ApiResult<true>> {
  try {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId });

    if (error) throw error;
    return ok(true);
  } catch (e) {
    return fail(e);
  }
}

export async function unfollowUser(
  followerId:  string,
  followingId: string,
): Promise<ApiResult<true>> {
  try {
    const { error } = await supabase
      .from('follows')
      .delete()
      .match({ follower_id: followerId, following_id: followingId });

    if (error) throw error;
    return ok(true);
  } catch (e) {
    return fail(e);
  }
}
