import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';

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

export default function TabLayout() {
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: Platform.select({
          ios: {
            backgroundColor: colors.background,
            borderTopColor: colors.icon,
          },
          android: {
            backgroundColor: colors.background,
            borderTopColor: colors.icon,
            elevation: 8,
          },
        }),
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarHideOnKeyboard: true,
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
            ...(name === 'index' ? { headerShown: false } : {}),
          }}
        />
      ))}
    </Tabs>
  );
}
