import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { RefreshCw, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import {
  getJournalPrompt,
  saveJournalEntry,
  getJournalEntries,
  GlowJournalEntry,
} from '@/utils/glowupApi';
import {
  BG, DEEP_ROSE, DARK_GREY, ROSE, LILAC, CARD, LIGHT_GREY,
  ALL_MOODS, MOOD_EMOJIS,
} from '@/constants/GlowUpColors';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Journal() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [entries, setEntries] = useState<GlowJournalEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<GlowJournalEntry | null>(null);

  const loadPrompt = useCallback(async () => {
    console.log('[GlowUp Journal] Loading prompt');
    setPromptLoading(true);
    try {
      const data = await getJournalPrompt();
      const promptText = data?.prompt || data?.text || data;
      setPrompt(typeof promptText === 'string' ? promptText : 'What made you smile today?');
    } catch (e) {
      console.error('[GlowUp Journal] Prompt error:', e);
      setPrompt('What made you smile today?');
    } finally {
      setPromptLoading(false);
    }
  }, []);

  const loadEntries = useCallback(async () => {
    if (!user) return;
    console.log('[GlowUp Journal] Loading entries');
    try {
      const data = await getJournalEntries();
      const list = Array.isArray(data) ? data : (data?.entries || data?.data || []);
      setEntries(list);
    } catch (e) {
      console.error('[GlowUp Journal] Entries error:', e);
    } finally {
      setEntriesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPrompt();
    loadEntries();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadPrompt(), loadEntries()]);
    setRefreshing(false);
  };

  const handleSave = async () => {
    if (!user) {
      console.log('[GlowUp Journal] Save pressed, not logged in');
      router.push('/glowup/auth');
      return;
    }
    if (!response.trim()) {
      Alert.alert('Write something first 🌸', 'Your journal entry cannot be empty.');
      return;
    }
    if (!selectedMood) {
      Alert.alert('Pick a mood 💕', 'How are you feeling today?');
      return;
    }
    console.log('[GlowUp Journal] Saving entry, mood:', selectedMood);
    setSaving(true);
    try {
      await saveJournalEntry({ prompt, response, mood: selectedMood });
      Alert.alert('Entry saved 🌸', 'You are doing amazing.');
      setResponse('');
      setSelectedMood('');
      loadEntries();
    } catch (e) {
      console.error('[GlowUp Journal] Save error:', e);
      Alert.alert('Oops', 'Could not save entry. Try again!');
    } finally {
      setSaving(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.authGate}>
          <Text style={styles.authGateEmoji}>📖</Text>
          <Text style={styles.authGateTitle}>Your Glow Journal</Text>
          <Text style={styles.authGateText}>Sign in to start journaling your glow journey 🌸</Text>
          <TouchableOpacity
            onPress={() => {
              console.log('[GlowUp Journal] Auth gate sign in pressed');
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

  const previewLength = 100;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ROSE} />
        }
      >
        {/* Header */}
        <Text style={styles.header}>Your Glow Journal 📖</Text>
        <Text style={styles.subtext}>A private space just for you.</Text>

        {/* Daily prompt card */}
        <View style={styles.promptCard}>
          <View style={styles.promptHeader}>
            <Text style={styles.promptLabel}>Today's Prompt ✨</Text>
            <TouchableOpacity
              onPress={() => {
                console.log('[GlowUp Journal] Refresh prompt pressed');
                loadPrompt();
              }}
              disabled={promptLoading}
              activeOpacity={0.7}
            >
              <RefreshCw size={16} color={ROSE} />
            </TouchableOpacity>
          </View>
          {promptLoading ? (
            <ActivityIndicator color={ROSE} />
          ) : (
            <Text style={styles.promptText}>{prompt}</Text>
          )}
        </View>

        {/* Mood selector */}
        <Text style={styles.sectionLabel}>How are you feeling? 💭</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.moodScroll}
          style={styles.moodScrollContainer}
        >
          {ALL_MOODS.map(mood => {
            const isSelected = selectedMood === mood;
            const emoji = MOOD_EMOJIS[mood] || '✨';
            const label = mood.charAt(0).toUpperCase() + mood.slice(1);
            if (isSelected) {
              return (
                <TouchableOpacity
                  key={mood}
                  onPress={() => {
                    console.log(`[GlowUp Journal] Mood selected: ${mood}`);
                    setSelectedMood(mood);
                  }}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[ROSE, LILAC]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.moodPillActive}
                  >
                    <Text style={styles.moodEmoji}>{emoji}</Text>
                    <Text style={styles.moodTextActive}>{label}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                key={mood}
                onPress={() => {
                  console.log(`[GlowUp Journal] Mood selected: ${mood}`);
                  setSelectedMood(mood);
                }}
                style={styles.moodPillInactive}
                activeOpacity={0.85}
              >
                <Text style={styles.moodEmoji}>{emoji}</Text>
                <Text style={styles.moodTextInactive}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Journal input */}
        <TextInput
          style={styles.journalInput}
          placeholder="Write freely... this is just for you 🌸"
          placeholderTextColor="#CCCCCC"
          value={response}
          onChangeText={setResponse}
          multiline
          textAlignVertical="top"
        />

        {/* Save button */}
        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          <LinearGradient
            colors={[ROSE, LILAC]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save Entry 💕</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Past entries */}
        {entries.length > 0 && (
          <View style={styles.pastSection}>
            <Text style={styles.sectionLabel}>Past Entries 📚</Text>
            {entries.map(entry => {
              const moodEmoji = MOOD_EMOJIS[entry.mood] || '✨';
              const moodLabel = entry.mood ? entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1) : '';
              const dateLabel = formatDate(entry.created_at);
              const preview = entry.response.length > previewLength
                ? entry.response.slice(0, previewLength) + '...'
                : entry.response;

              return (
                <TouchableOpacity
                  key={entry.id}
                  style={styles.entryCard}
                  onPress={() => {
                    console.log(`[GlowUp Journal] Entry tapped: ${entry.id}`);
                    setExpandedEntry(entry);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryDate}>{dateLabel}</Text>
                    <View style={styles.moodBadge}>
                      <Text style={styles.moodBadgeText}>{moodEmoji} {moodLabel}</Text>
                    </View>
                  </View>
                  <Text style={styles.entryPreview}>{preview}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Expanded entry modal */}
      <Modal
        visible={expandedEntry !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setExpandedEntry(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Journal Entry 📖</Text>
            <TouchableOpacity
              onPress={() => {
                console.log('[GlowUp Journal] Modal closed');
                setExpandedEntry(null);
              }}
              activeOpacity={0.7}
            >
              <X size={22} color={DARK_GREY} />
            </TouchableOpacity>
          </View>
          {expandedEntry && (
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalDate}>{formatDate(expandedEntry.created_at)}</Text>
              <View style={styles.moodBadge}>
                <Text style={styles.moodBadgeText}>
                  {MOOD_EMOJIS[expandedEntry.mood] || '✨'}{' '}
                  {expandedEntry.mood ? expandedEntry.mood.charAt(0).toUpperCase() + expandedEntry.mood.slice(1) : ''}
                </Text>
              </View>
              <Text style={styles.modalPromptLabel}>Prompt</Text>
              <Text style={styles.modalPrompt}>{expandedEntry.prompt}</Text>
              <Text style={styles.modalResponseLabel}>Your Entry</Text>
              <Text style={styles.modalResponse}>{expandedEntry.response}</Text>
            </ScrollView>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  header: {
    fontSize: 24,
    fontWeight: '800',
    color: DEEP_ROSE,
    paddingTop: 16,
    marginBottom: 4,
  },
  subtext: {
    fontSize: 13,
    color: DARK_GREY,
    marginBottom: 20,
  },
  promptCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: ROSE,
    shadowColor: '#F4A7B9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  promptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  promptLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: ROSE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptText: {
    fontSize: 15,
    color: DARK_GREY,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: DEEP_ROSE,
    marginBottom: 10,
  },
  moodScrollContainer: {
    maxHeight: 50,
    marginBottom: 16,
  },
  moodScroll: {
    gap: 8,
    alignItems: 'center',
  },
  moodPillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 4,
  },
  moodPillInactive: {
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
  moodEmoji: {
    fontSize: 14,
  },
  moodTextActive: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  moodTextInactive: {
    color: DEEP_ROSE,
    fontSize: 12,
    fontWeight: '600',
  },
  journalInput: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: DARK_GREY,
    minHeight: 150,
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
  saveBtn: {
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 28,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  pastSection: {
    marginBottom: 20,
  },
  entryCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#F4A7B9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  entryDate: {
    fontSize: 12,
    color: '#AAAAAA',
    fontWeight: '600',
  },
  moodBadge: {
    backgroundColor: '#FFF0F4',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  moodBadgeText: {
    fontSize: 11,
    color: DEEP_ROSE,
    fontWeight: '600',
  },
  entryPreview: {
    fontSize: 13,
    color: DARK_GREY,
    lineHeight: 18,
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
  modalContainer: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_GREY,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DEEP_ROSE,
  },
  modalScroll: {
    padding: 20,
  },
  modalDate: {
    fontSize: 13,
    color: '#AAAAAA',
    marginBottom: 8,
  },
  modalPromptLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: ROSE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 6,
  },
  modalPrompt: {
    fontSize: 14,
    color: DARK_GREY,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  modalResponseLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: ROSE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 6,
  },
  modalResponse: {
    fontSize: 15,
    color: DARK_GREY,
    lineHeight: 24,
  },
});
