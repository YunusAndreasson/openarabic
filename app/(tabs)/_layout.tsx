import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs, router } from 'expo-router';
import type { JSX } from 'react';
import React, { Fragment, memo, useCallback, useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { HeaderProfile } from '@/components/HeaderProfile';
import { ThemedText } from '@/components/ThemedText';
import EditModeButton from '@/components/ui/EditModeButton';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth';
import { useColors, useIsDarkMode } from '@/hooks/theme';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { selectionFeedback } from '@/utils/haptics';

// Custom IconWithBadge component for better badge positioning and consistent shape
const IconWithBadge = memo(
  ({
    name,
    badgeCount,
    color,
    size,
    focused,
    colors,
  }: {
    name: 'book' | 'headset' | 'school';
    badgeCount: number;
    color: string;
    size: number;
    focused: boolean;
    colors: any;
  }) => {
    return (
      <View style={{ width: size, height: size, margin: 5 }}>
        <Ionicons
          name={name}
          size={size}
          color={color}
          style={focused ? styles.focusedIcon : styles.unfocusedIcon}
        />
        {badgeCount > 0 && (
          <View
            style={{
              position: 'absolute',
              right: -6,
              top: -3,
              backgroundColor: colors.error,
              borderRadius: 12,
              width: 24,
              height: 24,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
            }}
          >
            <Text
              style={{
                color: colors.background,
                fontSize: 13,
                fontWeight: 'bold',
                textAlign: 'center',
              }}
            >
              {badgeCount > 99 ? '99+' : badgeCount}
            </Text>
          </View>
        )}
      </View>
    );
  }
);
IconWithBadge.displayName = 'IconWithBadge';

interface DictionaryButtonProps {
  hideWhenEmpty?: boolean;
  itemCount?: number;
}

const DictionaryButton = memo((props: DictionaryButtonProps): JSX.Element | null => {
  const { hideWhenEmpty, itemCount } = props;
  const colors = useColors();
  const { session } = useAuth();

  // Get study words count to determine if button should be shown
  const { allWords, dueWords } = useFSRSQueries({ userId: session?.user?.id });
  const studyWordsCount = (allWords?.length ?? 0) + (dueWords?.length ?? 0);
  const effectiveCount = itemCount ?? studyWordsCount;

  const handlePress = useCallback((): void => {
    selectionFeedback();
    router.push(ROUTE_PATHS.PRACTICE_DICTIONARY);
  }, []);

  // Hide button when hideWhenEmpty is true and there are no study words
  if (hideWhenEmpty && (effectiveCount ?? 0) <= 0) {
    return null;
  }

  return (
    <Pressable
      style={[
        dictionaryButtonStyles.button,
        {
          backgroundColor: colors.transparent,
        },
      ]}
      hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
      onPress={handlePress}
      android_ripple={{ color: colors.navigationRipple, radius: MIN_TOUCH_TARGET.MEDIUM / 2 }}
    >
      <ThemedText
        type="body"
        weight="semibold"
        style={[
          dictionaryButtonStyles.buttonText,
          {
            color: colors.tint,
          },
        ]}
        numberOfLines={1}
      >
        {STRINGS.DICTIONARY}
      </ThemedText>
    </Pressable>
  );
});

DictionaryButton.displayName = 'DictionaryButton';

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

const dictionaryButtonStyles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET.MEDIUM,
    minWidth: 70,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  buttonText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.TIGHT,
  },
});

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

  // Safety check: don't render until we have colors (Redux store is ready)
  if (!colors) {
    return <Fragment />;
  }

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
                <IconWithBadge
                  name={screen.iconFilled}
                  badgeCount={screen.name === 'practice' ? dueWordsCount : 0}
                  color={color}
                  size={LAYOUT.BUTTON.ICON_SIZE.XLARGE}
                  focused={focused}
                  colors={colors}
                />
              ),
              // Badge is now handled by the custom IconWithBadge component
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
              // Dictionary button for practice tab
            }}
          />
        ))}
      </Tabs>
    </>
  );
}
