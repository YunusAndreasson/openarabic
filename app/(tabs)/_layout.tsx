import { Tabs } from 'expo-router';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, ViewStyle } from 'react-native';
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
    iconOutline: 'library-outline',
    iconFilled: 'library',
  },
  {
    name: 'playlist',
    title: 'Playlist',
    iconOutline: 'play-circle-outline',
    iconFilled: 'play-circle',
  },
  {
    name: 'account',
    title: 'Account',
    iconOutline: 'person-outline',
    iconFilled: 'person',
  },
] as const;

// Standard icon size for tab bar
const ICON_SIZE = 24;

export default function TabLayout() {
  const colors = useColors();

  // Memoize styles to prevent unnecessary recalculations on re-renders
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: styles.tabBar,
        headerStyle: styles.header,
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
                size={ICON_SIZE}
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

// Extract styles to a separate function for better organization and memoization
const createStyles = (colors: ReturnType<typeof useColors>) => {
  // Define platform-specific tab bar styles
  const iosTabBarStyle: ViewStyle = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopColor: colors.cardBorder,
    borderTopWidth: LAYOUT.BORDER.WIDTH.THIN,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: LAYOUT.OPACITY.DIMMED / 2, // 0.35 (half of DIMMED opacity)
    shadowRadius: LAYOUT.SPACING.SMALL / 2, // 4
    height: LAYOUT.BOTTOM_BAR.HEIGHT,
    zIndex: LAYOUT.Z_INDEX.HEADER,
  };

  const androidTabBarStyle: ViewStyle = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopColor: colors.cardBorder,
    borderTopWidth: LAYOUT.BORDER.WIDTH.THIN,
    elevation: 8, // Use a direct value since we can't safely access nested optional properties
    height: LAYOUT.BOTTOM_BAR.HEIGHT,
    zIndex: LAYOUT.Z_INDEX.HEADER,
  };

  return StyleSheet.create({
    tabBar: Platform.OS === 'ios' ? iosTabBarStyle : androidTabBarStyle,
    header: {
      backgroundColor: colors.background,
    },
  });
};
