import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { BG, DEEP_ROSE, DARK_GREY, ROSE, CARD, LIGHT_GREY } from '@/constants/GlowUpColors';

interface SettingsItemProps {
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
}

function SettingsItem({ label, onPress, isDestructive }: SettingsItemProps) {
  return (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.settingsLabel, isDestructive && styles.destructiveLabel]}>{label}</Text>
      <ChevronRight size={18} color={isDestructive ? '#E05C7A' : '#CCCCCC'} />
    </TouchableOpacity>
  );
}

export default function Settings() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleLogOut = async () => {
    console.log('[GlowUp Settings] Log out pressed');
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          console.log('[GlowUp Settings] Confirming log out');
          await signOut();
          router.replace('/glowup/auth');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            console.log('[GlowUp Settings] Back pressed');
            router.back();
          }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={DEEP_ROSE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.section}>
          <SettingsItem
            label="Edit Niche Preferences"
            onPress={() => {
              console.log('[GlowUp Settings] Edit niche preferences pressed');
              router.push('/glowup/niche-selection');
            }}
          />
          <SettingsItem
            label="Notification Preferences"
            onPress={() => {
              console.log('[GlowUp Settings] Notification preferences pressed');
              Alert.alert('Coming soon 🌸', 'Notification preferences are coming soon!');
            }}
          />
          <SettingsItem
            label="Privacy Settings"
            onPress={() => {
              console.log('[GlowUp Settings] Privacy settings pressed');
              Alert.alert('Coming soon 🌸', 'Privacy settings are coming soon!');
            }}
          />
          <SettingsItem
            label="GlowUp Premium 👑"
            onPress={() => {
              console.log('[GlowUp Settings] Premium pressed');
              Alert.alert(
                'GlowUp Premium 👑',
                'Unlock all challenges, remove ads, and get exclusive content. Coming soon!'
              );
            }}
          />
        </View>

        <View style={[styles.section, { marginTop: 16 }]}>
          <SettingsItem
            label="Log Out"
            onPress={handleLogOut}
            isDestructive
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerVersion}>v1.0.0</Text>
          <Text style={styles.footerTagline}>Your glow era starts here. 🌸</Text>
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
  section: {
    backgroundColor: CARD,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F4A7B9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_GREY,
  },
  settingsLabel: {
    fontSize: 15,
    color: DARK_GREY,
    fontWeight: '500',
  },
  destructiveLabel: {
    color: '#E05C7A',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    gap: 4,
  },
  footerVersion: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  footerTagline: {
    fontSize: 12,
    color: '#AAAAAA',
    fontStyle: 'italic',
  },
});
