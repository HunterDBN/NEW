import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { getPosts, GlowPost } from '@/utils/glowupApi';
import {
  BG, DEEP_ROSE, DARK_GREY, ROSE, CARD, LIGHT_GREY,
  CATEGORY_COLORS, ALL_CATEGORIES,
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

export default function Explore() {
  const router = useRouter();
  const [posts, setPosts] = useState<GlowPost[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async (category?: string, searchQuery?: string) => {
    console.log('[GlowUp Explore] Loading posts, category:', category, 'search:', searchQuery);
    try {
      const params: { category?: string; search?: string } = {};
      if (category && category !== 'All') params.category = category;
      if (searchQuery) params.search = searchQuery;
      const data = await getPosts(Object.keys(params).length > 0 ? params : undefined);
      const list = Array.isArray(data) ? data : (data?.posts || data?.data || []);
      setPosts(list);
    } catch (e) {
      console.error('[GlowUp Explore] Error loading posts:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPosts(activeCategory !== 'All' ? activeCategory : undefined, search || undefined);
    }, 400);
    return () => clearTimeout(timer);
  }, [activeCategory, search]);

  const categories = ['All', ...ALL_CATEGORIES];

  // Unique authors from posts
  const authors = posts
    .filter(p => p.author)
    .reduce<{ username: string; profile_photo: string; name: string; user_id: string }[]>((acc, p) => {
      if (p.author && !acc.find(a => a.username === p.author!.username)) {
        acc.push({
          username: p.author.username,
          profile_photo: p.author.profile_photo,
          name: p.author.name,
          user_id: p.user_id,
        });
      }
      return acc;
    }, [])
    .slice(0, 10);

  const renderGridItem = ({ item, index }: { item: GlowPost; index: number }) => {
    const isLeft = index % 2 === 0;
    const catColor = CATEGORY_COLORS[item.category] || ROSE;

    return (
      <TouchableOpacity
        style={[styles.gridItem, isLeft ? { marginRight: 6 } : { marginLeft: 6 }]}
        onPress={() => {
          console.log(`[GlowUp Explore] Post tapped: ${item.id}`);
          router.push(`/glowup/post/${item.id}` as any);
        }}
        activeOpacity={0.85}
      >
        {item.image_url ? (
          <Image source={resolveImageSource(item.image_url)} style={styles.gridImage} resizeMode="cover" />
        ) : (
          <View style={[styles.gridTextCard, { borderTopColor: catColor }]}>
            <Text style={styles.gridTextContent} numberOfLines={4}>
              {item.content}
            </Text>
            <View style={[styles.gridCategoryBadge, { backgroundColor: catColor }]}>
              <Text style={styles.gridCategoryText}>
                {item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : ''}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={styles.header}>Discover your glow community 🌍</Text>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Search size={16} color={ROSE} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search posts or people..."
            placeholderTextColor="#CCCCCC"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
        </View>

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
                    console.log(`[GlowUp Explore] Category filter: ${cat}`);
                    setActiveCategory(cat);
                  }}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[ROSE, '#C9A8E0']}
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
                  console.log(`[GlowUp Explore] Category filter: ${cat}`);
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

        {/* People to Follow */}
        {authors.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>People to Follow 💕</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleScroll}>
              {authors.map(author => {
                const initials = getInitials(author.name || author.username);
                return (
                  <TouchableOpacity
                    key={author.username}
                    style={styles.personCard}
                    onPress={() => {
                      console.log(`[GlowUp Explore] Person tapped: ${author.username}`);
                      router.push('/(tabs)/profile' as any);
                    }}
                    activeOpacity={0.85}
                  >
                    {author.profile_photo ? (
                      <Image source={resolveImageSource(author.profile_photo)} style={styles.personAvatar} />
                    ) : (
                      <View style={styles.personAvatarPlaceholder}>
                        <Text style={styles.personInitials}>{initials}</Text>
                      </View>
                    )}
                    <Text style={styles.personName} numberOfLines={1}>
                      {author.name || author.username}
                    </Text>
                    <Text style={styles.personUsername} numberOfLines={1}>
                      @{author.username}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Posts grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Latest Posts ✨</Text>
          {posts.length === 0 && !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🌸</Text>
              <Text style={styles.emptyText}>No posts found. Try a different search!</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {posts.map((item, index) => (
                <React.Fragment key={item.id}>
                  {renderGridItem({ item, index })}
                </React.Fragment>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    fontSize: 20,
    fontWeight: '800',
    color: DEEP_ROSE,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    lineHeight: 26,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: ROSE,
    gap: 8,
    shadowColor: '#F4A7B9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: DARK_GREY,
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DEEP_ROSE,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  peopleScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  personCard: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    width: 90,
    shadowColor: '#F4A7B9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  personAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 6,
  },
  personAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: LIGHT_GREY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  personInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: DEEP_ROSE,
  },
  personName: {
    fontSize: 11,
    fontWeight: '700',
    color: DARK_GREY,
    textAlign: 'center',
  },
  personUsername: {
    fontSize: 10,
    color: '#AAAAAA',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  gridItem: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  gridTextCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
    borderTopWidth: 3,
    shadowColor: '#F4A7B9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    justifyContent: 'space-between',
  },
  gridTextContent: {
    fontSize: 12,
    color: DARK_GREY,
    lineHeight: 17,
    flex: 1,
  },
  gridCategoryBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  gridCategoryText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: DEEP_ROSE,
    textAlign: 'center',
    fontWeight: '600',
  },
});
