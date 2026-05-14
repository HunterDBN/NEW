import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/utils/glowupApi';
import { hasSelectedNiches } from '@/utils/glowupStorage';
import { BG, DEEP_ROSE, DARK_GREY, ROSE, LILAC, CARD, LIGHT_GREY } from '@/constants/GlowUpColors';

export default function GlowUpAuth() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, signInWithApple, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'apple' | 'google' | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields 🌸');
      return;
    }
    console.log(`[GlowUp Auth] ${mode} attempt for email: ${email}`);
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        if (!name || !username) {
          setError('Please fill in all fields 🌸');
          setSubmitting(false);
          return;
        }
        await signUpWithEmail(email, password, name);
        console.log('[GlowUp Auth] Sign up successful, updating profile username');
        try {
          await updateProfile({ username });
        } catch {
          // non-fatal
        }
        router.replace('/glowup/niche-selection');
      } else {
        await signInWithEmail(email, password);
        console.log('[GlowUp Auth] Login successful');
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      console.error('[GlowUp Auth] Auth error:', e);
      setError(e?.message ? `${e.message} 💕` : 'Something went wrong. Please try again 🌸');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApple = async () => {
    console.log('[GlowUp Auth] Apple sign in pressed');
    setSocialLoading('apple');
    setError('');
    try {
      await signInWithApple();
      const nichesSelected = await hasSelectedNiches();
      if (nichesSelected) {
        router.replace('/(tabs)');
      } else {
        router.replace('/glowup/niche-selection');
      }
    } catch (e: any) {
      console.error('[GlowUp Auth] Apple sign in error:', e);
      setError(e?.message || 'Apple sign in failed. Please try again 🌸');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleGoogle = async () => {
    console.log('[GlowUp Auth] Google sign in pressed');
    setSocialLoading('google');
    setError('');
    try {
      await signInWithGoogle();
      const nichesSelected = await hasSelectedNiches();
      if (nichesSelected) {
        router.replace('/(tabs)');
      } else {
        router.replace('/glowup/niche-selection');
      }
    } catch (e: any) {
      console.error('[GlowUp Auth] Google sign in error:', e);
      setError(e?.message || 'Google sign in failed. Please try again 🌸');
    } finally {
      setSocialLoading(null);
    }
  };

  const toggleMode = () => {
    setMode(m => (m === 'login' ? 'signup' : 'login'));
    setError('');
  };

  const isSignup = mode === 'signup';
  const submitLabel = isSignup ? 'Create Account 🌸' : 'Sign In 💕';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <Text style={styles.logo}>GlowUp</Text>
        <Text style={styles.tagline}>
          {isSignup ? 'Create your glow profile 🌸' : 'Welcome back, gorgeous 💕'}
        </Text>

        {/* Form */}
        <View style={styles.form}>
          {isSignup && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor="#CCCCCC"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="Username (e.g. glowgirl)"
                placeholderTextColor="#CCCCCC"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </>
          )}
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#CCCCCC"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#CCCCCC"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
            <LinearGradient
              colors={[ROSE, LILAC]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>{submitLabel}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social buttons */}
        <TouchableOpacity
          style={styles.socialBtn}
          onPress={handleApple}
          disabled={socialLoading !== null}
          activeOpacity={0.85}
        >
          {socialLoading === 'apple' ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <>
              <Text style={styles.socialIcon}>🍎</Text>
              <Text style={styles.socialBtnText}>Continue with Apple</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.socialBtn, styles.googleBtn]}
          onPress={handleGoogle}
          disabled={socialLoading !== null}
          activeOpacity={0.85}
        >
          {socialLoading === 'google' ? (
            <ActivityIndicator color={DEEP_ROSE} />
          ) : (
            <>
              <Text style={styles.socialIcon}>G</Text>
              <Text style={[styles.socialBtnText, { color: DEEP_ROSE }]}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Toggle mode */}
        <TouchableOpacity onPress={toggleMode} style={styles.toggleRow}>
          <Text style={styles.toggleText}>
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          </Text>
          <Text style={styles.toggleLink}>{isSignup ? 'Sign In' : 'Sign Up'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: BG,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  logo: {
    fontSize: 36,
    fontWeight: '900',
    color: DEEP_ROSE,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: DARK_GREY,
    marginBottom: 32,
  },
  form: {
    width: '100%',
    gap: 12,
  },
  input: {
    backgroundColor: CARD,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: DARK_GREY,
    borderWidth: 1,
    borderColor: LIGHT_GREY,
    shadowColor: '#F4A7B9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  error: {
    color: '#B5446E',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  primaryBtn: {
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 24,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: LIGHT_GREY,
  },
  dividerText: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    marginBottom: 12,
    gap: 10,
  },
  googleBtn: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LIGHT_GREY,
  },
  socialIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  socialBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  toggleRow: {
    flexDirection: 'row',
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    color: DARK_GREY,
    fontSize: 14,
  },
  toggleLink: {
    color: DEEP_ROSE,
    fontWeight: '700',
    fontSize: 14,
  },
});
