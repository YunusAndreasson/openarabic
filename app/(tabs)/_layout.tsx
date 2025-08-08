import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { Tabs, router } from 'expo-router';
import type { JSX } from 'react';
import React, { Fragment, memo, useCallback, useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';

import HeaderProfile from '@/components/HeaderProfile';
import { StreakHistoryBottomSheet } from '@/components/home/StreakHistoryBottomSheet';
import { PracticeDictionaryButton } from '@/components/ui/DictionaryButton';
import { ListenEditModeButton } from '@/components/ui/EditModeButton';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth';
import { useColors, useIsDarkMode } from '@/hooks/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { closeStreakBottomSheet } from '@/store/streakSlice';

const TAB_SCREENS = [
  {
    name: 'read',
    title: STRINGS.READ,
    iconOutline: 'book-outline',
    iconFilled: 'book',
  },
  {
    name: 'listen',
    title: STRINGS.LISTEN,
    iconOutline: 'headset-outline',
    iconFilled: 'headset',
  },
  {
    name: 'practice',
    title: STRINGS.PRACTICE,
    iconOutline: 'school-outline',
    iconFilled: 'school',
  },
] as const;

const BLUR_INTENSITY = 55;

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
  const isStreakBottomSheetVisible = useAppSelector(state => state.streak.isBottomSheetVisible);

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

  if (!session?.user) {
    return <Fragment />;
  }

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerTitleAlign: 'left',
          headerTitleStyle: {
            fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
            fontWeight: LAYOUT.HEADER.TITLE.SECONDARY.fontWeight,
          },
          headerTransparent: true,
          headerBackground: () => <HeaderBackground />,

          // Tab bar styling with blur
          tabBarBackground: () => <TabBarBackground />,
          tabBarActiveTintColor: colors.tint,
          tabBarInactiveTintColor: colors.tabIconDefault,
          tabBarShowLabel: false, // Clean icon-only design with 3 tabs and clear nav titles
          tabBarIconStyle: {
            marginTop: 8, // Standard centering for icons when labels are hidden
          },
          tabBarStyle: Platform.select({
            ios: {
              position: 'absolute',
              borderTopWidth: 0,
              height: LAYOUT.BOTTOM_BAR.HEIGHT, // Standard iOS: 83px
            },
            android: {
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.border,
              height: LAYOUT.BOTTOM_BAR.HEIGHT, // Standard Android: 65px
              ...LAYOUT.ELEVATION.SMALL,
            },
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
                  style={{
                    opacity: focused ? 1 : LAYOUT.OPACITY.HIGH,
                  }}
                />
              ),
              // Header customizations for specific screens
              ...(screen.name === 'read' && {
                headerRight: () => <HeaderProfile />,
              }),
              ...(screen.name === 'listen' && {
                headerRight: () => <ListenEditModeButton />,
              }),
              ...(screen.name === 'practice' && {
                headerRight: () => <PracticeDictionaryButton />,
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
