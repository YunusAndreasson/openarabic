import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs, router } from 'expo-router';
import type { JSX } from 'react';
import { Fragment, memo, useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';

import HeaderProfile from '@/components/HeaderProfile';
import EditModeButton from '@/components/ui/EditModeButton';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth';
import { useColors, useIsDarkMode } from '@/hooks/theme';
import { useFSRSQueries } from '@/hooks/vocabulary';
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

const headerBackground = () => <HeaderBackground />;
const tabBarBackground = () => <TabBarBackground />;
const headerProfileComponent = () => <HeaderProfile />;
const listenHeaderRightComponent = () => <EditModeButton type="listen" />;

export default function TabLayout(): JSX.Element {
  const { session, isLoading, user } = useAuth();
  const colors = useColors();

  // Get user preference for app icon badge
  const appIconBadgeEnabled = useAppSelector(state => state.settings.appIconBadgeEnabled);

  // Get due words count for app icon badge (still using red due words for OS-level badge)
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
          fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
          fontWeight: LAYOUT.HEADER.TITLE.SECONDARY.fontWeight,
        },
        headerTransparent: true,
        headerBackground: headerBackground,

        // Tab bar styling with blur
        tabBarBackground: tabBarBackground,
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
                name={focused ? screen.iconFilled : screen.iconOutline}
                size={LAYOUT.BUTTON.ICON_SIZE.XLARGE}
                color={color}
                style={{
                  opacity: focused ? 1 : LAYOUT.OPACITY.HIGH,
                }}
              />
            ),
            // Header customizations for specific screens
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
