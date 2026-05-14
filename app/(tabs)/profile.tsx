import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Linking,
  RefreshControl,
  ImageSourcePropType,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, Pencil } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { getMyProfile, getUserPosts, GlowProfile, GlowPost } from '@/utils/glowupApi';
import { getJournalEntries } from '@/utils/glowupApi';
import { getJoinedChallenges } from '@/utils/glowupApi';
import {
  BG, DEEP_ROSE, DARK_GREY, ROSE, LILAC, CARD, LIGHT_GREY,
  CATEGORY_COLORS, CATEGORY_EMOJIS, GOLD_GRADIENT,
} from '@/constants/GlowUpColors';

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function getInitials(name: string): string {
  return (name || 'G')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Profile() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<GlowProfile | null>(null);
  const [posts, setPosts] = useState<GlowPost[]>([]);
  const [journalCount, setJournalCount] = useState(0);
  const [challengeCount, setChallengeCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    console.log('[GlowUp Profile] Loading profile data');
    try {
      const [profileData, postsData, journalData, challengeData] = await Promise.all([
        getMyProfile(),
        getUserPosts(user.id),
        getJournalEntries(),
        getJoinedChallenges(),
      ]);
      setProfile(profileData?.profile || profileData);
      const pList = Array.isArray(postsData) ? postsData : (postsData?.posts || postsData?.data || []);
      setPosts(pList);
      const jList = Array.isArray(journalData) ? journalData : (journalData?.entries || journalData?.data || []);
      setJournalCount(jList.length);
      const cList = Array.isArray(challengeData) ? challengeData : (challengeData?.challenges || challengeData?.data || []);
      setChallengeCount(cList.length);
    } catch (e) {
      console.error('[GlowUp Profile] Error loading:', e);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (!authLoading && !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.authGate}>
          <Text style={styles.authGateEmoji}>💫</Text>
          <Text style={styles.authGateTitle}>Your Glow Profile</Text>
          <Text style={styles.authGateText}>Sign in to see your profile and track your glow journey 🌸</Text>
          <TouchableOpacity
            onPress={() => {
              console.log('[GlowUp Profile] Auth gate sign in pressed');
              router.push('/glowup/auth');
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[ROSE, LILAC]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.authGateBtn}
            >
              <Text style={styles.authGateBtnText}>Sign In 💕</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = profile?.name || user?.name || 'Glow Girl';
  const username = profile?.username || '';
  const bio = profile?.bio || '';
  const profilePhoto = profile?.profile_photo || '';
  const glowAreas = profile?.glow_areas ? profile.glow_areas.split(',').filter(Boolean) : [];
  const initials = getInitials(displayName);
  const postsCount = posts.length;

  const hasInstagram = !!profile?.instagram_url;
  const hasTikTok = !!profile?.tiktok_url;
  const hasPinterest = !!profile?.pinterest_url;
  const hasYouTube = !!profile?.youtube_url;
  const hasSocialLinks = hasInstagram || hasTikTok || hasPinterest || hasYouTube;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ROSE} />}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => {
              console.log('[GlowUp Profile] Settings pressed');
              router.push('/glowup/settings');
            }}
            activeOpacity={0.7}
          >
            <Settings size={22} color={DARK_GREY} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Profile</Text>
          <TouchableOpacity
            onPress={() => {
              console.log('[GlowUp Profile] Edit profile pressed');
              router.push('/glowup/edit-profile');
            }}
            activeOpacity={0.7}
          >
            <Pencil size={22} color={ROSE} />
          </TouchableOpacity>
        </View>

        {/* Profile photo */}
        <View style={styles.profilePhotoContainer}>
          {profilePhoto ? (
            <Image source={resolveImageSource(profilePhoto)} style={styles.profilePhoto} />
          ) : (
            <View style={styles.profilePhotoPlaceholder}>
              <Text style={styles.profileInitials}>{initials}</Text>
            </View>
          )}
        </View>

        {/* Name & username */}
        <Text style={styles.displayName}>{displayName}</Text>
        {username ? <Text style={styles.username}>@{username}</Text> : null}
        {bio ? <Text style={styles.bio}>{bio}</Text> : null}

        {/* Glow areas */}
        {glowAreas.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.glowAreasScroll}
            style={styles.glowAreasContainer}
          >
            {glowAreas.map(area => {
              const color = CATEGORY_COLORS[area] || ROSE;
              const emoji = CATEGORY_EMOJIS[area] || '✨';
              const label = area.charAt(0).toUpperCase() + area.slice(1);
              return (
                <View key={area} style={[styles.glowAreaPill, { backgroundColor: color }]}>
                  <Text style={styles.glowAreaText}>{emoji} {label}</Text>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statCount}>{postsCount}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statCount}>{challengeCount}</Text>
            <Text style={styles.statLabel}>Challenges</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statCount}>{journalCount}</Text>
            <Text style={styles.statLabel}>Journal Entries</Text>
          </View>
        </View>

        {/* Social links */}
        {hasSocialLinks && (
          <View style={styles.socialRow}>
            {hasInstagram && (
              <TouchableOpacity
                onPress={() => {
                  console.log('[GlowUp Profile] Instagram link pressed');
                  Linking.openURL(profile!.instagram_url);
                }}
                style={styles.socialBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.socialIcon}>📸</Text>
              </TouchableOpacity>
            )}
            {hasTikTok && (
              <TouchableOpacity
                onPress={() => {
                  console.log('[GlowUp Profile] TikTok link pressed');
                  Linking.openURL(profile!.tiktok_url);
                }}
                style={styles.socialBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.socialIcon}>🎵</Text>
              </TouchableOpacity>
            )}
            {hasPinterest && (
              <TouchableOpacity
                onPress={() => {
                  console.log('[GlowUp Profile] Pinterest link pressed');
                  Linking.openURL(profile!.pinterest_url);
                }}
                style={styles.socialBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.socialIcon}>📌</Text>
              </TouchableOpacity>
            )}
            {hasYouTube && (
              <TouchableOpacity
                onPress={() => {
                  console.log('[GlowUp Profile] YouTube link pressed');
                  Linking.openURL(profile!.youtube_url);
                }}
                style={styles.socialBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.socialIcon}>▶️</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Posts grid */}
        {posts.length > 0 && (
          <View style={styles.postsSection}>
            <Text style={styles.sectionTitle}>My Posts ✨</Text>
            <View style={styles.postsGrid}>
              {posts.map((post, index) => {
                const isLeft = index % 2 === 0;
                const catColor = CATEGORY_COLORS[post.category] || ROSE;
                return (
                  <TouchableOpacity
                    key={post.id}
                    style={[styles.postGridItem, isLeft ? { marginRight: 6 } : { marginLeft: 6 }]}
                    onPress={() => {
                      console.log(`[GlowUp Profile] Post tapped: ${post.id}`);
                      router.push(`/glowup/post/${post.id}` as any);
                    }}
                    activeOpacity={0.85}
                  >
                    {post.image_url ? (
                      <Image source={resolveImageSource(post.image_url)} style={styles.postGridImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.postGridText, { borderTopColor: catColor }]}>
                        <Text style={styles.postGridTextContent} numberOfLines={4}>
                          {post.content}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Premium banner */}
        {!profile?.is_premium && (
          <TouchableOpacity
            onPress={() => {
              console.log('[GlowUp Profile] Premium banner pressed');
              Alert.alert(
                'GlowUp Premium 👑',
                'Unlock all challenges, remove ads, and get exclusive content.\n\nComing soon — stay tuned! 💫',
                [{ text: 'Got it 💕', style: 'default' }]
              );
            }}
            activeOpacity={0.9}
            style={styles.premiumBannerWrapper}
          >
            <LinearGradient
              colors={GOLD_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.premiumBanner}
            >
              <Text style={styles.premiumTitle}>Unlock Premium 👑</Text>
              <Text style={styles.premiumSubtext}>
                Remove ads, unlock all challenges, and get exclusive content.
              </Text>
              <View style={styles.premiumBtn}>
                <Text style={styles.premiumBtnText}>Upgrade 💫</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DEEP_ROSE,
  },
  profilePhotoContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  profilePhoto: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: ROSE,
  },
  profilePhotoPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: LIGHT_GREY,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: ROSE,
  },
  profileInitials: {
    fontSize: 28,
    fontWeight: '700',
    color: DEEP_ROSE,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: DEEP_ROSE,
    textAlign: 'center',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: DARK_GREY,
    textAlign: 'center',
    marginBottom: 6,
  },
  bio: {
    fontSize: 13,
    color: DARK_GREY,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 32,
    lineHeight: 18,
    marginBottom: 12,
  },
  glowAreasContainer: {
    maxHeight: 40,
    marginBottom: 16,
  },
  glowAreasScroll: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },
  glowAreaPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  glowAreaText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#F4A7B9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statCount: {
    fontSize: 22,
    fontWeight: '800',
    color: DEEP_ROSE,
  },
  statLabel: {
    fontSize: 11,
    color: DARK_GREY,
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: LIGHT_GREY,
    marginVertical: 4,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F4A7B9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  socialIcon: {
    fontSize: 20,
  },
  postsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DEEP_ROSE,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  postGridItem: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  postGridImage: {
    width: '100%',
    height: 140,
    borderRadius: 12,
  },
  postGridText: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    borderTopWidth: 3,
  },
  postGridTextContent: {
    fontSize: 12,
    color: DARK_GREY,
    lineHeight: 17,
  },
  premiumBannerWrapper: {
    marginHorizontal: 16,
    marginBottom: 30,
    borderRadius: 20,
    overflow: 'hidden',
  },
  premiumBanner: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  premiumSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  premiumBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  premiumBtnText: {
    color: '#B5446E',
    fontWeight: '700',
    fontSize: 14,
  },
  authGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  authGateEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  authGateTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: DEEP_ROSE,
    marginBottom: 8,
  },
  authGateText: {
    fontSize: 14,
    color: DARK_GREY,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  authGateBtn: {
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  authGateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
