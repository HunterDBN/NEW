import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Camera } from 'lucide-react-native';
import { getMyProfile, updateProfile } from '@/utils/glowupApi';
import {
  BG,
  ROSE,
  LILAC,
  CARD,
  DARK_GREY,
  LIGHT_GREY,
  DEEP_ROSE,
  GRADIENT,
} from '@/constants/GlowUpColors';

// ─── Field component ────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'url' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  minHeight?: number;
}

function Field({
  label,
  value,
  onChangeText,
  multiline = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  minHeight,
}: FieldProps) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && { minHeight: minHeight ?? 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor="#C0A8B0"
      />
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [pinterestUrl, setPinterestUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // ── Load profile on mount ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      console.log('[EditProfile] Fetching profile on mount');
      try {
        const data = await getMyProfile();
        const p = data?.profile ?? data;
        console.log('[EditProfile] Profile loaded:', p);
        setName(p.name || '');
        setUsername(p.username || '');
        setBio(p.bio || '');
        setProfilePhoto(p.profile_photo || '');
        setInstagramUrl(p.instagram_url || '');
        setTiktokUrl(p.tiktok_url || '');
        setPinterestUrl(p.pinterest_url || '');
        setYoutubeUrl(p.youtube_url || '');
      } catch (err) {
        console.log('[EditProfile] Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Pick photo ────────────────────────────────────────────────────────────
  const pickPhoto = useCallback(async () => {
    console.log('[EditProfile] pickPhoto tapped');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      console.log('[EditProfile] Media library permission denied');
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      console.log('[EditProfile] Photo selected (preview only):', uri);
      setProfilePhoto(uri);
    }
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    console.log('[EditProfile] Save Changes tapped');
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        name,
        username,
        bio,
        instagram_url: instagramUrl,
        tiktok_url: tiktokUrl,
        pinterest_url: pinterestUrl,
        youtube_url: youtubeUrl,
      };
      if (profilePhoto.startsWith('http')) {
        payload.profile_photo = profilePhoto;
      }
      console.log('[EditProfile] PUT /api/gu/profile payload:', payload);
      await updateProfile(payload);
      console.log('[EditProfile] Profile updated successfully');
      router.back();
      Alert.alert('You are glowing 🌸', 'Your profile has been updated! 💕');
    } catch (err) {
      console.log('[EditProfile] Error saving profile:', err);
      Alert.alert('Something went wrong, try again 💕', '');
    } finally {
      setSaving(false);
    }
  }, [name, username, bio, profilePhoto, instagramUrl, tiktokUrl, pinterestUrl, youtubeUrl, router]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top']}>
        <ActivityIndicator size="large" color={ROSE} />
      </SafeAreaView>
    );
  }

  const hasPhoto = profilePhoto.length > 0;
  const photoSource = hasPhoto ? { uri: profilePhoto } : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              console.log('[EditProfile] Back button pressed');
              router.back();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={24} color={DEEP_ROSE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Profile photo */}
          <View style={styles.photoSection}>
            <TouchableOpacity onPress={pickPhoto} activeOpacity={0.8}>
              {hasPhoto && photoSource ? (
                <Image source={photoSource} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Camera size={32} color={ROSE} />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.photoHint}>Tap to change photo</Text>
          </View>

          {/* Basic info */}
          <Field label="NAME" value={name} onChangeText={setName} />
          <Field
            label="USERNAME"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <Field
            label="BIO"
            value={bio}
            onChangeText={setBio}
            multiline
            minHeight={80}
          />

          {/* Social links */}
          <Text style={styles.sectionLabel}>Social Links 🔗</Text>
          <Field
            label="INSTAGRAM URL"
            value={instagramUrl}
            onChangeText={setInstagramUrl}
            keyboardType="url"
            autoCapitalize="none"
          />
          <Field
            label="TIKTOK URL"
            value={tiktokUrl}
            onChangeText={setTiktokUrl}
            keyboardType="url"
            autoCapitalize="none"
          />
          <Field
            label="PINTEREST URL"
            value={pinterestUrl}
            onChangeText={setPinterestUrl}
            keyboardType="url"
            autoCapitalize="none"
          />
          <Field
            label="YOUTUBE URL"
            value={youtubeUrl}
            onChangeText={setYoutubeUrl}
            keyboardType="url"
            autoCapitalize="none"
          />

          {/* Save button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
            style={styles.saveWrapper}
          >
            <LinearGradient
              colors={GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveGradient}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveText}>Save Changes 💕</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BG,
  },
  headerBtn: {
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DEEP_ROSE,
    letterSpacing: 0.3,
  },
  // Scroll
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  // Photo
  photoSection: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 8,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: ROSE,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: ROSE,
    backgroundColor: LIGHT_GREY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoHint: {
    marginTop: 8,
    fontSize: 13,
    color: ROSE,
    fontWeight: '500',
  },
  // Fields
  fieldWrapper: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: ROSE,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: LIGHT_GREY,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: DARK_GREY,
  },
  // Section label
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: DEEP_ROSE,
    marginTop: 8,
    marginBottom: 16,
  },
  // Save button
  saveWrapper: {
    marginTop: 28,
    borderRadius: 50,
    overflow: 'hidden',
  },
  saveGradient: {
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
