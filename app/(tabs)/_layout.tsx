import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '@/constants/layout';

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
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.background,
            borderTopColor: colors.icon,
            borderTopWidth: 0.5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            height: LAYOUT.BOTTOM_BAR.HEIGHT,
            zIndex: LAYOUT.Z_INDEX.HEADER,
          },
          android: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.background,
            borderTopColor: colors.icon,
            borderTopWidth: 0.5,
            elevation: 8,
            height: LAYOUT.BOTTOM_BAR.HEIGHT,
            zIndex: LAYOUT.Z_INDEX.HEADER,
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
