import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { isOnboardingComplete } from '@/utils/tjStorage';
import { BLACK, GREY, WHITE, GRADIENT_COLORS } from '@/constants/TrendJackColors';

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    console.log('[TJSplash] Splash screen mounted');
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 6 }),
    ]).start();

    const timer = setTimeout(async () => {
      console.log('[TJSplash] Checking onboarding status...');
      const done = await isOnboardingComplete();
      console.log('[TJSplash] Onboarding complete:', done);
      if (done) {
        router.replace('/(tabs)' as any);
      } else {
        router.replace('/trendjack/onboarding' as any);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ flex: 1, backgroundColor: BLACK, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        {/* Logo glow effect */}
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              overflow: 'hidden',
              marginBottom: 20,
              boxShadow: '0 0 40px rgba(123, 47, 255, 0.6)',
            }}
          >
            <LinearGradient
              colors={GRADIENT_COLORS}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 40 }}>⚡</Text>
            </LinearGradient>
          </View>

          {/* Title with gradient background clip effect */}
          <View style={{ overflow: 'hidden', borderRadius: 4 }}>
            <LinearGradient
              colors={GRADIENT_COLORS}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ paddingHorizontal: 2, paddingVertical: 2 }}
            >
              <View style={{ backgroundColor: BLACK, paddingHorizontal: 4 }}>
                <Text
                  style={{
                    fontSize: 48,
                    fontWeight: '900',
                    color: WHITE,
                    letterSpacing: -1.5,
                  }}
                >
                  TrendJack
                </Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        <Text
          style={{
            color: GREY,
            fontSize: 16,
            letterSpacing: 0.5,
            marginTop: 8,
          }}
        >
          Steal the trend. Own the feed.
        </Text>
      </Animated.View>

      {/* Bottom pulse dots */}
      <View style={{ position: 'absolute', bottom: 60, flexDirection: 'row', gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <PulseDot key={i} delay={i * 200} />
        ))}
      </View>
    </View>
  );
}

function PulseDot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#7B2FFF',
        opacity,
      }}
    />
  );
}
