import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { createPost } from '@/utils/glowupApi';
import {
  BG, DEEP_ROSE, DARK_GREY, ROSE, LILAC, CARD, LIGHT_GREY,
  CATEGORY_COLORS, CATEGORY_EMOJIS, ALL_CATEGORIES,
} from '@/constants/GlowUpColors';

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function CreatePost() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      console.log('[GlowUp CreatePost] Not logged in, redirecting to auth');
      router.replace('/glowup/auth');
    }
  }, [user, authLoading]);

  const pickImage = async () => {
    console.log('[GlowUp CreatePost] Pick image pressed');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      console.log('[GlowUp CreatePost] Image selected:', result.assets[0].uri);
      setImageUri(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    if (!content.trim()) {
      Alert.alert('Write something first 🌸', 'Your post cannot be empty.');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Pick a category 💕', 'Choose what your post is about.');
      return;
    }
    console.log('[GlowUp CreatePost] Posting:', { category: selectedCategory, hasImage: !!imageUri });
    setPosting(true);
    try {
      await createPost({
        content: content.trim(),
        image_url: imageUri || undefined,
        category: selectedCategory,
      });
      Alert.alert('Your post is live 💕', 'You are glowing 🌸', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error('[GlowUp CreatePost] Post error:', e);
      Alert.alert('Oops', 'Could not post. Try again!');
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              console.log('[GlowUp CreatePost] Back pressed');
              router.back();
            }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={DEEP_ROSE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Share your glow 🌸</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Text input */}
          <TextInput
            style={styles.textInput}
            placeholder="Share a win, a struggle, a tip, or just how you are feeling today 💕"
            placeholderTextColor="#CCCCCC"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />

          {/* Image preview */}
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={resolveImageSource(imageUri)} style={styles.imagePreview} resizeMode="cover" />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => {
                  console.log('[GlowUp CreatePost] Image removed');
                  setImageUri('');
                }}
                activeOpacity={0.7}
              >
                <X size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addPhotoBtn}
              onPress={pickImage}
              activeOpacity={0.85}
            >
              <Text style={styles.addPhotoBtnText}>Add a photo 📸</Text>
            </TouchableOpacity>
          )}

          {/* Category selector */}
          <Text style={styles.categoryLabel}>Choose a category *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
            style={styles.categoryScrollContainer}
          >
            {ALL_CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat;
              const emoji = CATEGORY_EMOJIS[cat] || '✨';
              const label = cat.charAt(0).toUpperCase() + cat.slice(1);
              const catColor = CATEGORY_COLORS[cat] || ROSE;

              if (isSelected) {
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => {
                      console.log(`[GlowUp CreatePost] Category selected: ${cat}`);
                      setSelectedCategory(cat);
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[catColor, LILAC]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.categoryPillActive}
                    >
                      <Text style={styles.categoryPillEmoji}>{emoji}</Text>
                      <Text style={styles.categoryPillTextActive}>{label}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => {
                    console.log(`[GlowUp CreatePost] Category selected: ${cat}`);
                    setSelectedCategory(cat);
                  }}
                  style={styles.categoryPillInactive}
                  activeOpacity={0.85}
                >
                  <Text style={styles.categoryPillEmoji}>{emoji}</Text>
                  <Text style={styles.categoryPillTextInactive}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Post button */}
          <TouchableOpacity
            onPress={handlePost}
            disabled={posting}
            activeOpacity={0.85}
            style={styles.postBtnWrapper}
          >
            <LinearGradient
              colors={[ROSE, LILAC]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.postBtn}
            >
              {posting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.postBtnText}>Post 💕</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_GREY,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: DEEP_ROSE,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  textInput: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: DARK_GREY,
    minHeight: 120,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: LIGHT_GREY,
    lineHeight: 22,
    shadowColor: '#F4A7B9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  addPhotoBtn: {
    backgroundColor: CARD,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: ROSE,
    borderStyle: 'dashed',
  },
  addPhotoBtnText: {
    color: DEEP_ROSE,
    fontWeight: '600',
    fontSize: 14,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 14,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: DEEP_ROSE,
    marginBottom: 10,
  },
  categoryScrollContainer: {
    maxHeight: 46,
    marginBottom: 24,
  },
  categoryScroll: {
    gap: 8,
    alignItems: 'center',
  },
  categoryPillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 4,
  },
  categoryPillInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: ROSE,
    gap: 4,
  },
  categoryPillEmoji: {
    fontSize: 14,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryPillTextInactive: {
    color: DEEP_ROSE,
    fontSize: 12,
    fontWeight: '600',
  },
  postBtnWrapper: {
    width: '100%',
  },
  postBtn: {
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
  },
  postBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
