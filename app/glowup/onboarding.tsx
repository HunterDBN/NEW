import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { markOnboardingDone } from '@/utils/glowupStorage';
import { BG, DEEP_ROSE, DARK_GREY, ROSE, LILAC } from '@/constants/GlowUpColors';

const { width } = Dimensions.get('window');

const CARDS = [
  {
    emoji: '🌸',
    headline: 'Welcome to your glow era 🌸',
    subtext:
      'GlowUp is your safe space to grow, share, and shine — surrounded by women who get it.',
  },
  {
    emoji: '✨',
    headline: 'Track every part of your glow ✨',
    subtext:
      'Fitness. Skin. Mind. Style. Confidence. Career. Whatever you are working on — GlowUp has a space for it.',
  },
  {
    emoji: '💕',
    headline: 'Your girls are waiting 💕',
    subtext:
      'Join a community that lifts you up, cheers you on, and celebrates every single win no matter how small.',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  const handleStart = async () => {
    console.log('[GlowUp Onboarding] Starting glow journey');
    await markOnboardingDone();
    router.replace('/glowup/auth');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
      >
        {CARDS.map((card, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.emoji}>{card.emoji}</Text>
            <Text style={styles.headline}>{card.headline}</Text>
            <Text style={styles.subtext}>{card.subtext}</Text>
            {i === 2 && (
              <TouchableOpacity onPress={handleStart} activeOpacity={0.85} style={styles.btnWrapper}>
                <LinearGradient
                  colors={[ROSE, LILAC]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btn}
                >
                  <Text style={styles.btnText}>Start My Glow Journey</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      <View style={styles.dots}>
        {CARDS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  card: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 80,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: DEEP_ROSE,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  subtext: {
    fontSize: 16,
    color: DARK_GREY,
    textAlign: 'center',
    lineHeight: 24,
  },
  btnWrapper: {
    marginTop: 40,
    width: '100%',
  },
  btn: {
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  dots: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#F4A7B9',
    width: 20,
  },
  dotInactive: {
    backgroundColor: '#E0C8D0',
  },
});
