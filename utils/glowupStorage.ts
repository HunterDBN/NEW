import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'glowup_onboarding_done';
const NICHE_KEY = 'glowup_niches_selected';

export async function hasCompletedOnboarding(): Promise<boolean> {
  const val = await AsyncStorage.getItem(ONBOARDING_KEY);
  return val === 'true';
}

export async function markOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

export async function hasSelectedNiches(): Promise<boolean> {
  const val = await AsyncStorage.getItem(NICHE_KEY);
  return val === 'true';
}

export async function markNichesSelected(): Promise<void> {
  await AsyncStorage.setItem(NICHE_KEY, 'true');
}
