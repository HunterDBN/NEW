import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import {
  BLACK, WHITE, GREY, CARD, GRADIENT_COLORS, PURPLE,
} from '@/constants/TrendJackColors';

const SLIDES = [
  {
    id: '1',
    emoji: '🔥',
    headline: "What's blowing up right now?",
    subtext:
      'TrendJack tracks viral trends across every niche in real time so you never miss what\'s hot.',
  },
  {
    id: '2',
    emoji: '🧠',
    headline: 'Know exactly why it\'s trending',
    subtext:
      'We break down the reason behind every trend so you can replicate the formula and go viral.',
  },
  {
    id: '3',
    emoji: '🚀',
    headline: 'Copy. Post. Go viral.',
    subtext:
      'Every trend comes with a ready-to-use script, hook, and caption. Just copy and post.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const goToNicheSelection = () => {
    console.log('[TJOnboarding] Navigating to niche selection');
    router.replace('/trendjack/niche-selection' as any);
  };

  const handleSkip = () => {
    console.log('[TJOnboarding] Skip pressed');
    goToNicheSelection();
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleMomentumScrollEnd = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BLACK }}>
      {/* Skip button */}
      {activeIndex < 2 && (
        <Pressable
          onPress={handleSkip}
          style={{
            position: 'absolute',
            top: insets.top + 16,
            right: 20,
            zIndex: 10,
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: GREY, fontSize: 15, fontWeight: '600' }}>Skip</Text>
        </Pressable>
      )}

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => (
          <SlideCard
            item={item}
            width={width}
            insets={insets}
            isLast={index === SLIDES.length - 1}
            onCTA={goToNicheSelection}
          />
        )}
      />

      {/* Dot indicators */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
          paddingBottom: insets.bottom + 32,
        }}
      >
        {SLIDES.map((_, i) => {
          const isActive = i === activeIndex;
          return (
            <Animated.View
              key={i}
              style={{
                width: isActive ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: isActive ? PURPLE : '#333333',
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

function SlideCard({
  item,
  width,
  insets,
  isLast,
  onCTA,
}: {
  item: typeof SLIDES[0];
  width: number;
  insets: { top: number; bottom: number };
  isLast: boolean;
  onCTA: () => void;
}) {
  return (
    <View
      style={{
        width,
        flex: 1,
        paddingHorizontal: 32,
        paddingTop: insets.top + 80,
        paddingBottom: insets.bottom + 80,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Emoji circle */}
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 36,
          backgroundColor: CARD,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 40,
          borderWidth: 1,
          borderColor: '#2A2A2A',
          boxShadow: '0 0 40px rgba(123, 47, 255, 0.2)',
        }}
      >
        <Text style={{ fontSize: 56 }}>{item.emoji}</Text>
      </View>

      <Text
        style={{
          color: WHITE,
          fontSize: 30,
          fontWeight: '900',
          textAlign: 'center',
          letterSpacing: -0.8,
          lineHeight: 36,
          marginBottom: 16,
        }}
      >
        {item.headline}
      </Text>

      <Text
        style={{
          color: GREY,
          fontSize: 16,
          textAlign: 'center',
          lineHeight: 24,
          maxWidth: 300,
        }}
      >
        {item.subtext}
      </Text>

      {isLast && (
        <AnimatedPressable
          onPress={() => {
            console.log('[TJOnboarding] Pick Your Niches button pressed');
            onCTA();
          }}
          style={{ marginTop: 48, width: '100%' }}
        >
          <LinearGradient
            colors={GRADIENT_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: WHITE, fontSize: 17, fontWeight: '800', letterSpacing: 0.3 }}>
              Pick Your Niches ✨
            </Text>
          </LinearGradient>
        </AnimatedPressable>
      )}
    </View>
  );
}
