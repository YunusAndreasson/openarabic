import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import type { JSX } from 'react';
import React, { Fragment, memo, useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { useAuth } from '@/hooks/auth';
import { useColors } from '@/hooks/theme';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { AppTab, UiAction } from '@/types/enums';

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
    name: 'book' | 'bookmark' | 'school';
    badgeCount: number;
    color: string;
    size: number;
    focused: boolean;
    colors: any;
  }) => {
    const containerStyle = useMemo(
      () => [styles.iconContainer, { width: size, height: size }],
      [size]
    );

    const badgeContainerStyle = useMemo(
      () => [styles.badgeContainer, { backgroundColor: colors.error }],
      [colors.error]
    );

    return (
      <View style={containerStyle}>
        <Ionicons
          name={name}
          size={size}
          color={color}
          style={focused ? styles.focusedIcon : styles.unfocusedIcon}
        />
        {badgeCount > 0 && (
          <View style={badgeContainerStyle}>
            <ThemedText colorName="white" weight="bold" type="caption">
              {badgeCount > 99 ? '99+' : badgeCount}
            </ThemedText>
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
        {UiAction.DICTIONARY}
      </ThemedText>
    </Pressable>
  );
});

DictionaryButton.displayName = 'DictionaryButton';

export { DictionaryButton };

const TAB_SCREENS = [
  {
    name: 'read',
    title: AppTab.READ,
    iconFilled: 'book',
  },
  {
    name: 'listen',
    title: AppTab.LISTEN,
    iconFilled: 'bookmark',
  },
  {
    name: 'practice',
    title: AppTab.PRACTICE,
    iconFilled: 'school',
  },
] as const;

// Static styles for better performance
const styles = StyleSheet.create({
  tabBarIcon: {
    marginTop: 8, // Move icons down to center them better
  },
  focusedIcon: {
    opacity: 1,
  },
  unfocusedIcon: {
    opacity: LAYOUT.OPACITY.HIGH,
  },
  iconContainer: {
    margin: LAYOUT.SPACING.TINY,
  },
  badgeContainer: {
    position: 'absolute',
    right: -LAYOUT.SPACING.TINY - 2, // -6px for proper positioning
    top: -LAYOUT.SPACING.TINY + 1, // -3px for proper positioning
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    width: LAYOUT.COMPONENT.BADGE.SIZE,
    height: LAYOUT.COMPONENT.BADGE.SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});

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

  // Unified tab bar style for both platforms with native background
  const tabBarStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      borderTopWidth: 0,
      height: LAYOUT.BOTTOM_BAR.HEIGHT,
      backgroundColor: colors.elevation0,
      paddingTop: 0,
      paddingBottom: 0,
    }),
    [colors.elevation0]
  );

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
          headerShown: false,
          tabBarActiveTintColor: colors.tint,
          tabBarInactiveTintColor: colors.tabIconDefault,
          tabBarShowLabel: false,
          tabBarIconStyle: styles.tabBarIcon,
          tabBarItemStyle: { paddingTop: 4, paddingBottom: 4 },
          tabBarStyle: tabBarStyle,
          freezeOnBlur: false, // Keep screens in memory to prevent black screens
          animation: 'none', // Disable animations to prevent black screens completely
          lazy: true, // Pre-load all screens
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
            }}
          />
        ))}
      </Tabs>
    </>
  );
}
