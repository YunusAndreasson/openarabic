import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { Tabs, router } from 'expo-router';
import type { JSX } from 'react';
import React, { Fragment, memo, useCallback, useEffect, useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { StreakHistoryBottomSheet } from '@read/StreakHistoryBottomSheet';

import HeaderProfile from '@/components/HeaderProfile';
import DictionaryButton from '@/components/ui/DictionaryButton';
import EditModeButton from '@/components/ui/EditModeButton';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth';
import { useColors, useIsDarkMode } from '@/hooks/theme';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { useAppDispatch, useAppSelectorMemo } from '@/store/hooks';
import { closeStreakBottomSheet } from '@/store/streakSlice';

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
  const dispatch = useAppDispatch();
  const isStreakBottomSheetVisible = useAppSelectorMemo(state => state.streak.isBottomSheetVisible);

  // Get study words data for memory capacity badge
  const { allWords: studyWords } = useFSRSQueries({
    userId: session?.user?.id,
  });

  // Calculate if memory retention is poor (red dot should show)
  const shouldShowMemoryBadge = useMemo(() => {
    if (!studyWords?.length) return false;

    // Calculate current memory retention using the same logic as the gauge
    const wordsWithReviews = studyWords.filter(word => word.fsrs_last_review !== null);
    
    if (wordsWithReviews.length === 0) return false;

    // Calculate average retention based on FSRS state and stability
    let totalRetention = 0;
    let validWords = 0;

    wordsWithReviews.forEach(word => {
      if (word.fsrs_state === 2 && word.fsrs_stability !== null) {
        // Mastered words: retention based on stability
        const retention = Math.min(100, Math.max(0, word.fsrs_stability * 10));
        totalRetention += retention;
        validWords++;
      } else if (word.fsrs_state === 0 || word.fsrs_state === 1 || word.fsrs_state === 3) {
        // Learning words: lower retention
        totalRetention += 30; // Learning words have lower retention
        validWords++;
      }
    });

    if (validWords === 0) return false;

    const averageRetention = totalRetention / validWords;
    
    // Show red dot when retention is below 40% (poor threshold)
    return averageRetention < 40;
  }, [studyWords]);

  useEffect(() => {
    if (!isLoading && !session?.user) {
      router.replace(ROUTE_PATHS.AUTH);
    }
  }, [session, isLoading]);

  // Close streak modal when tab loses focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Cleanup function - close streak modal when leaving tab
        if (isStreakBottomSheetVisible) {
          dispatch(closeStreakBottomSheet());
        }
      };
    }, [dispatch, isStreakBottomSheetVisible])
  );

  const handleCloseStreakBottomSheet = useCallback(() => {
    dispatch(closeStreakBottomSheet());
  }, [dispatch]);

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
              // Add red dot badge for practice tab when memory capacity is low
              ...(screen.name === 'practice' && {
                tabBarBadge: shouldShowMemoryBadge ? '' : undefined,
                tabBarBadgeStyle: {
                  backgroundColor: colors.error,
                  minWidth: 8,
                  height: 8,
                  borderRadius: 4,
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
              ...(screen.name === 'practice' && {
                headerRight: () => <DictionaryButton hideWhenEmpty />,
              }),
            }}
          />
        ))}
      </Tabs>

      {/* Global Streak History Bottom Sheet */}
      <StreakHistoryBottomSheet
        isVisible={isStreakBottomSheetVisible}
        onClose={handleCloseStreakBottomSheet}
      />
    </>
  );
}
