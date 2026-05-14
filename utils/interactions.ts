/**
 * interactions.ts
 *
 * A single source of truth for every micro-interaction in the app.
 * All animations run on the UI thread via Reanimated worklets —
 * zero JS frame budget consumed during animation.
 *
 * Exports:
 *   Hooks   — useHaptics, useSpringPress, useBounce, usePulse
 *   Components — AnimatedPressable, FadeIn, SlideIn
 *   Standalone — triggerHaptic
 */

import React, { useCallback, useEffect, useRef, memo } from 'react';
import { StyleSheet, ViewStyle, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  interpolate,
  Easing,
  SharedValue,
} from 'react-native-reanimated';

// ─── Haptics ──────────────────────────────────────────────────────────────────

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * triggerHaptic — fire-and-forget haptic, safe to call from anywhere.
 * Gracefully swallows errors on devices that don't support haptics.
 */
export function triggerHaptic(style: HapticStyle = 'light') {
  const fn = () => {
    switch (style) {
      case 'light':   return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case 'medium':  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      case 'heavy':   return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      case 'success': return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'warning': return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      case 'error':   return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };
  fn().catch(() => {});
}

/** React hook that returns a memoised triggerHaptic callback */
export function useHaptic(style: HapticStyle = 'light') {
  return useCallback(() => triggerHaptic(style), [style]);
}

// ─── Spring press (scale-down on press-in, spring back on press-out) ──────────

interface SpringPressConfig {
  /** Scale factor while pressed — default 0.93 */
  pressedScale?: number;
  /** Spring stiffness — higher = snappier */
  stiffness?:    number;
  damping?:      number;
}

export function useSpringPress({
  pressedScale = 0.93,
  stiffness    = 300,
  damping      = 18,
}: SpringPressConfig = {}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    'worklet';
    scale.value = withSpring(pressedScale, { stiffness, damping });
  }, [pressedScale, stiffness, damping]);

  const onPressOut = useCallback(() => {
    'worklet';
    scale.value = withSpring(1, { stiffness, damping });
  }, [stiffness, damping]);

  return { animatedStyle, onPressIn, onPressOut };
}

// ─── Bounce (scale up then snap back — for likes, success states) ─────────────

interface BounceConfig {
  peakScale?: number;   // how big it gets — default 1.3
  haptic?:    HapticStyle | null;
}

export function useBounce({ peakScale = 1.3, haptic = 'light' }: BounceConfig = {}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bounce = useCallback(() => {
    if (haptic) runOnJS(triggerHaptic)(haptic);
    scale.value = withSequence(
      withSpring(peakScale, { stiffness: 400, damping: 10 }),
      withSpring(1,         { stiffness: 300, damping: 14 }),
    );
  }, [peakScale, haptic]);

  return { animatedStyle, bounce };
}

// ─── Pulse (continuous slow pulse — for unread badges, live indicators) ────────

export function usePulse(active = true) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!active) { opacity.value = withTiming(1, { duration: 200 }); return; }
    opacity.value = withSequence(
      withTiming(0.4, { duration: 700,  easing: Easing.inOut(Easing.ease) }),
      withTiming(1,   { duration: 700,  easing: Easing.inOut(Easing.ease) }),
    );
    // Repeat via a recursive worklet approach
    const loop = () => {
      opacity.value = withSequence(
        withDelay(200, withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.ease) })),
        withTiming(1,  { duration: 700, easing: Easing.inOut(Easing.ease) }),
      );
    };
    const id = setInterval(loop, 1600);
    return () => clearInterval(id);
  }, [active]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

// ─── AnimatedPressable — TouchableOpacity with spring scale ──────────────────

interface AnimatedPressableProps extends TouchableOpacityProps {
  pressedScale?: number;
  haptic?:       HapticStyle | null;
  style?:        ViewStyle | ViewStyle[];
  children:      React.ReactNode;
}

export const AnimatedPressable = memo(({
  pressedScale = 0.93,
  haptic       = 'light',
  onPress,
  style,
  children,
  disabled,
  ...rest
}: AnimatedPressableProps) => {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress({ pressedScale });

  const handlePress = useCallback((e: any) => {
    if (haptic) triggerHaptic(haptic);
    onPress?.(e);
  }, [haptic, onPress]);

  return (
    <Animated.View style={[animatedStyle, style as any]}>
      <TouchableOpacity
        onPress={disabled ? undefined : handlePress}
        onPressIn={disabled ? undefined : onPressIn}
        onPressOut={disabled ? undefined : onPressOut}
        activeOpacity={1}   // we control opacity via animation
        disabled={disabled}
        {...rest}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── FadeIn — mounts with an opacity + optional translateY fade-in ─────────────

interface FadeInProps {
  children:    React.ReactNode;
  duration?:   number;
  delay?:      number;
  /** Slide up from this many px below — pass 0 for pure fade */
  fromY?:      number;
  style?:      ViewStyle;
}

export const FadeIn = memo(({ children, duration = 300, delay = 0, fromY = 8, style }: FadeInProps) => {
  const opacity   = useSharedValue(0);
  const translateY = useSharedValue(fromY);

  useEffect(() => {
    opacity.value    = withDelay(delay, withTiming(1,    { duration, easing: Easing.out(Easing.ease) }));
    translateY.value = withDelay(delay, withTiming(0,    { duration, easing: Easing.out(Easing.ease) }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
});

// ─── SlideIn — slides in from left/right/top/bottom ──────────────────────────

type SlideDirection = 'left' | 'right' | 'up' | 'down';

interface SlideInProps {
  children:    React.ReactNode;
  direction?:  SlideDirection;
  distance?:   number;
  duration?:   number;
  delay?:      number;
  style?:      ViewStyle;
}

export const SlideIn = memo(({
  children,
  direction = 'up',
  distance  = 24,
  duration  = 350,
  delay     = 0,
  style,
}: SlideInProps) => {
  const dx = direction === 'left' ? distance : direction === 'right' ? -distance : 0;
  const dy = direction === 'up'   ? distance : direction === 'down'  ? -distance : 0;

  const translateX = useSharedValue(dx);
  const translateY = useSharedValue(dy);
  const opacity    = useSharedValue(0);

  useEffect(() => {
    const cfg = { duration, easing: Easing.out(Easing.cubic) };
    translateX.value = withDelay(delay, withTiming(0, cfg));
    translateY.value = withDelay(delay, withTiming(0, cfg));
    opacity.value    = withDelay(delay, withTiming(1, { duration: duration * 0.6 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
});

// ─── useCounterAnimation — animates a number change ──────────────────────────

/**
 * Animate a count change with a quick scale pop.
 * Returns the animated style to apply to the Text wrapper.
 */
export function useCounterAnimation(value: number) {
  const scale   = useSharedValue(1);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value !== prevRef.current) {
      scale.value = withSequence(
        withSpring(1.2, { stiffness: 500, damping: 10 }),
        withSpring(1,   { stiffness: 300, damping: 15 }),
      );
      prevRef.current = value;
    }
  }, [value]);

  return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
}
