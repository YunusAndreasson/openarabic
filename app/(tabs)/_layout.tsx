import { Tabs } from 'expo-router';
import React, { useMemo, useCallback } from 'react';
import { Platform, StyleSheet, Animated } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '@/constants/layout';
import { PlatformPressable } from '@react-navigation/elements';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { ThemedText } from '@/components/ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  },
  android: {
    elevation: 8,
  },
}) as any;

const CustomTabBar = React.memo(({ state, descriptors, navigation }: BottomTabBarProps) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const intensity = Platform.OS === 'ios' ? 55 : 80;
  const isDarkMode = colors.background === '#121212';

  // Calculate appropriate bottom padding based on device
  const bottomInset = useMemo(
    () => (Platform.OS === 'ios' ? Math.min(insets.bottom, LAYOUT.SPACING.MEDIUM) : 0),
    [insets.bottom]
  );

  const blurContainerStyle = useMemo(
    () => [
      styles.blurContainer,
      {
        backgroundColor: isDarkMode ? 'rgba(18, 18, 18, 0.75)' : 'rgba(255, 255, 255, 0.75)',
        height: LAYOUT.BOTTOM_BAR.HEIGHT + bottomInset,
        paddingBottom: bottomInset,
        ...PLATFORM_STYLES,
        ...(Platform.OS === 'ios' && { shadowColor: colors.shadow }),
      },
    ],
    [colors.shadow, bottomInset, isDarkMode]
  );

  // Memoize tab button styles
  const getTabButtonStyle = useCallback(
    (isFocused: boolean) => ({
      ...styles.label,
      color: isFocused ? colors.tint : colors.tabIconDefault,
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
  const rippleColor = useMemo(() => colors.tint + '40', [colors.tint]);

  // Memoized debounced tab press handler
  const getTabPressHandler = useCallback(
    (route: any, isFocused: boolean) => {
      let lastPress = 0;
      const PRESS_DELAY = 500;

      return () => {
        const now = Date.now();
        if (now - lastPress < PRESS_DELAY) {
          return;
        }
        lastPress = now;

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
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const isFocused = state.index === index;

        const screen = TAB_SCREENS.find(s => s.name === route.name);
        if (!screen) return null;

        return (
          <PlatformPressable
            key={route.key}
            onPress={getTabPressHandler(route, isFocused)}
            style={styles.tabButton}
            android_ripple={{ color: rippleColor, borderless: true }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={screen.accessibilityLabel || label}
          >
            <Ionicons
              name={isFocused ? screen.iconFilled : screen.iconOutline}
              size={ICON_SIZE}
              color={isFocused ? colors.tint : colors.tabIconDefault}
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

export default function TabLayout() {
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
  blurContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: 0,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: LAYOUT.SPACING.TINY / 2,
  },
  label: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    textAlign: 'center',
  },
});
