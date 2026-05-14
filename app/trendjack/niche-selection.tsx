import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import {
  BLACK, WHITE, GREY, CARD, GRADIENT_COLORS,
  NICHE_COLORS, ALL_NICHES,
} from '@/constants/TrendJackColors';
import { getDeviceId, setOnboardingComplete } from '@/utils/tjStorage';
import { updateProfile } from '@/utils/tjApi';

export default function NicheSelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleNiche = useCallback((niche: string) => {
    console.log('[TJNicheSelection] Niche toggled:', niche);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(niche)) {
        next.delete(niche);
      } else {
        next.add(niche);
      }
      return next;
    });
  }, []);

  const handleLetsGo = useCallback(async () => {
    console.log('[TJNicheSelection] Lets Go pressed — selected niches:', Array.from(selected));
    setLoading(true);
    setError(null);
    try {
      const deviceId = await getDeviceId();
      const nichesStr = Array.from(selected).join(',');
      await updateProfile(deviceId, nichesStr);
      await setOnboardingComplete(true);
      console.log('[TJNicheSelection] Profile updated, navigating to tabs');
      router.replace('/(tabs)' as any);
    } catch (e: any) {
      console.error('[TJNicheSelection] Error saving niches:', e.message);
      setError('Failed to save. Please try again.');
      setLoading(false);
    }
  }, [selected, router]);

  const canProceed = selected.size > 0;

  return (
    <View style={{ flex: 1, backgroundColor: BLACK }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text
          style={{
            color: WHITE,
            fontSize: 32,
            fontWeight: '900',
            letterSpacing: -0.8,
            marginBottom: 10,
          }}
        >
          What are you into?
        </Text>
        <Text
          style={{
            color: GREY,
            fontSize: 15,
            lineHeight: 22,
            marginBottom: 32,
          }}
        >
          Pick your niches and we'll show you what's blowing up for you.
        </Text>

        {/* Niche pills */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ALL_NICHES.map((niche) => {
            const isSelected = selected.has(niche);
            const nicheColor = NICHE_COLORS[niche] ?? '#888888';
            return (
              <NichePill
                key={niche}
                niche={niche}
                isSelected={isSelected}
                color={nicheColor}
                onPress={() => toggleNiche(niche)}
              />
            );
          })}
        </View>

        {error && (
          <Text style={{ color: '#FF4444', fontSize: 14, marginTop: 16, textAlign: 'center' }}>
            {error}
          </Text>
        )}
      </ScrollView>

      {/* Sticky CTA */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 20,
          paddingTop: 16,
          backgroundColor: BLACK,
          borderTopWidth: 1,
          borderTopColor: '#1A1A1A',
        }}
      >
        {selected.size > 0 && (
          <Text style={{ color: GREY, fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
            {selected.size}
            {' niche'}
            {selected.size !== 1 ? 's' : ''}
            {' selected'}
          </Text>
        )}
        <AnimatedPressable
          onPress={handleLetsGo}
          disabled={!canProceed || loading}
          style={{ opacity: canProceed ? 1 : 0.4 }}
        >
          <LinearGradient
            colors={GRADIENT_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading ? (
              <ActivityIndicator color={WHITE} size="small" />
            ) : (
              <Text style={{ color: WHITE, fontSize: 17, fontWeight: '800' }}>
                Let's Go 🚀
              </Text>
            )}
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function NichePill({
  niche,
  isSelected,
  color,
  onPress,
}: {
  niche: string;
  isSelected: boolean;
  color: string;
  onPress: () => void;
}) {
  const label = niche.charAt(0).toUpperCase() + niche.slice(1);

  if (isSelected) {
    return (
      <AnimatedPressable onPress={onPress}>
        <LinearGradient
          colors={[color, color + 'CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: WHITE, fontSize: 14, fontWeight: '700' }}>
            {label}
          </Text>
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: '#333333',
      }}
    >
      <Text style={{ color: GREY, fontSize: 14, fontWeight: '600' }}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}
