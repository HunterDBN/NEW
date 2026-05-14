import React, { useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Animated } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { COLORS } from '@/constants/Colors';
import { BarChart2, PlusCircle, Bell, User } from 'lucide-react-native';

const TABS = [
  { name: 'dashboard', route: '/(tabs)/(home)', label: 'Dashboard' },
  { name: 'add', route: '/(tabs)/add', label: 'Add' },
  { name: 'alerts', route: '/(tabs)/alerts', label: 'Alerts' },
  { name: 'profile', route: '/(tabs)/profile', label: 'Profile' },
] as const;

function TabIcon({ name, isActive }: { name: string; isActive: boolean }) {
  const color = name === 'add' ? COLORS.primary : isActive ? COLORS.primary : COLORS.textSecondary;
  const size = 22;
  if (name === 'dashboard') return <BarChart2 size={size} color={color} />;
  if (name === 'add') return <PlusCircle size={size} color={color} />;
  if (name === 'alerts') return <Bell size={size} color={color} />;
  if (name === 'profile') return <User size={size} color={color} />;
  return null;
}

function TabButton({
  tab,
  isActive,
  onPress,
}: {
  tab: typeof TABS[number];
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const isAddTab = tab.name === 'add';

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 50, bounciness: 4 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }),
    ]).start();
    onPress();
  }, [scale, onPress]);

  return (
    <Pressable
      style={styles.tab}
      onPress={handlePress}
      accessibilityLabel={tab.label}
      accessibilityRole="button"
    >
      <Animated.View style={[styles.tabContent, { transform: [{ scale }] }]}>
        {isAddTab ? (
          <View style={styles.addButton}>
            <TabIcon name={tab.name} isActive={isActive} />
          </View>
        ) : (
          <TabIcon name={tab.name} isActive={isActive} />
        )}
        <Text
          style={[
            styles.label,
            isActive && styles.labelActive,
            isAddTab && styles.labelAdd,
          ]}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function PricePulseTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  const activeIndex = React.useMemo(() => {
    if (pathname.includes('/add')) return 1;
    if (pathname.includes('/alerts')) return 2;
    if (pathname.includes('/profile')) return 3;
    return 0;
  }, [pathname]);

  const handlePress = useCallback((route: string, index: number) => {
    console.log(`[TabBar] Tab pressed: ${TABS[index].label}, route: ${route}`);
    router.push(route as any);
  }, [router]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        <BlurView
          intensity={60}
          tint="dark"
          style={styles.blur}
        >
          <View style={styles.innerBorder} />
          <View style={styles.tabsRow}>
            {TABS.map((tab, index) => (
              <TabButton
                key={tab.name}
                tab={tab}
                isActive={activeIndex === index}
                onPress={() => handlePress(tab.route, index)}
              />
            ))}
          </View>
        </BlurView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  blur: {
    overflow: 'hidden',
    borderRadius: 24,
    ...Platform.select({
      android: { backgroundColor: 'rgba(20,20,20,0.97)' },
      web: { backgroundColor: 'rgba(20,20,20,0.97)' },
    }),
  },
  innerBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tabsRow: {
    flexDirection: 'row',
    height: 64,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 44,
  },
  tabContent: {
    alignItems: 'center',
    gap: 3,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textSecondary,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  labelAdd: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
