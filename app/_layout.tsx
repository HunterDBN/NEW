import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useColorScheme, Alert, Linking } from "react-native";
import { useNetworkState } from "expo-network";
import { setPendingShareUrl } from "@/utils/shareUrl";
// @ts-expect-error — no types for expo-share-intent
import { useShareIntent } from "expo-share-intent";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { ErrorBoundary } from "@/components/layout";
import { AuthProvider } from "@/contexts/AuthContext";
import { useSessionStore, useFeedStore, useLikesStore, useOfflineStore } from "@/store";
import { OfflineBanner } from "@/components/layout";
// Note: Error logging is auto-initialized via index.ts import

// Only wrap with ErrorBoundary in dev — production apps should not include it
const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "glowup/splash",
};

function parseShareUrl(raw: string): string | null {
  try {
    // Handle pricepulse://add?url=<encoded>
    const match = raw.match(/pricepulse:\/\/add\?.*url=([^&]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();
  const router = useRouter();
  const initSession        = useSessionStore(s => s.init);
  const sessionUser        = useSessionStore(s => s.user);
  const startLikesRealtime = useLikesStore(s => s.startRealtimeSync);
  const stopLikesRealtime  = useLikesStore(s => s.stopRealtimeSync);
  const disposeFeed        = useFeedStore(s => s.dispose);
  const initOffline        = useOfflineStore(s => s.init);
  const syncNow            = useOfflineStore(s => s.syncNow);

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Initialise Zustand session store once on app start
  useEffect(() => {
    initSession();
    initOffline();
  }, []);

  // Start/stop realtime channels + sync when auth state changes
  useEffect(() => {
    if (sessionUser?.id) {
      startLikesRealtime(sessionUser.id);
      syncNow(); // replay any actions queued while logged out
    }
    return () => {
      stopLikesRealtime();
      disposeFeed();
    };
  }, [sessionUser?.id]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  const { shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    if (!shareIntent) return;
    const sharedUrl = shareIntent.webUrl ?? (shareIntent.text?.startsWith('http') ? shareIntent.text : null);
    if (sharedUrl) {
      console.log('[ShareIntent] Received shared URL:', sharedUrl);
      setPendingShareUrl(sharedUrl);
      router.push('/(tabs)/add' as any);
    }
    resetShareIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareIntent]);

  // Handle deep links / Share Sheet
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      console.log('[DeepLink] Received URL:', event.url);
      const productUrl = parseShareUrl(event.url);
      if (productUrl) {
        console.log('[DeepLink] Parsed product URL:', productUrl);
        setPendingShareUrl(productUrl);
        router.push('/(tabs)/add' as any);
      }
    };

    // Cold-start: app opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[DeepLink] Initial URL:', url);
        handleUrl({ url });
      }
    });

    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, [router]);

  React.useEffect(() => {
    if (
      !networkState.isConnected &&
      networkState.isInternetReachable === false
    ) {
      Alert.alert(
        "🔌 You are offline",
        "You can keep using the app! Your changes will be saved locally and synced when you are back online."
      );
    }
  }, [networkState.isConnected, networkState.isInternetReachable]);

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: "rgb(0, 122, 255)",
      background: "#FFF5F7",
      card: "rgb(255, 255, 255)",
      text: "rgb(0, 0, 0)",
      border: "rgb(216, 216, 220)",
      notification: "rgb(255, 59, 48)",
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: "rgb(10, 132, 255)",
      background: "rgb(1, 1, 1)",
      card: "rgb(28, 28, 30)",
      text: "rgb(255, 255, 255)",
      border: "rgb(44, 44, 46)",
      notification: "rgb(255, 69, 58)",
    },
  };

  return (
    <DevErrorBoundary>
      <StatusBar style="auto" animated />
      <ThemeProvider
        value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}
      >
        <SafeAreaProvider>
          <AuthProvider>
            <WidgetProvider>
              <GestureHandlerRootView>
                <Stack>
                  {/* Main app with tabs */}
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

                  {/* GlowUp screens */}
                  <Stack.Screen name="glowup/splash" options={{ headerShown: false }} />
                  <Stack.Screen name="glowup/onboarding" options={{ headerShown: false }} />
                  <Stack.Screen name="glowup/auth" options={{ headerShown: false }} />
                  <Stack.Screen name="glowup/niche-selection" options={{ headerShown: false }} />
                  <Stack.Screen name="glowup/create-post" options={{ headerShown: false }} />
                  <Stack.Screen name="glowup/post/[id]" options={{ headerShown: false }} />
                  <Stack.Screen name="glowup/settings" options={{ headerShown: false }} />
                  <Stack.Screen name="glowup/edit-profile" options={{ headerShown: false }} />

                  {/* Auth screens */}
                  <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
                  <Stack.Screen name="auth-callback" options={{ headerShown: false }} />

                  {/* Product detail stack screen */}
                  <Stack.Screen
                    name="product/[id]"
                    options={{
                      headerStyle: { backgroundColor: '#0A0A0A' },
                      headerTintColor: '#FFFFFF',
                      headerTitleStyle: { color: '#FFFFFF', fontWeight: '700' },
                      headerBackTitle: '',
                    }}
                  />
                  {/* TrendJack screens */}
                  <Stack.Screen name="trendjack/splash" options={{ headerShown: false }} />
                  <Stack.Screen name="trendjack/onboarding" options={{ headerShown: false }} />
                  <Stack.Screen name="trendjack/niche-selection" options={{ headerShown: false }} />
                  <Stack.Screen name="trendjack/trend/[id]" options={{ headerShown: false }} />
                </Stack>
                <SystemBars style={"auto"} />
              </GestureHandlerRootView>
              <OfflineBanner />
            </WidgetProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </DevErrorBoundary>
  );
}
