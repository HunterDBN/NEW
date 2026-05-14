import React, { memo, useCallback } from 'react';
import {
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { UserPlus, UserCheck } from 'lucide-react-native';
import { useFollow } from '@/hooks/useFollow';
import { AnimatedPressable, useBounce, triggerHaptic } from '@/utils/interactions';

// ─── Types ────────────────────────────────────────────────────────────────────

type ButtonVariant = 'default' | 'outline' | 'compact';

interface FollowButtonProps {
  targetUserId: string;
  variant?:     ButtonVariant;
  style?:       ViewStyle;
}

// ─── FollowButton ─────────────────────────────────────────────────────────────

const FollowButton = memo(({ targetUserId, variant = 'default', style }: FollowButtonProps) => {
  const { isFollowing, toggling, loading, toggle, isOwnProfile } = useFollow({ targetUserId });
  const { animatedStyle: bounceStyle, bounce } = useBounce({ peakScale: 1.08, haptic: null });

  const handlePress = useCallback(() => {
    // Haptic: success when following, light when unfollowing
    triggerHaptic(isFollowing ? 'light' : 'success');
    bounce();
    toggle();
  }, [isFollowing, bounce, toggle]);

  if (isOwnProfile) return null;

  if (loading) {
    return (
      <Animated.View style={[baseStyle(variant, false), style]}>
        <ActivityIndicator color={variant === 'default' ? '#fff' : '#1A1A1A'} size="small" />
      </Animated.View>
    );
  }

  const label = isFollowing ? 'Following' : 'Follow';

  return (
    <Animated.View style={[bounceStyle, style]}>
      <AnimatedPressable
        style={baseStyle(variant, isFollowing)}
        onPress={handlePress}
        haptic={null}          // haptic fired manually above for correct timing
        pressedScale={0.95}
        disabled={toggling}
      >
        {variant !== 'compact' && (
          isFollowing
            ? <UserCheck size={15} color={variant !== 'default' ? '#1A1A1A' : '#fff'} strokeWidth={2} />
            : <UserPlus  size={15} color={variant === 'default' ? '#fff' : '#1A1A1A'} strokeWidth={2} />
        )}
        <Text style={labelStyle(variant, isFollowing)}>{label}</Text>
      </AnimatedPressable>
    </Animated.View>
  );
    </TouchableOpacity>
  );
});

// ─── Dynamic styles ───────────────────────────────────────────────────────────

function baseStyle(variant: ButtonVariant, isFollowing: boolean): ViewStyle {
  const base: ViewStyle = {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            5,
    borderRadius:   8,
  };

  switch (variant) {
    case 'default':
      return {
        ...base,
        paddingVertical:   9,
        paddingHorizontal: 20,
        backgroundColor:   isFollowing ? '#F0F0F0' : '#1A1A1A',
        borderWidth:       isFollowing ? 1.5 : 0,
        borderColor:       '#DBDBDB',
      };
    case 'outline':
      return {
        ...base,
        paddingVertical:   7,
        paddingHorizontal: 16,
        backgroundColor:   'transparent',
        borderWidth:       1.5,
        borderColor:       isFollowing ? '#DBDBDB' : '#1A1A1A',
      };
    case 'compact':
      return {
        ...base,
        paddingVertical:   5,
        paddingHorizontal: 14,
        backgroundColor:   isFollowing ? '#F0F0F0' : '#1A1A1A',
        borderRadius:      20,
      };
  }
}

function labelStyle(variant: ButtonVariant, isFollowing: boolean) {
  const base = { fontSize: 13, fontWeight: '600' as const };

  if (variant === 'default') {
    return { ...base, color: isFollowing ? '#1A1A1A' : '#fff' };
  }
  if (variant === 'outline') {
    return { ...base, color: '#1A1A1A' };
  }
  // compact
  return { ...base, color: isFollowing ? '#1A1A1A' : '#fff', fontSize: 12 };
}

export default FollowButton;
