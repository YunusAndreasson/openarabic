import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/TabBarBackground';

const TAB_SCREENS = [
  {
    name: 'index',
    title: 'Texts',
    iconName: 'book-outline',
  },
  {
    name: 'vocabulary',
    title: 'Vocabulary',
    iconName: 'text-outline',
  },
  {
    name: 'account',
    title: 'Account',
    iconName: 'person-circle-outline',
  },
] as const;

const tabBarStyles = Platform.select({
  ios: {
    position: 'absolute' as const,
  },
  default: {},
});

export default function TabLayout() {
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: [
          tabBarStyles,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.icon,
          },
        ],
      }}
    >
      {TAB_SCREENS.map(({ name, title, iconName }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name={iconName as keyof typeof Ionicons.glyphMap}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
