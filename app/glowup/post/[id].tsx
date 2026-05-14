import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Image,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ImageSourcePropType,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Heart, Send } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPost,
  getComments,
  toggleLike,
  addComment,
  GlowPost,
  GlowComment,
} from '@/utils/glowupApi';
import {
  BG, DEEP_ROSE, DARK_GREY, ROSE, LILAC, CARD, LIGHT_GREY,
  CATEGORY_COLORS, CATEGORY_EMOJIS,
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

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<GlowPost | null>(null);
  const [comments, setComments] = useState<GlowComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!id) return;
    console.log(`[GlowUp PostDetail] Loading post: ${id}`);
    const load = async () => {
      try {
        const [postData, commentsData] = await Promise.all([
          getPost(id),
          getComments(id),
        ]);
        setPost(postData?.post || postData);
        const cList = Array.isArray(commentsData) ? commentsData : (commentsData?.comments || commentsData?.data || []);
        setComments(cList);
      } catch (e) {
        console.error('[GlowUp PostDetail] Load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleLike = async () => {
    if (!post) return;
    if (!user) {
      router.push('/glowup/auth');
      return;
    }
    console.log(`[GlowUp PostDetail] Like pressed for post: ${post.id}`);
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    setPost(p => p ? {
      ...p,
      is_liked: !p.is_liked,
      likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1,
    } : p);
    try {
      await toggleLike(post.id);
    } catch (e) {
      console.error('[GlowUp PostDetail] Like error:', e);
    }
  };

  const handleSendComment = async () => {
    if (!user) {
      router.push('/glowup/auth');
      return;
    }
    if (!commentText.trim() || !post) return;
    console.log(`[GlowUp PostDetail] Sending comment on post: ${post.id}`);
    setSending(true);
    try {
      const newComment = await addComment(post.id, commentText.trim());
      const commentObj: GlowComment = newComment?.comment || newComment || {
        id: Date.now().toString(),
        post_id: post.id,
        user_id: user.id,
        comment_text: commentText.trim(),
        created_at: new Date().toISOString(),
        author: { username: 'you', profile_photo: '' },
      };
      setComments(prev => [commentObj, ...prev]);
      setCommentText('');
    } catch (e) {
      console.error('[GlowUp PostDetail] Comment error:', e);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={ROSE} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Post not found 🌸</Text>
        </View>
      </SafeAreaView>
    );
  }

  const authorName = post.author?.name || post.author?.username || 'GlowUp User';
  const authorUsername = post.author?.username || 'glowup';
  const authorPhoto = post.author?.profile_photo || '';
  const isPremium = post.author?.is_premium || false;
  const categoryColor = CATEGORY_COLORS[post.category] || ROSE;
  const categoryEmoji = CATEGORY_EMOJIS[post.category] || '✨';
  const categoryLabel = post.category ? post.category.charAt(0).toUpperCase() + post.category.slice(1) : '';
  const timeLabel = timeAgo(post.created_at);
  const initials = getInitials(authorName);
  const likesCount = Number(post.likes_count) || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              console.log('[GlowUp PostDetail] Back pressed');
              router.back();
            }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={DEEP_ROSE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          data={comments}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.postCard}>
              {/* Author row */}
              <View style={styles.authorRow}>
                <View style={[styles.avatarRing, isPremium && styles.avatarRingPremium]}>
                  {authorPhoto ? (
                    <Image source={resolveImageSource(authorPhoto)} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitials}>{initials}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.authorInfo}>
                  <Text style={styles.authorName}>{authorUsername}</Text>
                  <Text style={styles.timeAgo}>{timeLabel}</Text>
                </View>
                <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
                  <Text style={styles.categoryBadgeText}>{categoryEmoji} {categoryLabel}</Text>
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

              {/* Like row */}
              <View style={styles.likeRow}>
                <TouchableOpacity style={styles.likeBtn} onPress={handleLike} activeOpacity={0.7}>
                  <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                    <Heart
                      size={22}
                      color={post.is_liked ? '#F4A7B9' : '#CCCCCC'}
                      fill={post.is_liked ? '#F4A7B9' : 'transparent'}
                    />
                  </Animated.View>
                  <Text style={[styles.likeCount, post.is_liked && styles.likeCountActive]}>
                    {likesCount}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Comments header */}
              <Text style={styles.commentsHeader}>Comments 💬</Text>
            </View>
          }
          renderItem={({ item }) => {
            const commentAuthor = item.author?.username || 'glowup';
            const commentPhoto = item.author?.profile_photo || '';
            const commentInitials = getInitials(commentAuthor);
            const commentTime = timeAgo(item.created_at);

            return (
              <View style={styles.commentItem}>
                {commentPhoto ? (
                  <Image source={resolveImageSource(commentPhoto)} style={styles.commentAvatar} />
                ) : (
                  <View style={styles.commentAvatarPlaceholder}>
                    <Text style={styles.commentInitials}>{commentInitials}</Text>
                  </View>
                )}
                <View style={styles.commentBody}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{commentAuthor}</Text>
                    <Text style={styles.commentTime}>{commentTime}</Text>
                  </View>
                  <Text style={styles.commentText}>{item.comment_text}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.noComments}>
              <Text style={styles.noCommentsText}>Be the first to comment 💕</Text>
            </View>
          }
        />

        {/* Comment input */}
        <View style={styles.commentInputRow}>
          <TextInput
            style={styles.commentInput}
            placeholder={user ? 'Add a comment... 💕' : 'Sign in to comment 💕'}
            placeholderTextColor="#CCCCCC"
            value={commentText}
            onChangeText={setCommentText}
            editable={!!user}
            onFocus={() => {
              if (!user) {
                console.log('[GlowUp PostDetail] Comment input focused, not logged in');
                router.push('/glowup/auth');
              }
            }}
          />
          <TouchableOpacity
            onPress={handleSendComment}
            disabled={sending || !commentText.trim()}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={commentText.trim() ? [ROSE, LILAC] : ['#E0C8D0', '#D4C0E0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sendBtn}
            >
              {sending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Send size={16} color="#FFFFFF" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: DEEP_ROSE,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_GREY,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: DEEP_ROSE,
  },
  listContent: {
    paddingBottom: 20,
  },
  postCard: {
    backgroundColor: CARD,
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#F4A7B9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  authorInfo: {
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
  },
  categoryBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  postContent: {
    fontSize: 15,
    color: DARK_GREY,
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_GREY,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  likeCount: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  likeCountActive: {
    color: ROSE,
  },
  commentsHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: DEEP_ROSE,
  },
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: LIGHT_GREY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentInitials: {
    fontSize: 12,
    fontWeight: '700',
    color: DEEP_ROSE,
  },
  commentBody: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 10,
    shadowColor: '#F4A7B9',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: DARK_GREY,
  },
  commentTime: {
    fontSize: 10,
    color: '#AAAAAA',
  },
  commentText: {
    fontSize: 13,
    color: DARK_GREY,
    lineHeight: 18,
  },
  noComments: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noCommentsText: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: LIGHT_GREY,
    backgroundColor: CARD,
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: BG,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: DARK_GREY,
    borderWidth: 1,
    borderColor: LIGHT_GREY,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
