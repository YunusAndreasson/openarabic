import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import type { Route } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import type { BlurTint } from 'expo-blur';
import { Tabs, router } from 'expo-router';
import React, { useMemo, useCallback, memo, useEffect } from 'react';
import { Platform, StyleSheet, View, Text } from 'react-native';
import type { TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HeaderProfile from '@/components/HeaderProfile';
import { Colors } from '@/constants/Colors';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';

import { useAuth } from '../../hooks/auth/useAuth';

const TAB_SCREENS = [
  {
    name: 'read',
    title: 'Read',
    iconOutline: 'book-outline',
    iconFilled: 'book',
  },
  {
    name: 'listen',
    title: 'Listen',
    iconOutline: 'headset-outline',
    iconFilled: 'headset',
  },
  {
    name: 'practice',
    title: 'Practice',
    iconOutline: 'trending-up-outline',
    iconFilled: 'trending-up',
  },
] as const;

const ICON_SIZE = 24;
const BLUR_INTENSITY = 55;

const CustomTabBar = memo(({ state, descriptors, navigation }: BottomTabBarProps) => {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const insets = useSafeAreaInsets();

  const platformStyles = useMemo(
    () =>
      Platform.select({
        ios: isDarkMode
          ? {
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: LAYOUT.OPACITY.SUBTLE,
              shadowRadius: 8,
              borderTopWidth: StyleSheet.hairlineWidth,
            }
          : {
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 1,
              shadowRadius: 10,
              borderTopWidth: StyleSheet.hairlineWidth,
            },
        android: {
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: LAYOUT.ELEVATION.MEDIUM,
        },
      }) ?? {},
    [isDarkMode]
  );

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
      ...platformStyles,
      borderTopColor: colors.borderOverlay,
      ...(Platform.OS === 'ios'
        ? {
            shadowColor: isDarkMode ? colors.shadow : Colors.light.borderOverlay,
          }
        : {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          }),
    }),
    [
      colors.shadow,
      colors.background,
      colors.borderOverlay,
      colors.border,
      bottomInset,
      isDarkMode,
      platformStyles,
    ]
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
    }),
    [colors.tint, colors.tabIconDefault]
  );

  const rippleColor = useMemo(() => colors.navigationRipple, [colors.navigationRipple]);

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
      {Platform.OS === 'android' ? (
        <>
          <BlurView
            intensity={BLUR_INTENSITY}
            style={StyleSheet.absoluteFill}
            tint={isDarkMode ? 'dark' : 'light'}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBarOverlay }]} />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBarOverlay }]} />
      )}
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
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            android_ripple={{ color: rippleColor, borderless: true }}
            style={styles.tabButton}
            onPress={getTabPressHandler(route, isFocused)}
          >
            <Ionicons
              color={isFocused ? colors.tint : colors.tabIconDefault}
              name={isFocused ? screen.iconFilled : screen.iconOutline}
              size={ICON_SIZE}
              style={[
                isFocused ? styles.activeIcon : styles.inactiveIcon,
                {
                  textShadowColor: isDarkMode ? colors.textShadowLight : colors.textShadowDark,
                  textShadowOffset: { width: 0, height: 0.5 },
                  textShadowRadius: 1,
                },
              ]}
            />
            <Text style={getTabButtonStyle(isFocused)}>{label}</Text>
          </PlatformPressable>
        );
      })}
    </TabBarContainer>
  );
});
CustomTabBar.displayName = 'CustomTabBar';

const CustomHeaderBackground = memo(() => {
  const isDarkMode = useIsDarkMode();
  const colors = useColors();

  if (Platform.OS === 'android') {
    return (
      <View style={StyleSheet.absoluteFill}>
        <BlurView
          intensity={BLUR_INTENSITY}
          style={StyleSheet.absoluteFill}
          tint={isDarkMode ? 'dark' : 'light'}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.headerOverlay }]} />
      </View>
    );
  }

  return (
    <BlurView
      intensity={BLUR_INTENSITY}
      style={StyleSheet.absoluteFill}
      tint={isDarkMode ? 'dark' : 'light'}
    />
  );
});
CustomHeaderBackground.displayName = 'CustomHeaderBackground';

const HEADER_TITLE_STYLE = {
  ...LAYOUT.HEADER.TITLE.MAIN,
  fontWeight: LAYOUT.HEADER.TITLE.MAIN.fontWeight as any,
};

const HEADER_STYLE = {
  elevation: 0,
  shadowOpacity: 0,
  borderBottomWidth: 0,
};

export default function TabLayout() {
  const { session, isLoading } = useAuth();

  const headerBackground = useCallback(() => <CustomHeaderBackground />, []);
  const headerProfileComponent = useCallback(() => <HeaderProfile />, []);

  const screenOptions = useMemo(
    () => ({
      headerShown: true,
      headerTitleAlign: 'left' as const,
      headerTitleStyle: HEADER_TITLE_STYLE,
      headerStyle: HEADER_STYLE,
      headerBackground: headerBackground,
      headerTransparent: true,
      freezeOnBlur: true,
      animation: 'fade' as const,
      lazy: true,
    }),
    [headerBackground]
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
    <Tabs screenOptions={screenOptions} tabBar={props => <CustomTabBar {...props} />}>
      {TAB_SCREENS.map(screen => (
        <Tabs.Screen
          key={screen.name}
          name={screen.name}
          options={{
            title: screen.title,
            ...(screen.name === 'read' && {
              headerRight: headerProfileComponent,
            }),
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
      paddingBottom: LAYOUT.SPACING.TINY,
    },
  }) as TextStyle,
  tabButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET.SIZE, // Ensure tabs meet accessibility requirements
    minWidth: MIN_TOUCH_TARGET.MEDIUM, // Ensure minimum width for touch
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
