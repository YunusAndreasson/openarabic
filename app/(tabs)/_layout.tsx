import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs, router } from 'expo-router';
import type { JSX } from 'react';
import React, { Fragment, memo, useEffect, useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';

import HeaderProfile from '@/components/HeaderProfile';
import EditModeButton from '@/components/ui/EditModeButton';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth';
import { useColors, useIsDarkMode } from '@/hooks/theme';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

const TAB_SCREENS = [
  {
    name: 'read',
    title: STRINGS.READ,
    iconFilled: 'book',
  },
  {
    name: 'listen',
    title: STRINGS.LISTEN,
    iconFilled: 'headset',
  },
  {
    name: 'practice',
    title: STRINGS.PRACTICE,
    iconFilled: 'school',
  },
] as const;

const BLUR_INTENSITY = 55;

// Static styles for better performance
const styles = StyleSheet.create({
  headerTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    fontWeight: LAYOUT.HEADER.TITLE.SECONDARY.fontWeight,
  },
  tabBarIcon: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
  tabBarStyleIOS: {
    position: 'absolute',
    borderTopWidth: 0,
    height: LAYOUT.BOTTOM_BAR.HEIGHT,
  },
  focusedIcon: {
    opacity: 1,
  },
  unfocusedIcon: {
    opacity: LAYOUT.OPACITY.HIGH,
  },
});

// Simplified header background - works for both platforms
const HeaderBackground = memo(() => {
  const isDarkMode = useIsDarkMode();

  return (
    <BlurView
      intensity={BLUR_INTENSITY}
      style={StyleSheet.absoluteFill}
      tint={isDarkMode ? 'dark' : 'light'}
    />
  );
});
HeaderBackground.displayName = 'HeaderBackground';

// Simplified tab bar background - works for both platforms
const TabBarBackground = memo(() => {
  const isDarkMode = useIsDarkMode();

  return (
    <BlurView
      intensity={BLUR_INTENSITY}
      style={StyleSheet.absoluteFill}
      tint={isDarkMode ? 'dark' : 'light'}
    />
  );
});
TabBarBackground.displayName = 'TabBarBackground';

export default function TabLayout(): JSX.Element {
  const { session, isLoading } = useAuth();
  const colors = useColors();

  // Get due words count using the same hook as the practice screen
  const { dueWords } = useFSRSQueries({ userId: session?.user?.id });
  const dueWordsCount = dueWords?.length ?? 0;

  useEffect(() => {
    if (!isLoading && !session?.user) {
      router.replace(ROUTE_PATHS.AUTH);
    }
  }, [session, isLoading]);

  // Memoize dynamic styles for better performance
  const tabBarStyleAndroid = useMemo(
    () => ({
      position: 'absolute' as const,
      borderTopWidth: LAYOUT.BORDER.WIDTH.THIN,
      borderTopColor: colors.border,
      height: LAYOUT.BOTTOM_BAR.HEIGHT,
      ...LAYOUT.ELEVATION.SMALL,
    }),
    [colors.border]
  );

  if (!session?.user) {
    return <Fragment />;
  }

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerTitleAlign: 'left',
          headerTitleStyle: styles.headerTitle,
          headerTransparent: true,
          headerBackground: () => <HeaderBackground />,

          // Tab bar styling with blur
          tabBarBackground: () => <TabBarBackground />,
          tabBarActiveTintColor: colors.tint,
          tabBarInactiveTintColor: colors.tabIconDefault,
          tabBarShowLabel: false, // Clean icon-only design with 3 tabs and clear nav titles
          tabBarIconStyle: styles.tabBarIcon,
          tabBarStyle: Platform.select({
            ios: styles.tabBarStyleIOS,
            android: tabBarStyleAndroid,
          }),

          // Performance optimizations
          freezeOnBlur: true,
          animation: 'fade',
          lazy: true,
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
                  name={screen.iconFilled}
                  size={LAYOUT.BUTTON.ICON_SIZE.XLARGE}
                  color={color}
                  style={focused ? styles.focusedIcon : styles.unfocusedIcon}
                />
              ),
              // Add badge for practice tab showing due words count
              ...(screen.name === 'practice' && {
                tabBarBadge: dueWordsCount > 0 ? dueWordsCount : undefined,
                tabBarBadgeStyle: {
                  backgroundColor: colors.error,
                  minWidth: 20,
                  height: 20,
                  borderRadius: 10,
                  top: 4,
                  right: 4,
                },
              }),
              // Header customizations for specific screens
              ...(screen.name === 'read' && {
                headerRight: () => <HeaderProfile />,
              }),
              ...(screen.name === 'listen' && {
                headerRight: () => <EditModeButton type="listen" hideWhenEmpty />,
              }),
              // Dictionary button removed - now accessible through stat cards
            }}
          />
        ))}
      </Tabs>
    </>
  );
}
