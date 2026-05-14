import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  Share,
  useWindowDimensions,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { ChevronLeft } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import {
  BLACK, WHITE, GREY, CARD, GRADIENT_COLORS, PURPLE, PINK,
  NICHE_COLORS, PLATFORM_BADGE_COLORS,
} from '@/constants/TrendJackColors';
import { getDeviceId } from '@/utils/tjStorage';
import { fetchTrendById, fetchSaved, saveTrend, TJTrend, TJTemplate } from '@/utils/tjApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPlatformColor(platform: string): string {
  const key = platform?.toLowerCase() ?? '';
  if (key.includes('tiktok')) return PLATFORM_BADGE_COLORS.tiktok;
  if (key.includes('instagram')) return PLATFORM_BADGE_COLORS.instagram;
  return PLATFORM_BADGE_COLORS.both;
}

function getNicheColor(niche: string): string {
  return NICHE_COLORS[niche?.toLowerCase()] ?? PURPLE;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBlock({ height = 80 }: { height?: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View
      style={{
        opacity,
        backgroundColor: CARD,
        borderRadius: 16,
        height,
        marginBottom: 12,
      }}
    />
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    console.log('[TJTrendDetail] Copy button pressed for:', label);
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const buttonText = copied ? 'Copied! ✓' : 'Copy';

  return (
    <AnimatedPressable
      onPress={handleCopy}
      style={{
        backgroundColor: copied ? '#00D4AA22' : '#1E1E1E',
        borderRadius: 8,
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: copied ? '#00D4AA55' : '#333333',
      }}
    >
      <Text style={{ color: copied ? '#00D4AA' : GREY, fontSize: 12, fontWeight: '700' }}>
        {buttonText}
      </Text>
    </AnimatedPressable>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({ template, width }: { template: TJTemplate; width: number }) {
  const cardWidth = width - 48;

  return (
    <View
      style={{
        width: cardWidth,
        backgroundColor: CARD,
        borderRadius: 16,
        padding: 16,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#2A2A2A',
        borderCurve: 'continuous',
      }}
    >
      {/* Hook */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: PURPLE, fontSize: 13, fontWeight: '800' }}>🎣 Hook</Text>
          <CopyButton text={template.hook} label="hook" />
        </View>
        <Text style={{ color: WHITE, fontSize: 14, fontWeight: '700', lineHeight: 20 }}>
          {template.hook}
        </Text>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: '#2A2A2A', marginBottom: 16 }} />

      {/* Script */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: PURPLE, fontSize: 13, fontWeight: '800' }}>📝 Script</Text>
          <CopyButton text={template.script} label="script" />
        </View>
        <Text style={{ color: GREY, fontSize: 13, lineHeight: 20 }}>
          {template.script}
        </Text>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: '#2A2A2A', marginBottom: 16 }} />

      {/* Caption */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: PURPLE, fontSize: 13, fontWeight: '800' }}>💬 Caption</Text>
          <CopyButton text={template.caption} label="caption" />
        </View>
        <Text style={{ color: GREY, fontSize: 13, lineHeight: 20 }}>
          {template.caption}
        </Text>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: '#2A2A2A', marginBottom: 16 }} />

      {/* CTA */}
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: PURPLE, fontSize: 13, fontWeight: '800' }}>📣 Call To Action</Text>
          <CopyButton text={template.call_to_action} label="CTA" />
        </View>
        <Text style={{ color: WHITE, fontSize: 14, fontWeight: '700', lineHeight: 20 }}>
          {template.call_to_action}
        </Text>
      </View>
    </View>
  );
}

// ─── Trend Detail Screen ──────────────────────────────────────────────────────

export default function TrendDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [trend, setTrend] = useState<TJTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTemplateIndex, setActiveTemplateIndex] = useState(0);

  const loadData = useCallback(async () => {
    if (!id) return;
    console.log('[TJTrendDetail] Loading trend id:', id);
    setLoading(true);
    setError(null);
    try {
      const deviceId = await getDeviceId();
      const [trendData, savedData] = await Promise.all([
        fetchTrendById(id),
        fetchSaved(deviceId).catch(() => []),
      ]);
      console.log('[TJTrendDetail] Trend loaded:', trendData.title);
      setTrend(trendData);
      const alreadySaved = savedData.some((s) => s.trend_id === id || s.trend?.id === id);
      setIsSaved(alreadySaved);
      console.log('[TJTrendDetail] Is saved:', alreadySaved);
    } catch (e: any) {
      console.error('[TJTrendDetail] Load error:', e.message);
      setError(e.message ?? 'Failed to load trend');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = useCallback(async () => {
    if (!trend || saving) return;
    console.log('[TJTrendDetail] Save Trend pressed for:', trend.title);
    setSaving(true);
    try {
      await saveTrend(trend.id);
      setIsSaved(true);
      console.log('[TJTrendDetail] Trend saved successfully');
    } catch (e: any) {
      console.error('[TJTrendDetail] Save error:', e.message);
    } finally {
      setSaving(false);
    }
  }, [trend, saving]);

  const handleShare = useCallback(async () => {
    if (!trend) return;
    console.log('[TJTrendDetail] Share pressed for:', trend.title);
    try {
      await Share.share({
        message: `${trend.title} — via TrendJack`,
        title: trend.title,
      });
    } catch (e: any) {
      console.error('[TJTrendDetail] Share error:', e.message);
    }
  }, [trend]);

  const handleBack = () => {
    console.log('[TJTrendDetail] Back button pressed');
    router.back();
  };

  const templates = trend?.templates ?? [];
  const platformColor = getPlatformColor(trend?.platform ?? '');
  const nicheColor = getNicheColor(trend?.niche ?? '');
  const platformLabel = trend?.platform ?? 'Both';
  const nicheLabel = trend?.niche
    ? trend.niche.charAt(0).toUpperCase() + trend.niche.slice(1)
    : 'General';
  const scoreText = `🔥 ${trend?.trend_score ?? 0}/100`;

  const saveButtonText = isSaved ? 'Saved ✓' : saving ? 'Saving...' : 'Save Trend 🔖';

  return (
    <View style={{ flex: 1, backgroundColor: BLACK }}>
      {/* Custom header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <AnimatedPressable
          onPress={handleBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: CARD,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#2A2A2A',
          }}
        >
          <ChevronLeft size={22} color={WHITE} />
        </AnimatedPressable>
        <Text
          style={{ color: WHITE, fontSize: 16, fontWeight: '700', flex: 1 }}
          numberOfLines={1}
        >
          {loading ? 'Loading...' : (trend?.title ?? 'Trend')}
        </Text>
      </View>

      {loading ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          <SkeletonBlock height={200} />
          <SkeletonBlock height={120} />
          <SkeletonBlock height={300} />
        </ScrollView>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
          <Text style={{ fontSize: 40 }}>😵</Text>
          <Text style={{ color: WHITE, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
            Couldn't load trend
          </Text>
          <Text style={{ color: GREY, fontSize: 14, textAlign: 'center' }}>{error}</Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[TJTrendDetail] Try again pressed');
              loadData();
            }}
          >
            <LinearGradient
              colors={GRADIENT_COLORS}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 }}
            >
              <Text style={{ color: WHITE, fontWeight: '700', fontSize: 15 }}>Try Again</Text>
            </LinearGradient>
          </AnimatedPressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header card */}
          <View
            style={{
              backgroundColor: CARD,
              borderRadius: 20,
              margin: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: '#2A2A2A',
              borderCurve: 'continuous',
            }}
          >
            <Text
              style={{
                color: WHITE,
                fontSize: 26,
                fontWeight: '900',
                letterSpacing: -0.6,
                lineHeight: 32,
                marginBottom: 14,
              }}
            >
              {trend?.title}
            </Text>

            {/* Badges */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: platformColor + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: platformColor + '44' }}>
                <Text style={{ color: platformColor, fontSize: 12, fontWeight: '700' }}>{platformLabel}</Text>
              </View>
              <View style={{ backgroundColor: nicheColor + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: nicheColor + '44' }}>
                <Text style={{ color: nicheColor, fontSize: 12, fontWeight: '700' }}>{nicheLabel}</Text>
              </View>
            </View>

            {/* Score */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: WHITE, fontSize: 36, fontWeight: '900', letterSpacing: -1 }}>
                {scoreText}
              </Text>
              <Text style={{ color: GREY, fontSize: 13, marginTop: 2 }}>Trend Score</Text>
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* Save button */}
              <AnimatedPressable
                onPress={handleSave}
                disabled={isSaved || saving}
                style={{ flex: 1, opacity: isSaved ? 0.7 : 1 }}
              >
                {isSaved ? (
                  <View
                    style={{
                      borderRadius: 12,
                      paddingVertical: 14,
                      alignItems: 'center',
                      backgroundColor: '#1E1E1E',
                      borderWidth: 1,
                      borderColor: '#333333',
                    }}
                  >
                    <Text style={{ color: GREY, fontSize: 14, fontWeight: '700' }}>
                      {saveButtonText}
                    </Text>
                  </View>
                ) : (
                  <LinearGradient
                    colors={GRADIENT_COLORS}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                  >
                    <Text style={{ color: WHITE, fontSize: 14, fontWeight: '800' }}>
                      {saveButtonText}
                    </Text>
                  </LinearGradient>
                )}
              </AnimatedPressable>

              {/* Share button */}
              <AnimatedPressable
                onPress={handleShare}
                style={{
                  flex: 1,
                  backgroundColor: '#1E1E1E',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: PURPLE,
                }}
              >
                <Text style={{ color: PURPLE, fontSize: 14, fontWeight: '700' }}>
                  Share 📤
                </Text>
              </AnimatedPressable>
            </View>
          </View>

          {/* Why It's Trending */}
          <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
            <Text
              style={{
                color: WHITE,
                fontSize: 18,
                fontWeight: '800',
                letterSpacing: -0.3,
                marginBottom: 12,
              }}
            >
              Why It's Trending 🧠
            </Text>
            <Text style={{ color: GREY, fontSize: 15, lineHeight: 24 }}>
              {trend?.why_trending}
            </Text>
          </View>

          {/* Templates section */}
          {templates.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  color: WHITE,
                  fontSize: 18,
                  fontWeight: '800',
                  letterSpacing: -0.3,
                  marginBottom: 12,
                  paddingHorizontal: 16,
                }}
              >
                Ready To Use Templates ⚡
              </Text>

              <FlatList
                data={templates}
                keyExtractor={(item, index) => item.id ?? String(index)}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                onMomentumScrollEnd={(e) => {
                  const cardWidth = width - 48 + 12;
                  const index = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
                  setActiveTemplateIndex(index);
                }}
                renderItem={({ item }) => (
                  <TemplateCard template={item} width={width} />
                )}
              />

              {/* Page dots */}
              {templates.length > 1 && (
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                  {templates.map((_, i) => (
                    <View
                      key={i}
                      style={{
                        width: i === activeTemplateIndex ? 20 : 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: i === activeTemplateIndex ? PURPLE : '#333333',
                      }}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {templates.length === 0 && !loading && (
            <View
              style={{
                marginHorizontal: 16,
                backgroundColor: CARD,
                borderRadius: 16,
                padding: 20,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#2A2A2A',
              }}
            >
              <Text style={{ fontSize: 32, marginBottom: 8 }}>⚡</Text>
              <Text style={{ color: WHITE, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
                Templates coming soon
              </Text>
              <Text style={{ color: GREY, fontSize: 13, textAlign: 'center', marginTop: 4 }}>
                We're generating ready-to-use templates for this trend.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
