import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'tj_device_id';
const ONBOARDING_KEY = 'tj_onboarding_complete';

function generateUUID(): string {
  const timestamp = Date.now().toString(36);
  const random1 = Math.random().toString(36).substring(2, 10);
  const random2 = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random1}-${random2}`;
}

export async function getDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const newId = generateUUID();
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    console.log('[TJStorage] Generated new device ID:', newId);
    return newId;
  } catch (e) {
    console.error('[TJStorage] getDeviceId error:', e);
    return 'fallback-device-id';
  }
}

export async function setOnboardingComplete(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, value ? '1' : '0');
    console.log('[TJStorage] Onboarding complete set to:', value);
  } catch (e) {
    console.error('[TJStorage] setOnboardingComplete error:', e);
  }
}

export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(ONBOARDING_KEY);
    return val === '1';
  } catch (e) {
    console.error('[TJStorage] isOnboardingComplete error:', e);
    return false;
  }
}
