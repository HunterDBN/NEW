import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { House, Compass, Star, BookOpen, User, Bell } from 'lucide-react-native';
import { useNotificationsStore } from '@/store';

function NotificationTabIcon({ color, size }: { color: string; size: number }) {
  const unreadCount = useNotificationsStore(s => s.unreadCount);
  return (
    <View>
      <Bell size={size} color={color} />
      {unreadCount > 0 && (
        <View style={badgeStyles.badge}>
          <Text style={badgeStyles.text}>
            {unreadCount > 99 ? '99+' : String(unreadCount)}
          </Text>
        </View>
      )}
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position:       'absolute',
    top:            -4,
    right:          -6,
    minWidth:       16,
    height:         16,
    borderRadius:   8,
    backgroundColor: '#FF3B5C',
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth:    1.5,
    borderColor:    '#fff',
  },
  text: { color: '#fff', fontSize: 9, fontWeight: '800', lineHeight: 13 },
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F4E8EC',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#F4A7B9',
        tabBarInactiveTintColor: '#CCCCCC',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <House size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => <Compass size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Challenges',
          tabBarIcon: ({ color, size }) => <Star size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: (props) => <NotificationTabIcon {...props} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
