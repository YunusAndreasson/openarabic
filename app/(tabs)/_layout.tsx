import { Tabs } from 'expo-router';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '@/constants/layout';
import { HapticTab } from '@/components/HapticTab';

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
    iconOutline: 'language-outline',
    iconFilled: 'language',
  },
  {
    name: 'playlist',
    title: 'Playlist',
    iconOutline: 'headset-outline',
    iconFilled: 'headset',
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
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarHideOnKeyboard: true,
        // Ensure consistent styling for all tabs
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabBarLabel,
        // Use HapticTab for all tabs to ensure consistent behavior
        tabBarButton: props => <HapticTab {...props} />,
        // Adjust icon position for better alignment with label
        tabBarIconStyle: styles.tabBarIcon,
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

// Extract styles to a separate function for better organization and memoization
const createStyles = (colors: ReturnType<typeof useColors>) => {
  // Define a single consistent tab bar style for both platforms
  const tabBarStyle: ViewStyle = {
    backgroundColor: colors.background,
    // Remove the border top to eliminate separation line
    borderTopWidth: 0,
    height: LAYOUT.BOTTOM_BAR.HEIGHT,
    // Add platform-specific shadow styling
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: LAYOUT.OPACITY.DIMMED / 2,
        shadowRadius: LAYOUT.SPACING.SMALL / 2,
        // Add padding for iOS to ensure text visibility
        paddingBottom: LAYOUT.SPACING.SMALL,
      },
      android: {
        elevation: 8,
      },
    }),
  };

  return StyleSheet.create({
    tabBar: tabBarStyle,
    tabBarLabel: {
      fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
      // Adjust padding based on platform
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
    tabBarIcon:
      Platform.OS === 'ios'
        ? {
            marginTop: LAYOUT.SPACING.TINY,
          }
        : {},
  });
};
