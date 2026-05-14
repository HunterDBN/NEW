import React, {
  useCallback,
  useEffect,
  useRef,
  memo,
  useState,
} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Alert,
  ListRenderItemInfo,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Heart, UserPlus, MessageCircle, BellOff, CheckCheck } from 'lucide-react-native';
import { useNotificationsStore } from '@/store';
import { useSessionStore } from '@/store';
import { Notification, NotificationType } from '@/services/api';
import Skeleton from '@/components/ui';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(isoDate: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 60)   return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return `${Math.floor(seconds / 604800)}w`;
}

function notificationCopy(type: NotificationType, username: string): { text: string; sub: string } {
  switch (type) {
    case 'like':    return { text: username, sub: 'liked your post.' };
    case 'follow':  return { text: username, sub: 'started following you.' };
    case 'comment': return { text: username, sub: 'commented on your post.' };
    default:        return { text: username, sub: 'interacted with you.' };
  }
}

function notificationIcon(type: NotificationType) {
  switch (type) {
    case 'like':    return <Heart    size={14} color="#fff" fill="#fff" />;
    case 'follow':  return <UserPlus size={14} color="#fff" />;
    case 'comment': return <MessageCircle size={14} color="#fff" />;
  }
}

function iconBg(type: NotificationType): string {
  switch (type) {
    case 'like':    return '#FF3B5C';
    case 'follow':  return '#1A1A1A';
    case 'comment': return '#0A84FF';
  }
}

// ─── NotificationRowSkeleton ──────────────────────────────────────────────────

const NotificationRowSkeleton = memo(() => (
  <View style={rowStyles.container}>
    <Skeleton width={46} height={46} borderRadius={23} />
    <View style={{ flex: 1, gap: 7 }}>
      <Skeleton width="60%" height={13} borderRadius={6} />
      <Skeleton width="40%" height={11} borderRadius={5} />
    </View>
    <Skeleton width={54} height={54} borderRadius={6} />
  </View>
));

const NotificationListSkeleton = memo(() => (
  <>
    {Array.from({ length: 8 }).map((_, i) => (
      <NotificationRowSkeleton key={i} />
    ))}
  </>
));

// ─── NotificationRow ─────────────────────────────────────────────────────────

interface NotificationRowProps {
  item:     Notification;
  onPress:  (item: Notification) => void;
  onRemove: (id: string) => void;
}

const NotificationRow = memo(({ item, onPress, onRemove }: NotificationRowProps) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(1)).current;

  const { text, sub } = notificationCopy(item.type, item.actor?.username ?? 'Someone');

  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  const handleDelete = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: -400, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,    duration: 250, useNativeDriver: true }),
    ]).start(() => onRemove(item.id));
  }, [item.id, onRemove, translateX, opacity]);

  return (
    <Animated.View style={[{ transform: [{ translateX }], opacity }]}>
      <TouchableOpacity
        style={[rowStyles.container, !item.read && rowStyles.unread]}
        onPress={handlePress}
        activeOpacity={0.75}
        onLongPress={() =>
          Alert.alert('Remove notification', 'Delete this notification?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: handleDelete },
          ])
        }
      >
        {/* Avatar + type badge */}
        <View style={rowStyles.avatarWrap}>
          {item.actor?.avatar_url ? (
            <Image
              source={{ uri: item.actor.avatar_url }}
              style={rowStyles.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={{ duration: 150 }}
            />
          ) : (
            <View style={[rowStyles.avatar, rowStyles.avatarFallback]}>
              <Text style={rowStyles.avatarInitial}>
                {item.actor?.username?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
          <View style={[rowStyles.badge, { backgroundColor: iconBg(item.type) }]}>
            {notificationIcon(item.type)}
          </View>
        </View>

        {/* Text */}
        <View style={rowStyles.textWrap}>
          <Text style={rowStyles.mainText} numberOfLines={2}>
            <Text style={rowStyles.bold}>{text}</Text>
            {' '}{sub}
          </Text>
          <Text style={rowStyles.time}>{timeAgo(item.created_at)}</Text>
        </View>

        {/* Unread dot */}
        {!item.read && <View style={rowStyles.unreadDot} />}
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── NotificationsScreen ──────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const router   = useRouter();
  const user     = useSessionStore(s => s.user);
  const {
    notifications, status, hasMore, unreadCount,
    init, refresh, loadMore, dispose,
    markRead, markAllAsRead, remove,
  } = useNotificationsStore();

  // Init on mount
  useEffect(() => {
    if (user?.id) init(user.id);
    return () => dispose();
  }, [user?.id]);

  const handlePress = useCallback((item: Notification) => {
    markRead(item.id);
    // Navigate to the relevant screen
    if (item.type === 'like' || item.type === 'comment') {
      router.push(`/post/${item.reference_id}` as any);
    } else if (item.type === 'follow') {
      router.push({ pathname: '/social-profile', params: { userId: item.actor_id } } as any);
    }
  }, [markRead, router]);

  const handleRemove = useCallback((id: string) => {
    remove(id);
  }, [remove]);

  const handleMarkAll = useCallback(() => {
    if (user?.id) markAllAsRead(user.id);
  }, [user?.id, markAllAsRead]);

  const handleRefresh = useCallback(() => {
    if (user?.id) refresh(user.id);
  }, [user?.id, refresh]);

  const handleLoadMore = useCallback(() => {
    if (user?.id) loadMore(user.id);
  }, [user?.id, loadMore]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Notification>) => (
      <NotificationRow
        item={item}
        onPress={handlePress}
        onRemove={handleRemove}
      />
    ),
    [handlePress, handleRemove],
  );

  const keyExtractor = useCallback((item: Notification) => item.id, []);

  const ListFooter = status === 'loadingMore' ? (
    <View style={styles.footer}>
      <ActivityIndicator color="#999" size="small" />
    </View>
  ) : null;

  const ListEmpty = status === 'loading' ? (
    <NotificationListSkeleton />
  ) : (
    <View style={styles.empty}>
      <BellOff size={48} color="#DBDBDB" />
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptySub}>When someone likes or follows you,{'\n'}you'll see it here.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAll}
            style={styles.markAllBtn}
            activeOpacity={0.7}
          >
            <CheckCheck size={16} color="#1A1A1A" />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Unread count pill */}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <View style={styles.unreadPill}>
            <Text style={styles.unreadPillText}>
              {unreadCount} new
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={status === 'refreshing'}
            onRefresh={handleRefresh}
            tintColor="#1A1A1A"
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', letterSpacing: -0.4 },

  markAllBtn: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
    paddingVertical:   6,
    paddingHorizontal: 12,
    backgroundColor:   '#F5F5F5',
    borderRadius:      20,
  },
  markAllText: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },

  unreadBanner: { paddingHorizontal: 16, paddingVertical: 8 },
  unreadPill:   {
    alignSelf:      'flex-start',
    backgroundColor: '#1A1A1A',
    paddingVertical:   4,
    paddingHorizontal: 12,
    borderRadius:      20,
  },
  unreadPillText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  separator: { height: 1, backgroundColor: '#F7F7F7' },
  footer:    { paddingVertical: 20, alignItems: 'center' },

  empty: {
    flex: 1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingTop:     80,
    gap:            12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  emptySub:   { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
});

const rowStyles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: 16,
    paddingVertical:   12,
    gap:               12,
    backgroundColor:   '#fff',
  },
  unread: { backgroundColor: '#FAFAFA' },

  avatarWrap: { position: 'relative', width: 46, height: 46 },
  avatar:     { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: {
    backgroundColor: '#E8E8E8',
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: '#888' },

  badge: {
    position:       'absolute',
    bottom:         -3,
    right:          -3,
    width:          22,
    height:         22,
    borderRadius:   11,
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    2,
    borderColor:    '#fff',
  },

  textWrap: { flex: 1, gap: 3 },
  mainText: { fontSize: 14, color: '#1A1A1A', lineHeight: 20 },
  bold:     { fontWeight: '700' },
  time:     { fontSize: 12, color: '#999', fontWeight: '500' },

  unreadDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
    backgroundColor: '#1A1A1A',
    flexShrink:   0,
  },
});
