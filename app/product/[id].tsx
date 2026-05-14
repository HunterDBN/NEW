import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  TextInput,
  ImageSourcePropType,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { formatVND, formatRelativeTime, formatDateTime } from '@/utils/format';
import {
  Package,
  TrendingDown,
  TrendingUp,
  Minus,
  Trash2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Clock,
  FileText,
  Plus,
} from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const API_BASE = 'https://w99rpvg2jykqme8ytyqjerycckd6z729.app.specular.dev';

interface Product {
  tracking_id: string;
  product_name: string;
  platform: 'Shopee' | 'Lazada' | 'TikTok Shop' | 'Other';
  price: number;
  previous_price: number | null;
  price_change: 'dropped' | 'increased' | 'unchanged';
  product_url: string | null;
  image_url: string | null;
  store_name: string | null;
  notes: string | null;
  created_at: string;
  last_updated_at: string;
  description?: string;
  brand?: string;
  category?: string;
}

interface PriceHistoryEntry {
  id: string;
  tracking_id: string;
  price: number;
  note: string | null;
  recorded_at: string;
}

interface ProductDetail extends Product {
  price_history: PriceHistoryEntry[];
}

interface ComparisonEntry {
  store: string;
  price: number;
  currency: string;
  url: string | null;
  is_current: boolean;
  is_best_price: boolean;
}

const PLATFORM_COLORS: Record<string, string> = {
  Shopee: '#EE4D2D',
  Lazada: '#0F146D',
  'TikTok Shop': '#010101',
  Other: '#6B7280',
};

const PRICE_CHANGE_COLORS = {
  dropped: '#22c55e',
  increased: '#ef4444',
  unchanged: '#9ca3af',
};

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function PlatformBadge({ platform }: { platform: string }) {
  const bg = PLATFORM_COLORS[platform] ?? '#6B7280';
  return (
    <View style={{
      backgroundColor: bg,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      alignSelf: 'flex-start',
    }}>
      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
        {platform}
      </Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text style={{
      color: COLORS.textTitle,
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 12,
      letterSpacing: -0.2,
    }}>
      {title}
    </Text>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: COLORS.divider, marginVertical: 12 }} />;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Update price state
  const [showUpdatePrice, setShowUpdatePrice] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [priceNote, setPriceNote] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const [comparisons, setComparisons] = useState<ComparisonEntry[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);

  // Notes state
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);

  const trackingId = id ?? '';

  const fetchData = useCallback(async () => {
    if (!trackingId) return;
    console.log(`[ProductDetail] Fetching GET /api/products/${trackingId}`);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/products/${trackingId}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
      }
      const data: ProductDetail = await res.json();
      console.log(`[ProductDetail] Product loaded: ${data.product_name}`);
      setProduct(data);
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    } catch (e: any) {
      console.error('[ProductDetail] Fetch error:', e?.message ?? e);
      setError(e?.message ?? 'Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [trackingId, fadeAnim]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchComparisons = useCallback(async () => {
    if (!trackingId) return;
    console.log(`[ProductDetail] Fetching GET /api/products/${trackingId}/compare`);
    setCompareLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/products/${trackingId}/compare`);
      if (!res.ok) return;
      const data = await res.json();
      setComparisons(data.comparisons ?? []);
    } catch (e: any) {
      console.warn('[ProductDetail] Compare fetch error:', e?.message);
    } finally {
      setCompareLoading(false);
    }
  }, [trackingId]);

  useEffect(() => {
    fetchData();
    fetchComparisons();
  }, [fetchData, fetchComparisons]);

  const handleUpdatePrice = useCallback(async () => {
    const priceNum = Number(newPrice);
    if (!priceNum || priceNum <= 0) return;
    console.log(`[ProductDetail] Update price pressed — tracking_id: ${trackingId}, price: ${priceNum}`);
    setSavingPrice(true);
    setPriceError(null);
    try {
      const body: Record<string, unknown> = { price: priceNum };
      if (priceNote.trim()) body.note = priceNote.trim();
      console.log(`[ProductDetail] POST /api/products/${trackingId}/price`, JSON.stringify(body));
      const res = await fetch(`${API_BASE}/api/products/${trackingId}/price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
      }
      const updated = await res.json();
      console.log(`[ProductDetail] Price updated successfully:`, updated?.price);
      setNewPrice('');
      setPriceNote('');
      setShowUpdatePrice(false);
      fetchData();
    } catch (e: any) {
      console.error('[ProductDetail] Update price error:', e?.message ?? e);
      setPriceError(e?.message ?? 'Failed to update price');
    } finally {
      setSavingPrice(false);
    }
  }, [trackingId, newPrice, priceNote, fetchData]);

  const handleAddNote = useCallback(async () => {
    const note = noteInput.trim();
    if (!note) return;
    console.log(`[ProductDetail] Add note pressed — tracking_id: ${trackingId}`);
    setSavingNote(true);
    setNoteError(null);
    try {
      console.log(`[ProductDetail] POST /api/products/${trackingId}/notes`, JSON.stringify({ note }));
      const res = await fetch(`${API_BASE}/api/products/${trackingId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
      }
      const updated = await res.json();
      console.log(`[ProductDetail] Note saved successfully`);
      setNoteInput('');
      setShowAddNote(false);
      setProduct((prev) => prev ? { ...prev, notes: updated?.notes ?? note } : prev);
    } catch (e: any) {
      console.error('[ProductDetail] Add note error:', e?.message ?? e);
      setNoteError(e?.message ?? 'Failed to save note');
    } finally {
      setSavingNote(false);
    }
  }, [trackingId, noteInput]);

  const handleDelete = useCallback(() => {
    console.log(`[ProductDetail] Remove from Tracking pressed — tracking_id: ${trackingId}`);
    Alert.alert(
      'Remove from Tracking?',
      'This product will be permanently removed from your tracking list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            console.log(`[ProductDetail] DELETE /api/products/${trackingId}`);
            setDeleting(true);
            try {
              const res = await fetch(`${API_BASE}/api/products/${trackingId}`, {
                method: 'DELETE',
              });
              if (!res.ok) {
                const text = await res.text();
                throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
              }
              console.log(`[ProductDetail] Product ${trackingId} deleted successfully`);
              router.back();
            } catch (e: any) {
              console.error('[ProductDetail] Delete error:', e?.message ?? e);
              Alert.alert('Error', `Couldn't remove: ${e?.message}`);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }, [trackingId, router]);

  const handleRefresh = useCallback(async () => {
    console.log(`[ProductDetail] Refresh pressed — tracking_id: ${trackingId}`);
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch(`${API_BASE}/api/products/${trackingId}/refresh`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && data.product) {
        console.log('[ProductDetail] Refresh succeeded:', data.product.product_name);
        setProduct((prev) => prev ? { ...prev, ...data.product } : prev);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        setRefreshError(data.message ?? 'Could not refresh product data.');
      }
    } catch (e: any) {
      console.error('[ProductDetail] Refresh error:', e?.message);
      setRefreshError('Could not refresh. Check your connection.');
    } finally {
      setRefreshing(false);
    }
  }, [trackingId]);

  // Derived values
  const productName = product?.product_name ?? 'Product';
  const priceText = formatVND(product?.price);
  const previousPriceText = product?.previous_price != null ? formatVND(product.previous_price) : null;
  const priceChange = product?.price_change ?? 'unchanged';
  const priceChangeColor = PRICE_CHANGE_COLORS[priceChange];
  const hasImage = product?.image_url && product.image_url.startsWith('http');
  const hasUrl = product?.product_url && /^https?:\/\/.+/.test(product.product_url);
  const trackingSinceText = product?.created_at ? formatRelativeTime(product.created_at) : '—';
  const lastUpdatedText = product?.last_updated_at ? formatRelativeTime(product.last_updated_at) : '—';

  const priceHistory: PriceHistoryEntry[] = product?.price_history ?? [];
  // Sort newest first
  const sortedHistory = [...priceHistory].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  );

  const priceChangeLabel = priceChange === 'dropped' ? 'Dropped' : priceChange === 'increased' ? 'Increased' : 'Unchanged';

  const canConfirmPrice = Number(newPrice) > 0 && !savingPrice;
  const canSaveNote = noteInput.trim().length > 0 && !savingNote;

  return (
    <>
      <Stack.Screen
        options={{
          title: productName,
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.primary,
          headerTitleStyle: { color: COLORS.textTitle, fontWeight: '700' },
          headerBackTitle: '',
        }}
      />
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>Loading product...</Text>
          </View>
        ) : error ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 20,
              backgroundColor: COLORS.dangerMuted,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertCircle size={28} color={COLORS.danger} />
            </View>
            <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '600', textAlign: 'center' }}>
              Couldn't load product
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' }}>
              {error}
            </Text>
            <AnimatedPressable
              onPress={() => { console.log('[ProductDetail] Try again pressed'); fetchData(); }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: COLORS.surfaceSecondary, borderRadius: 12,
                paddingHorizontal: 20, paddingVertical: 12,
              }}
            >
              <RefreshCw size={16} color={COLORS.primary} />
              <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: 15 }}>Try again</Text>
            </AnimatedPressable>
          </View>
        ) : (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <ScrollView
              contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
              showsVerticalScrollIndicator={false}
            >
              {/* ── Hero Image ── */}
              <View style={{
                height: 240,
                backgroundColor: COLORS.surfaceSecondary,
              }}>
                {hasImage ? (
                  <Image
                    source={resolveImageSource(product!.image_url!)}
                    style={{ width: '100%', height: 240 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={56} color={COLORS.textTertiary} />
                  </View>
                )}
              </View>

              <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 20 }}>

                {/* ── Header Section ── */}
                <View style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 20,
                  padding: 18,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  gap: 10,
                  ...COLORS.cardShadow,
                }}>
                  <Text style={{
                    color: COLORS.text,
                    fontSize: 20,
                    fontWeight: '800',
                    letterSpacing: -0.3,
                    lineHeight: 26,
                  }}>
                    {productName}
                  </Text>

                  {product?.brand ? (
                    <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' }}>
                      {product.brand}
                    </Text>
                  ) : null}

                  {product?.category ? (
                    <View style={{
                      backgroundColor: COLORS.surfaceSecondary,
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      alignSelf: 'flex-start',
                    }}>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' }}>
                        {product.category}
                      </Text>
                    </View>
                  ) : null}

                  <PlatformBadge platform={product?.platform ?? 'Other'} />

                  {product?.description ? (
                    <Text style={{ color: COLORS.textSecondary, fontSize: 14, lineHeight: 20 }}>
                      {product.description}
                    </Text>
                  ) : null}

                  {product?.store_name ? (
                    <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>
                      {product.store_name}
                    </Text>
                  ) : null}

                  {/* Tracking ID */}
                  <View style={{
                    backgroundColor: COLORS.surfaceSecondary,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      Tracking ID
                    </Text>
                    <Text style={{
                      color: COLORS.textTitle,
                      fontSize: 14,
                      fontWeight: '700',
                      fontFamily: 'SpaceMono',
                      letterSpacing: 0.5,
                    }}>
                      {product?.tracking_id}
                    </Text>
                  </View>

                  {/* Missing data prompt + Refresh button */}
                  {(!product?.description || !product?.image_url || !product?.brand) && product?.product_url && (
                    <View style={{
                      backgroundColor: COLORS.surfaceSecondary,
                      borderRadius: 12,
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}>
                      <AlertCircle size={16} color={COLORS.textSecondary} />
                      <Text style={{ flex: 1, color: COLORS.textSecondary, fontSize: 13, lineHeight: 18 }}>
                        Some product details are missing. Tap Refresh to load them.
                      </Text>
                      <AnimatedPressable
                        onPress={handleRefresh}
                        disabled={refreshing}
                        style={{
                          backgroundColor: COLORS.primaryMuted,
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          opacity: refreshing ? 0.6 : 1,
                        }}
                      >
                        {refreshing
                          ? <ActivityIndicator size="small" color={COLORS.primary} />
                          : <RefreshCw size={13} color={COLORS.primary} />
                        }
                        <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700' }}>
                          {refreshing ? 'Refreshing…' : 'Refresh'}
                        </Text>
                      </AnimatedPressable>
                    </View>
                  )}

                  {/* Refresh error */}
                  {refreshError && (
                    <View style={{
                      backgroundColor: COLORS.dangerMuted,
                      borderRadius: 10,
                      padding: 10,
                    }}>
                      <Text style={{ color: COLORS.danger, fontSize: 13 }}>{refreshError}</Text>
                    </View>
                  )}

                  {/* Meta row */}
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <View>
                      <Text style={{ color: COLORS.textTertiary, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                        Tracking since
                      </Text>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                        {trackingSinceText}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ color: COLORS.textTertiary, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                        Last updated
                      </Text>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 2 }}>
                        {lastUpdatedText}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* ── Price Section ── */}
                <View style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 20,
                  padding: 18,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  gap: 12,
                  ...COLORS.cardShadow,
                }}>
                  <SectionTitle title="Current Price" />

                  {/* Price + change indicator */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <Text style={{
                      color: COLORS.textTitle,
                      fontSize: 34,
                      fontWeight: '800',
                      fontVariant: ['tabular-nums'],
                    }}>
                      {priceText}
                    </Text>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      backgroundColor: `${priceChangeColor}18`,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}>
                      {priceChange === 'dropped' && <TrendingDown size={14} color={priceChangeColor} />}
                      {priceChange === 'increased' && <TrendingUp size={14} color={priceChangeColor} />}
                      {priceChange === 'unchanged' && <Minus size={14} color={priceChangeColor} />}
                      <Text style={{ color: priceChangeColor, fontSize: 13, fontWeight: '700' }}>
                        {priceChangeLabel}
                      </Text>
                    </View>
                  </View>

                  {/* Previous price */}
                  {previousPriceText && (
                    <Text style={{
                      color: COLORS.textSecondary,
                      fontSize: 15,
                      textDecorationLine: 'line-through',
                      fontVariant: ['tabular-nums'],
                    }}>
                      {previousPriceText}
                    </Text>
                  )}

                  <Divider />

                  {/* Update Price toggle */}
                  {!showUpdatePrice ? (
                    <AnimatedPressable
                      onPress={() => {
                        console.log('[ProductDetail] Update Price button pressed');
                        setShowUpdatePrice(true);
                      }}
                      style={{
                        backgroundColor: COLORS.primaryMuted,
                        borderRadius: 12,
                        paddingVertical: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6,
                      }}
                    >
                      <RefreshCw size={15} color={COLORS.primary} />
                      <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '700' }}>
                        Update Price
                      </Text>
                    </AnimatedPressable>
                  ) : (
                    <View style={{ gap: 10 }}>
                      <Text style={{ color: COLORS.textTitle, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                        New Price (VND)
                      </Text>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: COLORS.surfaceSecondary,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: COLORS.primary,
                        overflow: 'hidden',
                      }}>
                        <View style={{ paddingHorizontal: 14, paddingVertical: 14, borderRightWidth: 1, borderRightColor: COLORS.border }}>
                          <Text style={{ color: COLORS.primary, fontSize: 15, fontWeight: '700' }}>₫</Text>
                        </View>
                        <TextInput
                          value={newPrice}
                          onChangeText={setNewPrice}
                          placeholder="Enter new price"
                          placeholderTextColor={COLORS.textTertiary}
                          keyboardType="numeric"
                          autoFocus
                          style={{
                            flex: 1,
                            color: COLORS.text,
                            fontSize: 16,
                            paddingHorizontal: 14,
                            paddingVertical: 14,
                            fontVariant: ['tabular-nums'],
                          }}
                        />
                      </View>
                      <TextInput
                        value={priceNote}
                        onChangeText={setPriceNote}
                        placeholder="Note (optional)"
                        placeholderTextColor={COLORS.textTertiary}
                        style={{
                          backgroundColor: COLORS.surfaceSecondary,
                          borderRadius: 12,
                          borderWidth: 1.5,
                          borderColor: COLORS.border,
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          color: COLORS.text,
                          fontSize: 14,
                        }}
                      />
                      {priceError && (
                        <Text style={{ color: COLORS.danger, fontSize: 13 }}>{priceError}</Text>
                      )}
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Pressable
                          onPress={() => {
                            console.log('[ProductDetail] Cancel update price pressed');
                            setShowUpdatePrice(false);
                            setNewPrice('');
                            setPriceNote('');
                            setPriceError(null);
                          }}
                          style={{
                            flex: 1,
                            backgroundColor: COLORS.surfaceSecondary,
                            borderRadius: 12,
                            paddingVertical: 12,
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' }}>
                            Cancel
                          </Text>
                        </Pressable>
                        <AnimatedPressable
                          onPress={handleUpdatePrice}
                          disabled={!canConfirmPrice}
                          style={{
                            flex: 2,
                            backgroundColor: COLORS.primary,
                            borderRadius: 12,
                            paddingVertical: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: canConfirmPrice ? 1 : 0.4,
                          }}
                        >
                          {savingPrice
                            ? <ActivityIndicator color="#FFFFFF" size="small" />
                            : <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Confirm</Text>
                          }
                        </AnimatedPressable>
                      </View>
                    </View>
                  )}
                </View>

                {/* ── Price History Timeline ── */}
                <View style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 20,
                  padding: 18,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  ...COLORS.cardShadow,
                }}>
                  <SectionTitle title="Price History" />

                  {sortedHistory.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
                      <Clock size={28} color={COLORS.textTertiary} />
                      <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' }}>
                        No price history yet
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 0 }}>
                      {sortedHistory.map((entry, index) => {
                        // Determine dot color: compare with next entry (which is older)
                        const olderEntry = sortedHistory[index + 1];
                        let dotColor = '#9ca3af';
                        if (olderEntry) {
                          if (entry.price < olderEntry.price) dotColor = '#22c55e';
                          else if (entry.price > olderEntry.price) dotColor = '#ef4444';
                        }
                        const entryPriceText = formatVND(entry.price);
                        const entryDateText = formatDateTime(entry.recorded_at);

                        return (
                          <View key={entry.id} style={{ flexDirection: 'row', gap: 12 }}>
                            {/* Timeline line + dot */}
                            <View style={{ alignItems: 'center', width: 16 }}>
                              <View style={{
                                width: 12,
                                height: 12,
                                borderRadius: 6,
                                backgroundColor: dotColor,
                                marginTop: 4,
                                flexShrink: 0,
                              }} />
                              {index < sortedHistory.length - 1 && (
                                <View style={{
                                  width: 2,
                                  flex: 1,
                                  backgroundColor: COLORS.divider,
                                  marginTop: 4,
                                  minHeight: 20,
                                }} />
                              )}
                            </View>

                            {/* Entry content */}
                            <View style={{ flex: 1, paddingBottom: 16 }}>
                              <Text style={{
                                color: COLORS.text,
                                fontSize: 16,
                                fontWeight: '700',
                                fontVariant: ['tabular-nums'],
                              }}>
                                {entryPriceText}
                              </Text>
                              <Text style={{ color: COLORS.textTertiary, fontSize: 12, marginTop: 2 }}>
                                {entryDateText}
                              </Text>
                              {entry.note ? (
                                <Text style={{
                                  color: COLORS.textSecondary,
                                  fontSize: 12,
                                  fontStyle: 'italic',
                                  marginTop: 3,
                                }}>
                                  {entry.note}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* ── Compare Prices ── */}
                <View style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 20,
                  padding: 18,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  gap: 12,
                  ...COLORS.cardShadow,
                }}>
                  <SectionTitle title="Compare Prices" />

                  {compareLoading ? (
                    <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
                      <ActivityIndicator color={COLORS.primary} size="small" />
                      <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>
                        Finding prices across stores…
                      </Text>
                    </View>
                  ) : comparisons.length <= 1 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 16, gap: 6 }}>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' }}>
                        No other prices found
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 0 }}>
                      {comparisons.map((item, index) => {
                        const storeLabel = item.is_current ? `${item.store} ★` : item.store;
                        const itemPrice = formatVND(item.price);
                        return (
                          <View key={`${item.store}-${index}`}>
                            {index > 0 && <View style={{ height: 1, backgroundColor: COLORS.divider, marginVertical: 0 }} />}
                            <AnimatedPressable
                              onPress={() => {
                                if (!item.url) return;
                                console.log(`[ProductDetail] Compare row tapped: ${item.store} — ${item.url}`);
                                Linking.openURL(item.url).catch(() => {});
                              }}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 14,
                                gap: 12,
                              }}
                            >
                              {/* Store name pill */}
                              <View style={{
                                backgroundColor: item.is_current ? COLORS.primaryMuted : COLORS.surfaceSecondary,
                                borderRadius: 8,
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                                minWidth: 90,
                                alignItems: 'center',
                              }}>
                                <Text style={{
                                  color: item.is_current ? COLORS.primary : COLORS.textSecondary,
                                  fontSize: 12,
                                  fontWeight: '700',
                                }} numberOfLines={1}>
                                  {storeLabel}
                                </Text>
                              </View>

                              {/* Price */}
                              <Text style={{
                                flex: 1,
                                color: COLORS.textTitle,
                                fontSize: 16,
                                fontWeight: '700',
                                fontVariant: ['tabular-nums'],
                                textAlign: 'right',
                              }}>
                                {itemPrice}
                              </Text>

                              {/* Best price badge */}
                              {item.is_best_price && (
                                <View style={{
                                  backgroundColor: 'rgba(34,197,94,0.12)',
                                  borderRadius: 6,
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                }}>
                                  <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: '700' }}>
                                    Best price
                                  </Text>
                                </View>
                              )}

                              {/* Arrow if tappable */}
                              {item.url ? (
                                <ExternalLink size={14} color={COLORS.textTertiary} />
                              ) : null}
                            </AnimatedPressable>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* ── Notes Section ── */}
                <View style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 20,
                  padding: 18,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  gap: 12,
                  ...COLORS.cardShadow,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <SectionTitle title="Notes" />
                    <Pressable
                      onPress={() => {
                        console.log('[ProductDetail] Add Note button pressed');
                        setShowAddNote(!showAddNote);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: COLORS.primaryMuted,
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                      }}
                    >
                      <Plus size={13} color={COLORS.primary} />
                      <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>
                        Add Note
                      </Text>
                    </Pressable>
                  </View>

                  {product?.notes ? (
                    <View style={{
                      backgroundColor: COLORS.surfaceSecondary,
                      borderRadius: 10,
                      padding: 12,
                    }}>
                      <Text style={{ color: COLORS.text, fontSize: 14, lineHeight: 20 }}>
                        {product.notes}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                      <FileText size={16} color={COLORS.textTertiary} />
                      <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
                        No notes yet
                      </Text>
                    </View>
                  )}

                  {showAddNote && (
                    <View style={{ gap: 10 }}>
                      <TextInput
                        value={noteInput}
                        onChangeText={setNoteInput}
                        placeholder="Add a note about this product..."
                        placeholderTextColor={COLORS.textTertiary}
                        multiline
                        numberOfLines={3}
                        autoFocus
                        style={{
                          backgroundColor: COLORS.surfaceSecondary,
                          borderRadius: 12,
                          borderWidth: 1.5,
                          borderColor: COLORS.primary,
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          color: COLORS.text,
                          fontSize: 14,
                          minHeight: 80,
                          textAlignVertical: 'top',
                        }}
                      />
                      {noteError && (
                        <Text style={{ color: COLORS.danger, fontSize: 13 }}>{noteError}</Text>
                      )}
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Pressable
                          onPress={() => {
                            console.log('[ProductDetail] Cancel add note pressed');
                            setShowAddNote(false);
                            setNoteInput('');
                            setNoteError(null);
                          }}
                          style={{
                            flex: 1,
                            backgroundColor: COLORS.surfaceSecondary,
                            borderRadius: 12,
                            paddingVertical: 12,
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' }}>
                            Cancel
                          </Text>
                        </Pressable>
                        <AnimatedPressable
                          onPress={handleAddNote}
                          disabled={!canSaveNote}
                          style={{
                            flex: 2,
                            backgroundColor: COLORS.primary,
                            borderRadius: 12,
                            paddingVertical: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: canSaveNote ? 1 : 0.4,
                          }}
                        >
                          {savingNote
                            ? <ActivityIndicator color="#FFFFFF" size="small" />
                            : <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Save Note</Text>
                          }
                        </AnimatedPressable>
                      </View>
                    </View>
                  )}
                </View>

                {/* ── Product URL Section ── */}
                {hasUrl && (
                  <View style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 20,
                    padding: 18,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    gap: 10,
                    ...COLORS.cardShadow,
                  }}>
                    <SectionTitle title="Original Listing" />
                    <AnimatedPressable
                      onPress={() => {
                        const url = product?.product_url ?? '';
                        console.log(`[ProductDetail] Open Original Listing pressed: ${url}`);
                        Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open link'));
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        backgroundColor: COLORS.primaryMuted,
                        borderRadius: 12,
                        paddingVertical: 13,
                      }}
                    >
                      <ExternalLink size={16} color={COLORS.primary} />
                      <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '700' }}>
                        Open Original Listing
                      </Text>
                    </AnimatedPressable>
                    <AnimatedPressable
                      onPress={handleRefresh}
                      disabled={refreshing}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        backgroundColor: COLORS.surfaceSecondary,
                        borderRadius: 12,
                        paddingVertical: 11,
                        opacity: refreshing ? 0.6 : 1,
                      }}
                    >
                      {refreshing
                        ? <ActivityIndicator size="small" color={COLORS.textSecondary} />
                        : <RefreshCw size={14} color={COLORS.textSecondary} />
                      }
                      <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' }}>
                        {refreshing ? 'Refreshing…' : 'Refresh product data'}
                      </Text>
                    </AnimatedPressable>
                    <Text
                      style={{ color: COLORS.textTertiary, fontSize: 11, textAlign: 'center' }}
                      numberOfLines={1}
                    >
                      {product?.product_url}
                    </Text>
                  </View>
                )}

                {/* ── Delete Button ── */}
                <AnimatedPressable
                  onPress={handleDelete}
                  disabled={deleting}
                  style={{
                    backgroundColor: COLORS.dangerMuted,
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                    borderWidth: 1,
                    borderColor: `${COLORS.danger}30`,
                    opacity: deleting ? 0.6 : 1,
                    marginBottom: 8,
                  }}
                >
                  {deleting ? (
                    <ActivityIndicator color={COLORS.danger} size="small" />
                  ) : (
                    <>
                      <Trash2 size={18} color={COLORS.danger} />
                      <Text style={{ color: COLORS.danger, fontSize: 16, fontWeight: '700' }}>
                        Remove from Tracking
                      </Text>
                    </>
                  )}
                </AnimatedPressable>

              </View>
            </ScrollView>
          </Animated.View>
        )}
      </View>
    </>
  );
}
