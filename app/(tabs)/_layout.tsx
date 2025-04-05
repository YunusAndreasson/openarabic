import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import type { Route } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import React, { useMemo, useCallback, memo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { withOpacity } from '@/utils/colorUtils';

const TAB_SCREENS = [
  {
    name: 'index',
    title: 'Texts',
    iconOutline: 'book-outline',
    iconFilled: 'book',
    accessibilityLabel: 'Texts tab',
  },
  {
    name: 'vocabulary',
    title: 'Words',
    iconOutline: 'receipt-outline',
    iconFilled: 'receipt',
    accessibilityLabel: 'Words tab',
  },
  {
    name: 'bookmarks',
    title: 'Bookmarks',
    iconOutline: 'bookmark-outline',
    iconFilled: 'bookmark',
    accessibilityLabel: 'Bookmarks tab',
  },
  {
    name: 'settings',
    title: 'Settings',
    iconOutline: 'settings-outline',
    iconFilled: 'settings',
    accessibilityLabel: 'Settings tab',
  },
] as const;

// Standard icon size for tab bar
const ICON_SIZE = 24;

// Platform-specific shadow styles
const PLATFORM_STYLES = Platform.select({
  ios: {
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: LAYOUT.OPACITY.DIMMED / 2,
    shadowRadius: LAYOUT.SPACING.SMALL / 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  android: {
    elevation: 8,
  },
}) as ViewStyle;

const CustomTabBar = memo(({ state, descriptors, navigation }: BottomTabBarProps) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const intensity = Platform.OS === 'ios' ? 55 : 80;
  const isDarkMode = useIsDarkMode();

  // Calculate appropriate bottom padding based on device
  const bottomInset = useMemo(
    () => (Platform.OS === 'ios' ? Math.min(insets.bottom, LAYOUT.SPACING.MEDIUM) : 0),
    [insets.bottom]
  );

  const blurContainerStyle = useMemo(
    () => [
      styles.blurContainer,
      {
        backgroundColor: colors.transparent,
        height: LAYOUT.BOTTOM_BAR.HEIGHT + bottomInset,
        paddingBottom: bottomInset,
        ...PLATFORM_STYLES,
        ...(Platform.OS === 'ios' && {
          shadowColor: colors.shadow,
          borderTopColor: colors.borderOverlay,
        }),
      },
    ],
    [colors.shadow, colors.transparent, colors.borderOverlay, bottomInset]
  );

  // Memoize tab button styles
  const getTabButtonStyle = useCallback(
    (isFocused: boolean) => ({
      ...styles.label,
      color: isFocused ? colors.tint : colors.tabIconDefault,
      opacity: isFocused ? 1 : 0.7,
      ...Platform.select({
        ios: {
          fontWeight: '500' as const,
        },
        android: {
          paddingBottom: 2,
        },
      }),
    }),
    [colors.tint, colors.tabIconDefault]
  );

  // Memoize ripple color
  const rippleColor = useMemo(() => withOpacity(colors.tint, 0.25), [colors.tint]);

  // Memoized tab press handler
  const getTabPressHandler = useCallback(
    (route: Route<string>, isFocused: boolean) => {
      return () => {
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
          navigation.navigate(route.name);
        }
      };
    },
    [navigation]
  );

  return (
    <BlurView intensity={intensity} tint={isDarkMode ? 'dark' : 'light'} style={blurContainerStyle}>
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key];
        if (!descriptor) return null;

        const { options } = descriptor;
        const label = options.title ?? route.name;
        const isFocused = state.index === index;

        const screen = TAB_SCREENS.find(s => s.name === route.name);
        if (!screen) return null;

        return (
          <PlatformPressable
            key={route.key}
            onPress={getTabPressHandler(route, isFocused)}
            style={[
              styles.tabButton,
              {
                paddingTop: LAYOUT.SPACING.TINY,
              },
            ]}
            android_ripple={{ color: rippleColor, borderless: true }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={screen.accessibilityLabel || label}
          >
            <Ionicons
              name={isFocused ? screen.iconFilled : screen.iconOutline}
              size={ICON_SIZE}
              color={isFocused ? colors.tint : colors.tabIconDefault}
              style={isFocused ? styles.activeIcon : styles.inactiveIcon}
            />
            <ThemedText style={getTabButtonStyle(isFocused)} skipDefaultColor>
              {label}
            </ThemedText>
          </PlatformPressable>
        );
      })}
    </BlurView>
  );
});
CustomTabBar.displayName = 'CustomTabBar';

export default function TabLayout(): JSX.Element {
  const colors = useColors();

  const screenOptions = useMemo(
    () => ({
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
            fontWeight: '500' as const,
          },
          android: {
            paddingBottom: 2,
          },
        }),
      },
    }),
    [colors.tint, colors.tabIconDefault]
  );

  return (
    <Tabs tabBar={props => <CustomTabBar {...props} />} screenOptions={screenOptions}>
      {TAB_SCREENS.map(screen => (
        <Tabs.Screen
          key={screen.name}
          name={screen.name}
          options={{
            title: screen.title,
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIcon: {
    opacity: 1,
  },
  blurContainer: {
    borderTopWidth: 0,
    bottom: 0,
    flexDirection: 'row',
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: LAYOUT.Z_INDEX.HEADER, // Match z-index with top header
  },
  inactiveIcon: {
    opacity: 0.7,
  },
  label: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    marginTop: LAYOUT.SPACING.TINY / 2,
    textAlign: 'center',
  },
  tabButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: LAYOUT.SPACING.TINY / 2,
  },
});
