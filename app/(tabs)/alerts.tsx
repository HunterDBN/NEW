import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import {
  getChallenges,
  getJoinedChallenges,
  logChallengeEntry,
  GlowChallenge,
} from '@/utils/glowupApi';
import {
  BG, DEEP_ROSE, DARK_GREY, ROSE, LILAC, CARD, LIGHT_GREY,
  CATEGORY_COLORS, CATEGORY_EMOJIS, ALL_CATEGORIES,
} from '@/constants/GlowUpColors';

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function Challenges() {
  const router = useRouter();
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<GlowChallenge[]>([]);
  const [joinedChallenges, setJoinedChallenges] = useState<GlowChallenge[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [checkInNote, setCheckInNote] = useState('');
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    console.log('[GlowUp Challenges] Loading challenges');
    try {
      const [challengesData, joinedData] = await Promise.all([
        getChallenges(activeCategory !== 'All' ? activeCategory : undefined),
        user ? getJoinedChallenges() : Promise.resolve([]),
      ]);
      const cList = Array.isArray(challengesData) ? challengesData : (challengesData?.challenges || challengesData?.data || []);
      const jList = Array.isArray(joinedData) ? joinedData : (joinedData?.challenges || joinedData?.data || []);
      setChallenges(cList);
      setJoinedChallenges(jList);
    } catch (e) {
      console.error('[GlowUp Challenges] Error loading:', e);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, user]);

  useEffect(() => {
    loadData();
  }, [activeCategory]);

  const handleCheckIn = async () => {
    if (!user) {
      router.push('/glowup/auth');
      return;
    }
    if (joinedChallenges.length === 0) return;
    const activeChallenge = joinedChallenges[0];
    const dayNumber = (activeChallenge.latest_day || 0) + 1;
    console.log(`[GlowUp Challenges] Logging check-in for challenge: ${activeChallenge.id}, day: ${dayNumber}`);
    setCheckInLoading(true);
    try {
      await logChallengeEntry(activeChallenge.id, {
        day_number: dayNumber,
        note: checkInNote || 'Showing up today! 🌸',
      });
      setCheckInNote('');
      Alert.alert('You are glowing 🌸', 'Check-in logged! Keep it up!');
      loadData();
    } catch (e) {
      console.error('[GlowUp Challenges] Check-in error:', e);
      Alert.alert('Oops', 'Could not log check-in. Try again!');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleJoin = async (challenge: GlowChallenge) => {
    if (!user) {
      console.log('[GlowUp Challenges] Join pressed, not logged in');
      router.push('/glowup/auth');
      return;
    }
    if (challenge.is_premium) {
      console.log('[GlowUp Challenges] Premium challenge join attempt:', challenge.id);
      Alert.alert(
        'GlowUp Premium 👑',
        'This challenge is part of GlowUp Premium 👑\nUpgrade to unlock all challenges and exclusive content.',
        [{ text: 'OK' }]
      );
      return;
    }
    console.log(`[GlowUp Challenges] Joining challenge: ${challenge.id}`);
    setJoiningId(challenge.id);
    try {
      await logChallengeEntry(challenge.id, { day_number: 1, note: 'Started!' });
      Alert.alert('You are glowing 🌸', 'Challenge started! Show up every day 💪');
      loadData();
    } catch (e) {
      console.error('[GlowUp Challenges] Join error:', e);
      Alert.alert('Oops', 'Could not join challenge. Try again!');
    } finally {
      setJoiningId(null);
    }
  };

  const categories = ['All', ...ALL_CATEGORIES];
  const activeChallenge = joinedChallenges[0];
  const dayNumber = activeChallenge ? (activeChallenge.latest_day || 0) + 1 : 1;
  const durationDays = activeChallenge ? activeChallenge.duration_days : 30;

  const renderChallenge = ({ item }: { item: GlowChallenge }) => {
    const catColor = CATEGORY_COLORS[item.category] || ROSE;
    const catEmoji = CATEGORY_EMOJIS[item.category] || '✨';
    const catLabel = item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : '';
    const isJoining = joiningId === item.id;

    return (
      <View style={styles.challengeCard}>
        {/* Cover image */}
        <View style={styles.coverImageContainer}>
          {item.cover_image ? (
            <Image source={resolveImageSource(item.cover_image)} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <LinearGradient colors={[catColor, LILAC]} style={styles.coverImagePlaceholder}>
              <Text style={styles.coverEmoji}>{catEmoji}</Text>
            </LinearGradient>
          )}
          {item.is_premium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>👑 Premium</Text>
            </View>
          )}
        </View>

        <View style={styles.challengeBody}>
          {/* Badges */}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: catColor }]}>
              <Text style={styles.badgeText}>{catEmoji} {catLabel}</Text>
            </View>
            <View style={styles.durationBadge}>
              <Text style={styles.durationBadgeText}>{item.duration_days} days</Text>
            </View>
          </View>

          <Text style={styles.challengeTitle}>{item.title}</Text>
          <Text style={styles.challengeDesc} numberOfLines={2}>{item.description}</Text>

          <TouchableOpacity
            onPress={() => handleJoin(item)}
            disabled={isJoining}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[ROSE, LILAC]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.joinBtn}
            >
              {isJoining ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.joinBtnText}>Join Challenge 🌸</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={challenges}
        keyExtractor={item => item.id}
        renderItem={renderChallenge}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Header */}
            <Text style={styles.header}>Glow Challenges ⭐</Text>
            <Text style={styles.subtext}>
              Pick a challenge. Show up every day. Watch yourself transform.
            </Text>

            {/* Active check-in card */}
            {user && activeChallenge && (
              <View style={styles.checkInCard}>
                <LinearGradient
                  colors={[ROSE, LILAC]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.checkInTopBorder}
                />
                <View style={styles.checkInBody}>
                  <Text style={styles.checkInTitle}>{activeChallenge.title}</Text>
                  <Text style={styles.checkInDay}>
                    Day {dayNumber} of {durationDays}
                  </Text>
                  <TextInput
                    style={styles.checkInInput}
                    placeholder="How did today go? 🌸"
                    placeholderTextColor="#CCCCCC"
                    value={checkInNote}
                    onChangeText={setCheckInNote}
                    multiline
                  />
                  <TouchableOpacity
                    onPress={handleCheckIn}
                    disabled={checkInLoading}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[ROSE, LILAC]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.checkInBtn}
                    >
                      {checkInLoading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.checkInBtnText}>Log Today ✨</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Category filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
              style={styles.categoryScrollContainer}
            >
              {categories.map(cat => {
                const isActive = activeCategory === cat;
                const label = cat === 'All' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1);
                if (isActive) {
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => {
                        console.log(`[GlowUp Challenges] Category filter: ${cat}`);
                        setActiveCategory(cat);
                      }}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={[ROSE, LILAC]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.categoryPillActive}
                      >
                        <Text style={styles.categoryPillTextActive}>{label}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => {
                      console.log(`[GlowUp Challenges] Category filter: ${cat}`);
                      setActiveCategory(cat);
                    }}
                    style={styles.categoryPillInactive}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.categoryPillTextInactive}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>⭐</Text>
              <Text style={styles.emptyText}>No challenges yet. Check back soon!</Text>
            </View>
          ) : (
            <ActivityIndicator color={ROSE} style={{ marginTop: 40 }} />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  listContent: {
    paddingBottom: 100,
  },
  header: {
    fontSize: 24,
    fontWeight: '800',
    color: DEEP_ROSE,
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 4,
  },
  subtext: {
    fontSize: 13,
    color: DARK_GREY,
    paddingHorizontal: 20,
    marginBottom: 16,
    lineHeight: 18,
  },
  checkInCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: CARD,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F4A7B9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  checkInTopBorder: {
    height: 4,
    width: '100%',
  },
  checkInBody: {
    padding: 16,
  },
  checkInTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DEEP_ROSE,
    marginBottom: 2,
  },
  checkInDay: {
    fontSize: 12,
    color: '#AAAAAA',
    marginBottom: 12,
  },
  checkInInput: {
    backgroundColor: BG,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: DARK_GREY,
    minHeight: 70,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: LIGHT_GREY,
  },
  checkInBtn: {
    borderRadius: 50,
    paddingVertical: 12,
    alignItems: 'center',
  },
  checkInBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  categoryScrollContainer: {
    maxHeight: 44,
    marginBottom: 16,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  categoryPillActive: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryPillInactive: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: ROSE,
  },
  categoryPillTextInactive: {
    color: DEEP_ROSE,
    fontSize: 12,
    fontWeight: '600',
  },
  challengeCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#F4A7B9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  coverImageContainer: {
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: 140,
  },
  coverImagePlaceholder: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmoji: {
    fontSize: 48,
  },
  premiumBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  premiumBadgeText: {
    color: '#F9C784',
    fontSize: 11,
    fontWeight: '700',
  },
  challengeBody: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  durationBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: LIGHT_GREY,
  },
  durationBadgeText: {
    color: DARK_GREY,
    fontSize: 11,
    fontWeight: '600',
  },
  challengeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: DEEP_ROSE,
    marginBottom: 6,
  },
  challengeDesc: {
    fontSize: 13,
    color: DARK_GREY,
    lineHeight: 18,
    marginBottom: 14,
  },
  joinBtn: {
    borderRadius: 50,
    paddingVertical: 12,
    alignItems: 'center',
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: DEEP_ROSE,
    fontWeight: '600',
  },
});
