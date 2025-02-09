import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// Define tab screen configurations separately for better maintainability
const TAB_SCREENS = [
  {
    name: 'index',
    title: 'Home',
    iconName: 'house.fill',
  },
  {
    name: 'explore',
    title: 'Explore',
    iconName: 'paperplane.fill',
  },
] as const;

// Separate platform-specific styles
const tabBarStyles = Platform.select({
  ios: {
    position: 'absolute' as const,
  },
  default: {},
});

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? 'light'].tint;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tintColor,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: tabBarStyles,
      }}
    >
      {TAB_SCREENS.map(({ name, title, iconName }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color }) => <IconSymbol size={28} name={iconName} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
