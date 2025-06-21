import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs, router } from 'expo-router';
import type { JSX } from 'react';
import { Fragment, memo, useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';

import HeaderProfile from '@/components/HeaderProfile';
import EditModeButton from '@/components/listen/EditModeButton';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { updateAppIconBadge } from '@/services/notificationService';
import { useAppSelector } from '@/store/hooks';

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
    iconOutline: 'trending-up-outline',
    iconFilled: 'trending-up',
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

const headerBackground = () => <HeaderBackground />;
const tabBarBackground = () => <TabBarBackground />;
const headerProfileComponent = () => <HeaderProfile />;
const listenHeaderRightComponent = () => <EditModeButton />;

export default function TabLayout(): JSX.Element {
  const { session, isLoading, user } = useAuth();
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Get user preference for app icon badge
  const appIconBadgeEnabled = useAppSelector(state => state.settings.appIconBadgeEnabled);

  // Get due words count for badge
  const { dueWords } = useFSRSQueries({
    userId: user?.id,
  });

  const dueWordsCount = dueWords?.length ?? 0;

  // Update app icon badge whenever due words count changes (only if enabled)
  useEffect(() => {
    if (appIconBadgeEnabled) {
      updateAppIconBadge(dueWordsCount);
    } else {
      updateAppIconBadge(0); // Clear badge if disabled
    }
  }, [dueWordsCount, appIconBadgeEnabled]);

  // Clear badge when user signs out
  useEffect(() => {
    if (!session?.user) {
      updateAppIconBadge(0);
    }
  }, [session?.user]);

  useEffect(() => {
    if (!isLoading && !session?.user) {
      router.replace(ROUTE_PATHS.AUTH);
    }
  }, [session, isLoading]);

  if (!session?.user) {
    return <Fragment />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'left',
        headerTitleStyle: {
          fontSize: LAYOUT.HEADER.TITLE.MAIN.fontSize,
          fontWeight: LAYOUT.HEADER.TITLE.MAIN.fontWeight,
        },
        headerTransparent: true,
        headerBackground: headerBackground,

        // Tab bar styling with blur
        tabBarBackground: tabBarBackground,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            borderTopWidth: 0,
          },
          android: {
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
            elevation: 8,
          },
        }),
        tabBarLabelStyle: {
          fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
          fontWeight: Platform.OS === 'ios' ? '500' : '400',
        },

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
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? screen.iconFilled : screen.iconOutline}
                size={size}
                color={color}
                style={{
                  opacity: focused ? 1 : 0.7,
                  textShadowColor: isDarkMode ? colors.textShadowLight : colors.textShadowDark,
                  textShadowOffset: { width: 0, height: 0.5 },
                  textShadowRadius: 1,
                }}
              />
            ),
            // Add badge to Practice tab (always show in-app badge)
            ...(screen.name === 'practice' &&
              dueWordsCount > 0 && {
                tabBarBadge: dueWordsCount > 99 ? '99+' : dueWordsCount.toString(),
                tabBarBadgeStyle: {
                  backgroundColor: colors.error,
                  color: colors.white,
                  fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
                  fontWeight: '600',
                  // Use responsive dimensions based on spacing scale
                  minWidth: LAYOUT.SPACING.XLARGE, // 20px
                  minHeight: LAYOUT.SPACING.XLARGE, // 20px
                  borderRadius: LAYOUT.SPACING.MEDIUM, // 12px for rounded appearance
                  // Remove negative margins for safer positioning across devices
                },
              }),
            ...(screen.name === 'read' && {
              headerRight: headerProfileComponent,
            }),
            ...(screen.name === 'listen' && {
              headerRight: listenHeaderRightComponent,
            }),
          }}
        />
      ))}
    </Tabs>
  );
}
