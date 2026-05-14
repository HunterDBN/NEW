# Project Architecture

## Folder Structure

```
/
├── app/                        Expo Router route shells (thin — no logic)
│   ├── _layout.tsx             Root layout: fonts, stores, global providers
│   ├── feed.tsx                → re-exports @/screens/feed/FeedScreen
│   ├── social-profile.tsx      → re-exports @/screens/profile/ProfileScreen
│   └── (tabs)/
│       ├── notifications.tsx   → re-exports @/screens/notifications/NotificationsScreen
│       └── ...
│
├── screens/                    Full screen implementations
│   ├── feed/
│   │   └── FeedScreen.tsx      Vertical TikTok-style feed
│   ├── profile/
│   │   └── ProfileScreen.tsx   Instagram-style grid profile
│   └── notifications/
│       └── NotificationsScreen.tsx  Notification inbox
│
├── components/
│   ├── ui/                     Primitive, stateless UI elements
│   │   ├── Skeleton.tsx        Animated shimmer placeholder
│   │   ├── SkeletonScreens.tsx Composed skeleton layouts per screen
│   │   ├── LoadingButton.tsx
│   │   ├── IconCircle.tsx
│   │   └── IconSymbol.tsx
│   │
│   ├── feed/                   Feed-specific components
│   │   ├── FeedImage.tsx       expo-image wrapper with blurhash + progressive load
│   │   ├── FeedVideo.tsx       Expo AV wrapper with lazy mount + thumbnail
│   │   └── CommentsSheet.tsx   Bottom sheet comment thread
│   │
│   ├── social/                 Social graph components
│   │   └── FollowButton.tsx    Follow/unfollow with optimistic update + haptic
│   │
│   └── layout/                 App-shell chrome
│       ├── OfflineBanner.tsx   Connectivity + sync status bar
│       ├── ErrorBoundary.tsx
│       ├── FloatingTabBar.tsx
│       └── HeaderButtons.tsx
│
├── hooks/                      Custom React hooks (stateful logic, no UI)
│   ├── useFollow.ts            Follow state + Supabase mutation
│   ├── useLike.ts              Like state + Supabase mutation
│   └── index.ts
│
├── services/
│   └── api/                    All Supabase data access
│       ├── result.ts           ApiResult<T> type + ok/fail helpers
│       ├── posts.ts            Feed, user posts, create, delete, upload
│       ├── users.ts            Profile CRUD, follow graph
│       ├── likes.ts            Like/unlike, fetch state
│       ├── comments.ts         Comments CRUD + realtime
│       ├── notifications.ts    Notifications + realtime
│       ├── realtime.ts         Shared channel builders (posts, likes)
│       └── index.ts            Barrel export
│
├── store/                      Zustand global state
│   ├── sessionStore.ts         Auth user + profile
│   ├── feedStore.ts            Ranked feed + realtime post prepend
│   ├── likesStore.ts           Per-post like state + realtime sync
│   ├── commentsStore.ts        Per-post comment threads + realtime
│   ├── notificationsStore.ts   Inbox + realtime + unread count
│   ├── offlineStore.ts         Network state + sync orchestration
│   └── index.ts                Barrel export
│
├── utils/                      Pure helpers — no React, no Supabase
│   ├── interactions.ts         Reanimated hooks: useBounce, FadeIn, AnimatedPressable…
│   ├── mediaUtils.ts           Image compression, thumbnail, LQIP, blurhash
│   ├── offlineCache.ts         Typed AsyncStorage cache with TTL + schema versioning
│   ├── syncQueue.ts            Persisted offline action queue with cancel-out dedup
│   ├── postCache.ts            Legacy simple cache (superseded by offlineCache)
│   ├── createPost.ts           Pick + compress + upload + insert orchestrator
│   └── index.ts                Barrel export
│
├── lib/
│   └── supabase.ts             Supabase client singleton
│
└── backend/
    └── drizzle/                SQL migrations (applied via Supabase SQL Editor)
        ├── 20260509_profiles_rls.sql
        ├── 20260509_posts_rls.sql
        ├── 20260509_likes_follows_rls.sql
        ├── 20260509_ranked_feed_fn.sql
        ├── 20260509_notifications.sql
        ├── 20260509_comments.sql
        └── 20260509_rls_audit.sql
```

## Conventions

### Imports
All paths use the `@/` alias (resolves to project root).
Prefer barrel imports over deep paths:

```ts
// ✅ Good
import { Skeleton, LoadingButton }    from '@/components/ui';
import { FeedImage, CommentsSheet }   from '@/components/feed';
import { FollowButton }               from '@/components/social';
import { OfflineBanner }              from '@/components/layout';
import { useFollow, useLike }         from '@/hooks';
import { fetchFeedPage, likePost }    from '@/services/api';
import { useFeedStore, useLikesStore } from '@/store';

// ❌ Avoid
import Skeleton from '@/components/ui/Skeleton';
import { useFollow } from '@/utils/useFollow';
```

### Screens vs app/
- `app/` contains only Expo Router route files — no JSX logic.
- Every route file is a one-liner: `export { default } from '@/screens/...'`
- All screen state, hooks, and sub-components live in `/screens`.

### Services
- Every service function returns `ApiResult<T>` — never throws.
- Callers destructure `{ data, error }` — no try/catch at the call site.
- Auth calls (`supabase.auth.*`) stay in stores — not in the service layer.

### Stores
- One store per domain. No store imports another store's state — use `getState()` for cross-store side effects.
- All mutations are optimistic with rollback.
- Realtime subscriptions are singletons stored outside Zustand (plain `let` variables) to avoid triggering re-renders when they open/close.

### Hooks
- Hooks in `/hooks` are stateful and may call services.
- Hooks in `/utils/interactions.ts` are animation-only — no data fetching.

### Utils
- `/utils` is pure: no React imports (except interactions.ts which uses Reanimated), no Supabase calls, no store access.
- If a util needs React state, it belongs in `/hooks`.
- If a util needs Supabase, it belongs in `/services/api`.
