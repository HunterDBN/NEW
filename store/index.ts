/**
 * Global store barrel export.
 *
 * Each store is independent — import only what you need.
 * Zustand subscriptions are selector-based, so components
 * only re-render when the specific slice they select changes.
 *
 * ─── Usage examples ────────────────────────────────────────
 *
 * // Session
 * const user    = useSessionStore(s => s.user);
 * const signOut = useSessionStore(s => s.signOut);
 *
 * // Feed
 * const posts   = useFeedStore(s => s.posts);
 * const refresh = useFeedStore(s => s.refresh);
 *
 * // Likes (single post — zero extra re-renders for other posts)
 * const liked   = useLikesStore(s => s.isLiked(postId));
 * const count   = useLikesStore(s => s.getCount(postId));
 * const toggle  = useLikesStore(s => s.toggle);
 *
 * ─── Outside React (e.g. in a utility or event handler) ────
 *
 * import { useFeedStore } from '@/store';
 * useFeedStore.getState().refresh();
 */

export { useSessionStore } from './sessionStore';
export type { SessionUser } from './sessionStore';

export { useFeedStore }    from './feedStore';
export type { FeedPost, FeedStatus } from './feedStore';

export { useLikesStore }   from './likesStore';

export { useNotificationsStore } from './notificationsStore';

export { useCommentsStore } from './commentsStore';

export { useOfflineStore } from './offlineStore';
