import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import type { Route } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import type { BlurTint } from 'expo-blur';
import { Tabs, router } from 'expo-router';
import React, { useMemo, useCallback, memo, useEffect, JSX } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { Colors } from '@/constants/Colors';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { withOpacity } from '@/utils/colorUtils';

import { useAuth } from '../../hooks/useAuth';

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

const ICON_SIZE = 24;
const BLUR_INTENSITY = 55;

const LIGHT_MODE_SHADOW_COLOR = Colors.light.borderOverlay;
const LIGHT_MODE_SHADOW_OPACITY = 1;
const LIGHT_MODE_SHADOW_RADIUS = 10;

type PlatformStyle = {
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  borderTopWidth?: number;
  elevation?: number;
};

const CustomTabBar = memo(({ state, descriptors, navigation }: BottomTabBarProps) => {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const insets = useSafeAreaInsets();

  const PLATFORM_STYLES: PlatformStyle =
    Platform.select({
      ios: isDarkMode
        ? {
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            borderTopWidth: StyleSheet.hairlineWidth,
          }
        : {
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: LIGHT_MODE_SHADOW_OPACITY,
            shadowRadius: LIGHT_MODE_SHADOW_RADIUS,
            borderTopWidth: StyleSheet.hairlineWidth,
          },
      android: {
        borderTopWidth: StyleSheet.hairlineWidth,
        elevation: 8,
      },
    }) ?? {};

  const bottomInset = useMemo(
    () =>
      Platform.OS === 'ios' ? Math.min(insets.bottom, LAYOUT.SPACING.MEDIUM) : LAYOUT.SPACING.SMALL,
    [insets.bottom]
  );

  const containerStyle = useMemo(
    () => ({
      ...styles.container,
      height:
        LAYOUT.BOTTOM_BAR.HEIGHT +
        bottomInset +
        (Platform.OS === 'android' ? LAYOUT.SPACING.SMALL : 0),
      paddingBottom: bottomInset,
      ...PLATFORM_STYLES,
      borderTopColor: colors.borderOverlay,
      ...(Platform.OS === 'ios'
        ? {
            shadowColor: isDarkMode ? colors.shadow : LIGHT_MODE_SHADOW_COLOR,
          }
        : { backgroundColor: colors.background }),
    }),
    [colors.shadow, colors.background, colors.borderOverlay, bottomInset, isDarkMode]
  );

  const TabBarContainer = Platform.OS === 'ios' ? BlurView : View;
  const blurProps =
    Platform.OS === 'ios'
      ? {
          intensity: BLUR_INTENSITY,
          tint: (isDarkMode ? 'dark' : 'light') as BlurTint,
        }
      : {};

  const getTabButtonStyle = useCallback(
    (isFocused: boolean): TextStyle => ({
      ...styles.label,
      ...styles.labelPlatform,
      color: isFocused ? colors.tint : colors.tabIconDefault,
      opacity: isFocused ? 1 : 0.7,
    }),
    [colors.tint, colors.tabIconDefault]
  );

  const rippleColor = useMemo(() => withOpacity(colors.tint, 0.25), [colors.tint]);

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
    <TabBarContainer style={containerStyle} {...blurProps}>
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
            style={styles.tabButton}
            android_ripple={{ color: rippleColor, borderless: true }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
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
    </TabBarContainer>
  );
});
CustomTabBar.displayName = 'CustomTabBar';

// Custom Header Background component with blur effect
const CustomHeaderBackground = () => {
  const isDarkMode = useIsDarkMode();
  const overlayColor = isDarkMode
    ? withOpacity(Colors.dark.background, 0.85)
    : withOpacity(Colors.light.white, 0.85);

  if (Platform.OS === 'android') {
    return (
      <View style={StyleSheet.absoluteFill}>
        <BlurView
          tint={isDarkMode ? 'dark' : 'light'}
          intensity={BLUR_INTENSITY}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]} />
      </View>
    );
  }

  return (
    <BlurView
      tint={isDarkMode ? 'dark' : 'light'}
      intensity={BLUR_INTENSITY}
      style={StyleSheet.absoluteFill}
    />
  );
};

// Move static styles outside the component
const HEADER_TITLE_STYLE = {
  fontSize: 22,
  fontWeight: '600' as const,
  paddingLeft: 8,
};

const HEADER_STYLE = {
  elevation: 0,
  shadowOpacity: 0,
  borderBottomWidth: 0,
};

export default function TabLayout(): JSX.Element | null {
  const { session, isLoading } = useAuth();
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Memoize headerBackground to avoid inline function recreation
  const headerBackground = useCallback(() => <CustomHeaderBackground />, []);

  const screenOptions = useMemo(
    () => ({
      headerShown: true,
      tabBarActiveTintColor: colors.tint,
      tabBarInactiveTintColor: colors.tabIconDefault,
      tabBarHideOnKeyboard: true,
      tabBarShowLabel: true,
      tabBarLabelStyle: styles.tabBarLabel,

      // Tab animation optimizations
      freezeOnBlur: true,
      animation: 'fade' as const,

      // Header customization
      headerTitleAlign: 'left' as const,
      headerTitleStyle: HEADER_TITLE_STYLE,
      headerStyle: HEADER_STYLE,
      headerBackground: headerBackground, // Use memoized function
      headerTransparent: true,
    }),
    [colors.tint, colors.tabIconDefault, isDarkMode, headerBackground]
  );

  useEffect(() => {
    if (!isLoading && !session?.user) {
      router.replace('/auth');
    }
  }, [session, isLoading]);

  if (!session?.user) {
    return null;
  }

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
  container: {
    borderTopWidth: 0,
    bottom: 0,
    flexDirection: 'row',
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: LAYOUT.Z_INDEX.HEADER,
    ...Platform.select({
      android: {
        paddingTop: LAYOUT.SPACING.SMALL,
        paddingBottom: LAYOUT.SPACING.TINY,
      },
    }),
  },
  inactiveIcon: {
    opacity: 0.7,
  },
  label: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    marginTop: LAYOUT.SPACING.TINY / 2,
    textAlign: 'center',
  },
  labelPlatform: Platform.select({
    ios: {
      fontWeight: '500',
    },
    android: {
      paddingBottom: 2,
    },
  }) as TextStyle,
  tabBarLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    ...Platform.select({
      ios: {
        marginBottom: LAYOUT.SPACING.TINY,
        fontWeight: '500',
      },
      android: {
        paddingBottom: 2,
      },
    }),
  } as TextStyle,
  tabButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        paddingBottom: LAYOUT.SPACING.TINY / 2,
        paddingTop: LAYOUT.SPACING.TINY,
      },
      android: {
        paddingBottom: LAYOUT.SPACING.TINY,
        paddingTop: LAYOUT.SPACING.SMALL,
      },
    }),
  },
});
