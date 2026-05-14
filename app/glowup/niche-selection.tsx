import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { updateProfile } from '@/utils/glowupApi';
import { markNichesSelected } from '@/utils/glowupStorage';
import {
  BG,
  DEEP_ROSE,
  DARK_GREY,
  ROSE,
  LILAC,
  CARD,
  LIGHT_GREY,
  ALL_CATEGORIES,
  CATEGORY_EMOJIS,
} from '@/constants/GlowUpColors';

export default function NicheSelection() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = (cat: string) => {
    console.log(`[GlowUp Niche] Toggled category: ${cat}`);
    setSelected(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleContinue = async () => {
    console.log('[GlowUp Niche] Continuing with selections:', selected);
    setLoading(true);
    try {
      if (selected.length > 0) {
        await updateProfile({ glow_areas: selected.join(',') });
      }
      await markNichesSelected();
      router.replace('/(tabs)');
    } catch (e) {
      console.error('[GlowUp Niche] Error saving niches:', e);
      // Still navigate even if save fails
      await markNichesSelected();
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>What are you glowing up? 🌷</Text>
        <Text style={styles.subtext}>
          Pick everything you are working on. You can always change this later.
        </Text>

        <View style={styles.grid}>
          {ALL_CATEGORIES.map(cat => {
            const isSelected = selected.includes(cat);
            const emoji = CATEGORY_EMOJIS[cat] || '✨';
            const label = cat.charAt(0).toUpperCase() + cat.slice(1);

            if (isSelected) {
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => toggle(cat)}
                  activeOpacity={0.85}
                  style={styles.pillWrapper}
                >
                  <LinearGradient
                    colors={[ROSE, LILAC]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.pill}
                  >
                    <Text style={styles.pillEmoji}>{emoji}</Text>
                    <Text style={styles.pillTextSelected}>{label}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                key={cat}
                onPress={() => toggle(cat)}
                activeOpacity={0.85}
                style={[styles.pillWrapper, styles.pillUnselected]}
              >
                <Text style={styles.pillEmoji}>{emoji}</Text>
                <Text style={styles.pillTextUnselected}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.85}
          style={styles.btnWrapper}
        >
          <LinearGradient
            colors={[ROSE, LILAC]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btn}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnText}>Let's Glow 💫</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    fontSize: 26,
    fontWeight: '800',
    color: DEEP_ROSE,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtext: {
    fontSize: 14,
    color: DARK_GREY,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    marginBottom: 32,
  },
  pillWrapper: {
    width: '44%',
    borderRadius: 50,
    overflow: 'hidden',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 50,
    gap: 6,
  },
  pillUnselected: {
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: '#F4A7B9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  pillEmoji: {
    fontSize: 18,
  },
  pillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  pillTextUnselected: {
    color: DEEP_ROSE,
    fontWeight: '600',
    fontSize: 14,
  },
  btnWrapper: {
    width: '100%',
  },
  btn: {
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
