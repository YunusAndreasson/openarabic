import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/IconSymbol';
import TabBarBackground from '@/components/TabBarBackground';

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
            tabBarIcon: ({ color }) => <IconSymbol size={28} name={iconName} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
