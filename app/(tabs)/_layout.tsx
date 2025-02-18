import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';

const TAB_SCREENS = [
  {
    name: 'index',
    title: 'Texts',
    iconOutline: 'book-outline',
    iconFilled: 'book',
  },
  {
    name: 'vocabulary',
    title: 'Vocabulary',
    iconOutline: 'text-outline',
    iconFilled: 'text',
  },
  {
    name: 'playlist',
    title: 'Playlist',
    iconOutline: 'list-outline',
    iconFilled: 'list',
  },

  {
    name: 'account',
    title: 'Account',
    iconOutline: 'person-outline',
    iconFilled: 'person',
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
      {TAB_SCREENS.map(screen => (
        <Tabs.Screen
          key={screen.name}
          name={screen.name}
          options={{
            title: screen.title,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? screen.iconFilled : screen.iconOutline}
                size={24}
                color={color}
              />
            ),
            headerShown: false,
          }}
        />
      ))}
    </Tabs>
  );
}
