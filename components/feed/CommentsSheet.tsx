import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  memo,
} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator,
  Alert,
  ListRenderItemInfo,
} from 'react-native';
import { Image } from 'expo-image';
import { X, SendHorizonal, ChevronUp } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCommentsStore, useSessionStore } from '@/store';
import { Comment } from '@/services/api';
import { Skeleton } from '@/components/ui';

// ─── Constants ────────────────────────────────────────────────────────────────

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_H * 0.72;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return 'now';
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// ─── CommentSkeleton ──────────────────────────────────────────────────────────

const CommentSkeleton = memo(() => (
  <View style={rowStyles.row}>
    <Skeleton width={34} height={34} borderRadius={17} />
    <View style={{ flex: 1, gap: 6 }}>
      <Skeleton width={90}  height={11} borderRadius={5} />
      <Skeleton width="80%" height={13} borderRadius={6} />
      <Skeleton width="55%" height={13} borderRadius={6} />
    </View>
  </View>
));

// ─── CommentRow ───────────────────────────────────────────────────────────────

interface CommentRowProps {
  item:      Comment;
  myUserId:  string | null;
  postId:    string;
}

const CommentRow = memo(({ item, myUserId, postId }: CommentRowProps) => {
  const remove = useCommentsStore(s => s.remove);
  const isOwn  = item.user_id === myUserId;

  const handleLongPress = useCallback(() => {
    if (!isOwn) return;
    Alert.alert('Delete comment', 'Remove this comment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(postId, item.id) },
    ]);
  }, [isOwn, remove, postId, item.id]);

  return (
    <TouchableOpacity
      style={rowStyles.row}
      onLongPress={handleLongPress}
      activeOpacity={isOwn ? 0.6 : 1}
      delayLongPress={400}
    >
      {/* Avatar */}
      {item.author.avatar_url ? (
        <Image
          source={{ uri: item.author.avatar_url }}
          style={rowStyles.avatar}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={{ duration: 150 }}
        />
      ) : (
        <View style={[rowStyles.avatar, rowStyles.avatarFallback]}>
          <Text style={rowStyles.avatarInitial}>
            {item.author.username?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
      )}

      {/* Body */}
      <View style={rowStyles.body}>
        <View style={rowStyles.nameRow}>
          <Text style={rowStyles.username}>{item.author.username}</Text>
          <Text style={rowStyles.time}>{timeAgo(item.created_at)}</Text>
          {isOwn && <Text style={rowStyles.ownBadge}>you</Text>}
        </View>
        <Text style={rowStyles.commentText}>{item.body}</Text>
      </View>
    </TouchableOpacity>
  );
});

// ─── CommentsSheet ────────────────────────────────────────────────────────────

interface CommentsSheetProps {
  postId:   string;
  visible:  boolean;
  onClose:  () => void;
}

const CommentsSheet = memo(({ postId, visible, onClose }: CommentsSheetProps) => {
  const insets   = useSafeAreaInsets();
  const user     = useSessionStore(s => s.user);
  const listRef  = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const [text, setText] = useState('');

  const slice   = useCommentsStore(s => s.posts[postId]);
  const open    = useCommentsStore(s => s.open);
  const loadMore = useCommentsStore(s => s.loadMore);
  const post    = useCommentsStore(s => s.post);
  const close   = useCommentsStore(s => s.close);

  // Sheet slide animation
  const slideY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      open(postId);
      Animated.spring(slideY, {
        toValue:       0,
        tension:       65,
        friction:      11,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideY, {
        toValue:   SHEET_HEIGHT,
        duration:  220,
        useNativeDriver: true,
      }).start(() => close(postId));
    }
  }, [visible, postId]);

  // Scroll to bottom when new comments arrive
  const prevCount = useRef(0);
  useEffect(() => {
    const count = slice?.comments.length ?? 0;
    if (count > prevCount.current && listRef.current) {
      listRef.current.scrollToEnd({ animated: true });
    }
    prevCount.current = count;
  }, [slice?.comments.length]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || slice?.status === 'posting') return;
    setText('');
    await post(postId, trimmed);
    listRef.current?.scrollToEnd({ animated: true });
  }, [text, postId, post, slice?.status]);

  const handleLoadMore = useCallback(() => {
    if (slice?.hasMore && slice.status === 'idle') loadMore(postId);
  }, [slice, postId, loadMore]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Comment>) => (
      <CommentRow item={item} myUserId={user?.id ?? null} postId={postId} />
    ),
    [user?.id, postId],
  );

  const keyExtractor = useCallback((c: Comment) => c.id, []);

  const isLoading = !slice || slice.status === 'loading';
  const isPosting = slice?.status === 'posting';

  if (!visible && !slice) return null;

  return (
    <>
      {/* Backdrop */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideY }] }]}
      >
        {/* Handle bar */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Comments{slice?.count ? ` (${slice.count})` : ''}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} activeOpacity={0.7}>
            <X size={20} color="#888" />
          </TouchableOpacity>
        </View>

        {/* Comment list */}
        {isLoading ? (
          <View style={styles.listArea}>
            {Array.from({ length: 5 }).map((_, i) => (
              <CommentSkeleton key={i} />
            ))}
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={slice.comments}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            style={styles.listArea}
            contentContainerStyle={styles.listContent}
            // Load older comments at the top
            onStartReachedThreshold={0.2}
            onStartReached={handleLoadMore}
            ListHeaderComponent={
              slice.hasMore ? (
                <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore}>
                  <ChevronUp size={16} color="#999" />
                  <Text style={styles.loadMoreText}>Load earlier comments</Text>
                </TouchableOpacity>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No comments yet.</Text>
                <Text style={styles.emptySubText}>Be the first to comment!</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            maxToRenderPerBatch={15}
            windowSize={7}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Input bar */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
            {/* Sender avatar */}
            {user?.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={styles.inputAvatar}
                contentFit="cover"
                cachePolicy="memory"
              />
            ) : (
              <View style={[styles.inputAvatar, styles.inputAvatarFallback]}>
                <Text style={styles.inputAvatarInitial}>
                  {user?.username?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}

            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Add a comment…"
              placeholderTextColor="#BBBBBB"
              value={text}
              onChangeText={setText}
              multiline
              maxLength={1000}
              returnKeyType="default"
              blurOnSubmit={false}
            />

            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || isPosting) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || isPosting}
              activeOpacity={0.75}
            >
              {isPosting
                ? <ActivityIndicator color="#fff" size="small" />
                : <SendHorizonal size={18} color="#fff" />
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </>
  );
});

export default CommentsSheet;

// ─── Styles ───────────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    height:          SHEET_HEIGHT,
    backgroundColor: '#fff',
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    overflow:        'hidden',
    // Shadow
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: -4 },
    shadowOpacity:   0.12,
    shadowRadius:    16,
    elevation:       20,
  },
  handle: {
    alignSelf:       'center',
    width:           36,
    height:          4,
    borderRadius:    2,
    backgroundColor: '#E0E0E0',
    marginTop:       10,
    marginBottom:    4,
  },
  header: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F3F3',
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },

  listArea:    { flex: 1 },
  listContent: { paddingVertical: 8, paddingHorizontal: 4 },

  loadMoreBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            4,
    paddingVertical: 12,
  },
  loadMoreText: { fontSize: 13, color: '#999', fontWeight: '500' },

  empty:       { flex: 1, alignItems: 'center', paddingTop: 48, gap: 8 },
  emptyText:   { fontSize: 16, fontWeight: '600', color: '#555' },
  emptySubText:{ fontSize: 13, color: '#999' },

  // Input bar
  inputBar: {
    flexDirection:   'row',
    alignItems:      'flex-end',
    paddingHorizontal: 12,
    paddingTop:      10,
    gap:             8,
    borderTopWidth:  1,
    borderTopColor:  '#F3F3F3',
    backgroundColor: '#fff',
  },
  inputAvatar: {
    width:  34,
    height: 34,
    borderRadius: 17,
    marginBottom: 4,
  },
  inputAvatarFallback: {
    backgroundColor: '#E8E8E8',
    alignItems:      'center',
    justifyContent:  'center',
  },
  inputAvatarInitial: { fontSize: 13, fontWeight: '700', color: '#888' },

  input: {
    flex:            1,
    minHeight:       38,
    maxHeight:       100,
    backgroundColor: '#F5F5F5',
    borderRadius:    20,
    paddingHorizontal: 14,
    paddingVertical:   9,
    fontSize:        14,
    color:           '#1A1A1A',
    lineHeight:      20,
  },

  sendBtn: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: '#1A1A1A',
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    2,
  },
  sendBtnDisabled: { backgroundColor: '#D0D0D0' },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection:     'row',
    alignItems:        'flex-start',
    paddingHorizontal: 14,
    paddingVertical:   10,
    gap:               10,
  },
  avatar: { width: 34, height: 34, borderRadius: 17, flexShrink: 0 },
  avatarFallback: {
    backgroundColor: '#E8E8E8',
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarInitial: { fontSize: 13, fontWeight: '700', color: '#888' },

  body:    { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  username:{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  time:    { fontSize: 11, color: '#BBBBBB', fontWeight: '500' },
  ownBadge:{
    fontSize: 10, color: '#888',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 10,
    fontWeight: '600',
  },
  commentText: { fontSize: 14, color: '#333', lineHeight: 20 },
});
