import React, { useEffect, useRef, memo } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react-native';
import { useOfflineStore } from '@/store';

// ─── OfflineBanner ────────────────────────────────────────────────────────────

/**
 * Slides down from the top of the screen when:
 *   - Device is offline    → red "No internet" bar with pending action count
 *   - Back online syncing  → blue "Syncing…" bar
 *   - Sync complete        → green "Back online" bar (auto-dismisses after 3s)
 *
 * Invisible and zero-height when online and idle — no layout impact.
 */
const OfflineBanner = memo(() => {
  const { isOnline, syncStatus, pendingCount } = useOfflineStore();

  const translateY = useSharedValue(-60);
  const opacity    = useSharedValue(0);

  const visible =
    !isOnline ||
    syncStatus === 'syncing' ||
    syncStatus === 'synced' ||
    syncStatus === 'error';

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { stiffness: 200, damping: 20 });
      opacity.value    = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withDelay(300, withSpring(-60, { stiffness: 300, damping: 25 }));
      opacity.value    = withDelay(300, withTiming(0, { duration: 200 }));
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity:   opacity.value,
  }));

  const { bg, icon, message } = getBannerContent(isOnline, syncStatus, pendingCount);

  return (
    <Animated.View style={[styles.banner, { backgroundColor: bg }, animatedStyle]}>
      {icon}
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
});

function getBannerContent(
  isOnline:     boolean,
  syncStatus:   string,
  pendingCount: number,
): { bg: string; icon: React.ReactNode; message: string } {
  if (!isOnline) {
    return {
      bg:      '#E53935',
      icon:    <WifiOff size={14} color="#fff" />,
      message: pendingCount > 0
        ? `Offline — ${pendingCount} action${pendingCount > 1 ? 's' : ''} queued`
        : 'No internet connection',
    };
  }
  if (syncStatus === 'syncing') {
    return {
      bg:      '#1565C0',
      icon:    <RefreshCw size={14} color="#fff" />,
      message: 'Syncing queued actions…',
    };
  }
  if (syncStatus === 'synced') {
    return {
      bg:      '#2E7D32',
      icon:    <CheckCircle size={14} color="#fff" />,
      message: 'Back online — all caught up',
    };
  }
  if (syncStatus === 'error') {
    return {
      bg:      '#E65100',
      icon:    <RefreshCw size={14} color="#fff" />,
      message: 'Sync failed — will retry',
    };
  }
  return { bg: 'transparent', icon: null, message: '' };
}

export default OfflineBanner;

const styles = StyleSheet.create({
  banner: {
    position:          'absolute',
    top:               0,
    left:              0,
    right:             0,
    zIndex:            9999,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               6,
    paddingVertical:   10,
    paddingHorizontal: 16,
  },
  text: {
    color:      '#fff',
    fontSize:   13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
