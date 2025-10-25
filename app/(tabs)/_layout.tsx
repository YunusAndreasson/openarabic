import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { JSX } from 'react';
import React, { Fragment, memo, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { TAB_SCREENS } from '@/constants/tabs';
import { useAuth } from '@/hooks/auth';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import type { ThemeColors } from '@/types/ui/theme.types';
import { router } from 'expo-router';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Custom TabBarButton with press animation for better visual feedback
const TabBarButton = memo((props: any) => {
  const { children, onPress, style } = props;
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    type: 'button', // Scale-only feedback (0.96)
  });

  return (
    <AnimatedPressable
      {...props}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
});
TabBarButton.displayName = 'TabBarButton';

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
    colors: ThemeColors;
  }) => {
    const containerStyle = useMemo(
      () => [styles.iconContainer, { width: size, height: size }],
      [size],
    );

    const badgeContainerStyle = useMemo(
      () => [styles.badgeContainer, { backgroundColor: colors.error }],
      [colors.error],
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
  },
);
IconWithBadge.displayName = 'IconWithBadge';

// Static styles for better performance
const styles = StyleSheet.create({
  tabBarIcon: {
    marginTop: LAYOUT.SPACING.HALF_TINY, // Minimal margin for compact tab bar
  },
  focusedIcon: {
    opacity: 1,
  },
  unfocusedIcon: {
    opacity: LAYOUT.OPACITY.HIGH,
  },
  iconContainer: {
    margin: LAYOUT.SPACING.MICRO, // Minimal margin for compact layout
  },
  badgeContainer: {
    position: 'absolute',
    right: -LAYOUT.SPACING.MEDIUM, // -6px to move badge further right
    top: -LAYOUT.SPACING.MICRO, // -2px for compact positioning
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    width: LAYOUT.SPACING.XLARGE,
    height: LAYOUT.SPACING.XLARGE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
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
    [colors.elevation0],
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
          tabBarItemStyle: {
            paddingTop: LAYOUT.SPACING.TINY,
            paddingBottom: LAYOUT.SPACING.HALF_TINY,
          },
          tabBarStyle: tabBarStyle,
          tabBarButton: props => <TabBarButton {...props} />,
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
                  badgeCount={screen.name === 'study' ? dueWordsCount : 0}
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
