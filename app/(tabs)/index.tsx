import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Animated,
  RefreshControl,
  Alert,
  Share,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Heart, MessageCircle, Bookmark, Share2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { getPosts, toggleLike, toggleSave, GlowPost } from '@/utils/glowupApi';
import { hasCompletedOnboarding } from '@/utils/glowupStorage';
import {
  BG, DEEP_ROSE, DARK_GREY, ROSE, LILAC, CARD, LIGHT_GREY,
  CATEGORY_COLORS, CATEGORY_EMOJIS, ALL_CATEGORIES,
} from '@/constants/GlowUpColors';

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getInitials(name: string): string {
  return (name || 'G')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface PostCardProps {
  post: GlowPost;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onComment: (id: string) => void;
  onShare: (post: GlowPost) => void;
  onPress: (id: string) => void;
}

function PostCard({ post, onLike, onSave, onComment, onShare, onPress }: PostCardProps) {
  const heartScale = useRef(new Animated.Value(1)).current;

  const handleLike = () => {
    console.log(`[GlowUp Feed] Like pressed for post: ${post.id}`);
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onLike(post.id);
  };

  const authorName = post.author?.name || post.author?.username || 'GlowUp User';
  const authorUsername = post.author?.username || 'glowup';
  const authorPhoto = post.author?.profile_photo || '';
  const isPremium = post.author?.is_premium || false;
  const categoryColor = CATEGORY_COLORS[post.category] || ROSE;
  const categoryEmoji = CATEGORY_EMOJIS[post.category] || '✨';
  const categoryLabel = post.category
    ? post.category.charAt(0).toUpperCase() + post.category.slice(1)
    : '';
  const timeLabel = timeAgo(post.created_at);
  const initials = getInitials(authorName);
  const likesCount = Number(post.likes_count) || 0;
  const commentsCount = Number(post.comments_count) || 0;

  return (
    <TouchableOpacity onPress={() => {
      console.log(`[GlowUp Feed] Post card tapped: ${post.id}`);
      onPress(post.id);
    }} activeOpacity={0.95} style={styles.card}>
      {/* Top row */}
      <View style={styles.cardHeader}>
        <View style={[styles.avatarRing, isPremium && styles.avatarRingPremium]}>
          {authorPhoto ? (
            <Image source={resolveImageSource(authorPhoto)} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.authorName}>{authorUsername}</Text>
          <Text style={styles.timeAgo}>{timeLabel}</Text>
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
          <Text style={styles.categoryBadgeText}>{categoryEmoji}</Text>
          <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
        </View>
      </View>

      {/* Content */}
      <Text style={styles.postContent}>{post.content}</Text>

      {/* Image */}
      {!!post.image_url && (
        <Image
          source={resolveImageSource(post.image_url)}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike} activeOpacity={0.7}>
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Heart
              size={20}
              color={post.is_liked ? '#F4A7B9' : '#CCCCCC'}
              fill={post.is_liked ? '#F4A7B9' : 'transparent'}
            />
          </Animated.View>
          <Text style={[styles.actionCount, post.is_liked && styles.actionCountActive]}>
            {likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            console.log(`[GlowUp Feed] Comment pressed for post: ${post.id}`);
            onComment(post.id);
          }}
          activeOpacity={0.7}
        >
          <MessageCircle size={20} color="#CCCCCC" />
          <Text style={styles.actionCount}>{commentsCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            console.log(`[GlowUp Feed] Save pressed for post: ${post.id}`);
            onSave(post.id);
          }}
          activeOpacity={0.7}
        >
          <Bookmark
            size={20}
            color={post.is_saved ? DEEP_ROSE : '#CCCCCC'}
            fill={post.is_saved ? DEEP_ROSE : 'transparent'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            console.log(`[GlowUp Feed] Share pressed for post: ${post.id}`);
            onShare(post);
          }}
          activeOpacity={0.7}
        >
          <Share2 size={20} color="#CCCCCC" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeFeed() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<GlowPost[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      const done = await hasCompletedOnboarding();
      if (!done) {
        router.replace('/glowup/splash');
      }
    };
    checkOnboarding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPosts = useCallback(async (category?: string) => {
    console.log('[GlowUp Feed] Loading posts, category:', category || 'All');
    try {
      const params = category && category !== 'All' ? { category } : undefined;
      const data = await getPosts(params);
      const list = Array.isArray(data) ? data : (data?.posts || data?.data || []);
      setPosts(list);
    } catch (e) {
      console.error('[GlowUp Feed] Error loading posts:', e);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts(activeCategory !== 'All' ? activeCategory : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  const onRefresh = async () => {
    console.log('[GlowUp Feed] Pull to refresh');
    setRefreshing(true);
    await loadPosts(activeCategory !== 'All' ? activeCategory : undefined);
    setRefreshing(false);
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      Alert.alert('Sign in required', 'Join GlowUp to like posts 💕');
      return;
    }
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      )
    );
    try {
      await toggleLike(postId);
    } catch (e) {
      console.error('[GlowUp Feed] Like error:', e);
    }
  };

  const handleSave = async (postId: string) => {
    if (!user) {
      Alert.alert('Sign in required', 'Join GlowUp to save posts 💕');
      return;
    }
    setPosts(prev =>
      prev.map(p => (p.id === postId ? { ...p, is_saved: !p.is_saved } : p))
    );
    try {
      await toggleSave(postId);
    } catch (e) {
      console.error('[GlowUp Feed] Save error:', e);
    }
  };

  const handleShare = async (post: GlowPost) => {
    try {
      await Share.share({ message: post.content });
    } catch (e) {
      console.error('[GlowUp Feed] Share error:', e);
    }
  };

  const greetingName = user?.name ? user.name.split(' ')[0] : null;
  const greetingText = greetingName ? `Hey ${greetingName} ✨ Keep glowing.` : 'Hey gorgeous ✨ Keep glowing.';

  const categories = ['All', ...ALL_CATEGORIES];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logoText}>GlowUp</Text>
        <TouchableOpacity
          onPress={() => console.log('[GlowUp Feed] Bell pressed')}
          activeOpacity={0.7}
        >
          <Bell size={22} color={ROSE} />
        </TouchableOpacity>
      </View>

      {/* Greeting */}
      <Text style={styles.greeting}>{greetingText}</Text>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
        style={styles.categoryScrollContainer}
      >
        {categories.map(cat => {
          const isActive = activeCategory === cat;
          const label = cat === 'All' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1);
          if (isActive) {
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => {
                  console.log(`[GlowUp Feed] Category filter: ${cat}`);
                  setActiveCategory(cat);
                }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[ROSE, LILAC]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.categoryPillActive}
                >
                  <Text style={styles.categoryPillTextActive}>{label}</Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => {
                console.log(`[GlowUp Feed] Category filter: ${cat}`);
                setActiveCategory(cat);
              }}
              style={styles.categoryPillInactive}
              activeOpacity={0.85}
            >
              <Text style={styles.categoryPillTextInactive}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Auth banner */}
      {!authLoading && !user && (
        <View style={styles.authBanner}>
          <Text style={styles.authBannerText}>Join GlowUp to like and comment 💕</Text>
          <TouchableOpacity
            onPress={() => {
              console.log('[GlowUp Feed] Auth banner sign in pressed');
              router.push('/glowup/auth');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.authBannerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Feed */}
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={handleLike}
            onSave={handleSave}
            onComment={id => router.push(`/glowup/post/${id}` as any)}
            onShare={handleShare}
            onPress={id => router.push(`/glowup/post/${id}` as any)}
          />
        )}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ROSE}
          />
        }
        ListEmptyComponent={
          !feedLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🌸</Text>
              <Text style={styles.emptyText}>No posts yet. Be the first to glow!</Text>
              <TouchableOpacity
                onPress={() => {
                  console.log('[GlowUp Feed] Empty state create post pressed');
                  router.push('/glowup/create-post');
                }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[ROSE, LILAC]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.emptyBtn}
                >
                  <Text style={styles.emptyBtnText}>Share your glow 🌸</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          console.log('[GlowUp Feed] FAB create post pressed');
          router.push('/glowup/create-post');
        }}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[ROSE, LILAC]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fabGradient}
        >
          <Text style={styles.fabIcon}>✨</Text>
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: DEEP_ROSE,
    letterSpacing: -0.5,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: DEEP_ROSE,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  categoryScrollContainer: {
    maxHeight: 44,
    marginBottom: 8,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  categoryPillActive: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryPillInactive: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: ROSE,
  },
  categoryPillTextInactive: {
    color: DEEP_ROSE,
    fontSize: 12,
    fontWeight: '600',
  },
  authBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F4',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F4A7B9',
  },
  authBannerText: {
    color: DARK_GREY,
    fontSize: 13,
  },
  authBannerLink: {
    color: DEEP_ROSE,
    fontWeight: '700',
    fontSize: 13,
  },
  feedContent: {
    paddingBottom: 100,
    paddingTop: 4,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#F4A7B9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  avatarRingPremium: {
    borderColor: ROSE,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: LIGHT_GREY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: '700',
    color: DEEP_ROSE,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: DARK_GREY,
  },
  timeAgo: {
    fontSize: 11,
    color: '#AAAAAA',
    marginTop: 1,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 3,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  postContent: {
    fontSize: 14,
    color: DARK_GREY,
    lineHeight: 20,
    marginBottom: 8,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    fontSize: 13,
    color: '#AAAAAA',
  },
  actionCountActive: {
    color: ROSE,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: DEEP_ROSE,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  emptyBtn: {
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    shadowColor: ROSE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    fontSize: 22,
  },
});
