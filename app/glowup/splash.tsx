import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { hasCompletedOnboarding } from '@/utils/glowupStorage';
import { BG, DEEP_ROSE, DARK_GREY, LILAC } from '@/constants/GlowUpColors';

const ROSE = '#F4A7B9';

export default function GlowUpSplash() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const sparkle1 = useRef(new Animated.Value(0.8)).current;
  const sparkle2 = useRef(new Animated.Value(0.8)).current;
  const sparkle3 = useRef(new Animated.Value(0.8)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const hasNavigated = useRef(false);

  const [buttonVisible, setButtonVisible] = useState(false);

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    setTimeout(() => setButtonVisible(true), 800);

    // Sparkle animations staggered
    const makeSparkle = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.8, duration: 600, useNativeDriver: true }),
        ])
      );

    makeSparkle(sparkle1, 0).start();
    makeSparkle(sparkle2, 200).start();
    makeSparkle(sparkle3, 400).start();
  }, []);

  useEffect(() => {
    if (buttonVisible) {
      Animated.timing(buttonOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [buttonVisible]);

  const navigate = useCallback(async () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    console.log('[GlowUp Splash] Checking onboarding status');
    const done = await hasCompletedOnboarding();
    if (!done) {
      console.log('[GlowUp Splash] Navigating to onboarding');
      router.replace('/glowup/onboarding');
    } else if (user) {
      console.log('[GlowUp Splash] User logged in, navigating to tabs');
      router.replace('/(tabs)');
    } else {
      console.log('[GlowUp Splash] No user, navigating to auth');
      router.replace('/glowup/auth');
    }
  }, [user, router]);

  useEffect(() => {
    // Always navigate after 2.5 seconds max regardless of auth state
    const timer = setTimeout(navigate, 2500);

    // Navigate immediately once auth resolves
    if (!loading) {
      clearTimeout(timer);
      navigate();
    }

    return () => clearTimeout(timer);
  }, [loading, user, navigate]);

  const handleEnterPress = () => {
    console.log('[GlowUp Splash] "Enter the App" button pressed');
    navigate();
  };

  return (
    <View style={styles.container}>
      {/* Glow blob */}
      <View style={styles.glowBlob} />

      {/* Sparkles */}
      <Animated.Text style={[styles.sparkle, styles.sparkle1, { transform: [{ scale: sparkle1 }] }]}>
        ✨
      </Animated.Text>
      <Animated.Text style={[styles.sparkle, styles.sparkle2, { transform: [{ scale: sparkle2 }] }]}>
        ✨
      </Animated.Text>
      <Animated.Text style={[styles.sparkle, styles.sparkle3, { transform: [{ scale: sparkle3 }] }]}>
        ✨
      </Animated.Text>

      {/* Logo */}
      <Animated.View style={{ transform: [{ scale: logoScale }], opacity: logoOpacity, alignItems: 'center' }}>
        <Text style={styles.logo}>GlowUp</Text>
        <Text style={styles.tagline}>Your glow era starts here.</Text>
      </Animated.View>

      {/* Enter button */}
      <Animated.View style={{ opacity: buttonOpacity, marginTop: 48 }}>
        <TouchableOpacity onPress={handleEnterPress} activeOpacity={0.85}>
          <LinearGradient
            colors={[ROSE, '#C9A8E0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Enter the App ✨</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowBlob: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: LILAC,
    opacity: 0.3,
  },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    color: DEEP_ROSE,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: DARK_GREY,
    marginTop: 8,
    fontStyle: 'italic',
  },
  sparkle: {
    position: 'absolute',
    fontSize: 24,
  },
  sparkle1: {
    top: '30%',
    left: '20%',
  },
  sparkle2: {
    top: '25%',
    right: '18%',
  },
  sparkle3: {
    bottom: '32%',
    right: '25%',
  },
  button: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
