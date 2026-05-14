/**
 * API service layer — all Supabase calls go through here.
 *
 * Every function returns ApiResult<T>:
 *   { data: T,    error: null  }  — success
 *   { data: null, error: {...} }  — failure (never throws)
 *
 * Usage:
 *   import { fetchFeedPage, likePost } from '@/services/api';
 *
 *   const { data, error } = await fetchFeedPage(userId, 0);
 *   if (error) { ... handle ... }
 */

// Result type helpers
export type { ApiResult, ApiError } from './result';
export { ok, fail } from './result';

// Posts
export {
  fetchFeedPage,
  fetchPostById,
  fetchUserPosts,
  uploadMedia,
  createPost,
  deletePost,
} from './posts';
export type { Post, PostProfile, PostThumb, FeedPage, CreatePostInput } from './posts';

// Users
export {
  fetchProfile,
  fetchFullProfile,
  fetchSessionProfile,
  updateProfile,
  fetchIsFollowing,
  followUser,
  unfollowUser,
} from './users';
export type { Profile, ProfileStats, FullProfile, UpdateProfileInput } from './users';

// Realtime
export {
  subscribeToNewPosts,
  subscribeToLikes,
  getChannelStatuses,
} from './realtime';
export type { RealtimePostInsert, RealtimeLikeChange } from './realtime';

// Comments
export {
  fetchComments,
  fetchCommentCount,
  createComment,
  deleteComment,
  subscribeToComments,
} from './comments';
export type { Comment, CommentAuthor, CommentsPage } from './comments';

// Likes
export {
  fetchLikeState,
  likePost,
  unlikePost,
  toggleLike,
} from './likes';
export type { LikeState } from './likes';

// Notifications
export {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllRead,
  deleteNotification,
  subscribeToNotifications,
} from './notifications';
export type { Notification, NotificationType, NotificationActor, NotificationsPage } from './notifications';
