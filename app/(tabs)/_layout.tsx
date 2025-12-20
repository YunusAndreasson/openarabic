import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { JSX } from 'react';
import React, { Fragment, useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { TAB_SCREENS } from '@/constants/tabs';
import { useAuth } from '@/hooks/auth';
import { useColors } from '@/hooks/theme';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { analytics } from '@/services/analytics';
import { router } from 'expo-router';

export default function TabLayout(): JSX.Element {
  const { session, isLoading } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const previousScreen = useRef<string | null>(null);

  // Get due words count using the same hook as the practice screen
  const { dueWords } = useFSRSQueries({ userId: session?.user?.id });
  const dueWordsCount = dueWords?.length ?? 0;

  // Track screen views on tab change
  const handleTabStateChange = useCallback(
    (e: { data: { state: { routes: Array<{ name: string }>; index: number } } }) => {
      const state = e.data.state;
      if (state?.routes && typeof state.index === 'number') {
        const currentRoute = state.routes[state.index];
        const screenName = currentRoute?.name;

        if (screenName && screenName !== previousScreen.current) {
          analytics.track(ANALYTICS_EVENTS.SCREEN_VIEWED, {
            screen_name: screenName,
            previous_screen: previousScreen.current,
          });
          previousScreen.current = screenName;
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!isLoading && !session?.user) {
      router.replace(ROUTE_PATHS.AUTH);
    }
  }, [session, isLoading]);

  // Tab bar style with padding for proper icon spacing
  // Android needs explicit height to prevent label text clipping
  const tabBarStyle = useMemo(() => {
    const baseStyle = {
      borderTopWidth: 0,
      backgroundColor: colors.elevation0,
      paddingTop: LAYOUT.SPACING.SMALL, // 8px padding above icons
    };

    if (Platform.OS === 'android') {
      // Android: Set explicit height to ensure labels have enough space
      // 56px base height + safe area inset + extra padding for labels
      return {
        ...baseStyle,
        height: 56 + insets.bottom + LAYOUT.SPACING.MEDIUM,
        paddingBottom: insets.bottom + LAYOUT.SPACING.MEDIUM,
      };
    }

    // iOS: Just use padding for safe area
    return {
      ...baseStyle,
      paddingBottom: insets.bottom,
    };
  }, [colors.elevation0, insets.bottom]);

  // Label style to fix Android text rendering
  // Android adds extra font padding - disabling it ensures proper text rendering
  const tabBarLabelStyle = useMemo(
    () => ({
      ...(Platform.OS === 'android' && {
        includeFontPadding: false,
      }),
    }),
    [],
  );

  // Badge style for perfect circle
  const badgeStyle = {
    minWidth: LAYOUT.SPACING.XLARGE, // 24px minimum for circle
    minHeight: LAYOUT.SPACING.XLARGE, // 24px minimum for circle
    borderRadius: LAYOUT.BORDER_RADIUS.PILL, // Perfect circle
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL, // 13px for better readability
    lineHeight: LAYOUT.SPACING.XLARGE, // Center text vertically
  };

  if (!colors || !session?.user) {
    return <Fragment />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarShowLabel: true,
        tabBarStyle: tabBarStyle,
        tabBarLabelStyle: tabBarLabelStyle,
      }}
      screenListeners={{
        state: handleTabStateChange,
      }}
    >
      {TAB_SCREENS.map(screen => (
        <Tabs.Screen
          key={screen.name}
          name={screen.name}
          options={{
            title: screen.title,
            tabBarBadge: screen.name === 'study' && dueWordsCount > 0 ? dueWordsCount : undefined,
            tabBarBadgeStyle: screen.name === 'study' && dueWordsCount > 0 ? badgeStyle : undefined,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? screen.icon.filled : screen.icon.outline}
                size={LAYOUT.BUTTON.ICON_SIZE.XLARGE}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
