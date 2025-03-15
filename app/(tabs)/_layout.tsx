import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '@/constants/layout';
import { PlatformPressable } from '@react-navigation/elements';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';

const TAB_SCREENS = [
  {
    name: 'index',
    title: 'Texts',
    iconOutline: 'book-outline',
    iconFilled: 'book',
  },
  {
    name: 'vocabulary',
    title: 'Words',
    iconOutline: 'receipt-outline',
    iconFilled: 'receipt',
  },
  {
    name: 'bookmarks',
    title: 'Bookmarks',
    iconOutline: 'bookmark-outline',
    iconFilled: 'bookmark',
  },
  {
    name: 'settings',
    title: 'Settings',
    iconOutline: 'settings-outline',
    iconFilled: 'settings',
  },
] as const;

// Standard icon size for tab bar
const ICON_SIZE = 24;

export default function TabLayout() {
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 0,
          height: LAYOUT.BOTTOM_BAR.HEIGHT,
          ...Platform.select({
            ios: {
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: LAYOUT.OPACITY.DIMMED / 2,
              shadowRadius: LAYOUT.SPACING.SMALL / 2,
              paddingBottom: LAYOUT.SPACING.SMALL,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
          ...Platform.select({
            ios: {
              marginBottom: LAYOUT.SPACING.TINY,
              fontWeight: '500', // Make text slightly bolder on iOS for better visibility
            },
            android: {
              paddingBottom: 2,
            },
          }),
        },
        tabBarButton: (props: BottomTabBarButtonProps) => (
          <PlatformPressable
            {...props}
            onPressIn={ev => {
              props.onPressIn?.(ev);
            }}
          />
        ),
        tabBarIconStyle: Platform.OS === 'ios' ? { marginTop: LAYOUT.SPACING.TINY } : undefined,
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
                size={ICON_SIZE}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
