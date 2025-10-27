import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { JSX } from 'react';
import React, { Fragment, memo, useEffect, useMemo } from 'react';
import type { PressableProps } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { TAB_SCREENS } from '@/constants/tabs';
import { usePressAnimation } from '@/hooks/animations';
import { useAuth } from '@/hooks/auth';
import { useColors } from '@/hooks/theme';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { router } from 'expo-router';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Custom TabBarButton with press animation for better visual feedback
const TabBarButton = memo((props: PressableProps) => {
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

// Static styles for better performance
const styles = StyleSheet.create({
  focusedIcon: {
    opacity: 1,
  },
  unfocusedIcon: {
    opacity: LAYOUT.OPACITY.HIGH,
  },
});

export default function TabLayout(): JSX.Element {
  const { session, isLoading } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Get due words count using the same hook as the practice screen
  const { dueWords } = useFSRSQueries({ userId: session?.user?.id });
  const dueWordsCount = dueWords?.length ?? 0;

  useEffect(() => {
    if (!isLoading && !session?.user) {
      router.replace(ROUTE_PATHS.AUTH);
    }
  }, [session, isLoading]);

  // Tab bar style with padding for proper icon spacing
  const tabBarStyle = useMemo(
    () => ({
      borderTopWidth: 0,
      backgroundColor: colors.elevation0,
      paddingTop: LAYOUT.SPACING.SMALL, // 8px padding above icons
      paddingBottom: insets.bottom, // Safe area only
    }),
    [colors.elevation0, insets.bottom],
  );

  // Badge style for perfect circle - static object, no memoization needed
  const badgeStyle = {
    minWidth: LAYOUT.SPACING.XLARGE, // 24px minimum for circle
    minHeight: LAYOUT.SPACING.XLARGE, // 24px minimum for circle
    borderRadius: LAYOUT.BORDER_RADIUS.PILL, // Perfect circle
    fontSize: 12, // Smaller font for badge
    lineHeight: LAYOUT.SPACING.XLARGE, // Same as height for vertical centering
  };

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
              tabBarBadge: screen.name === 'study' && dueWordsCount > 0 ? dueWordsCount : undefined,
              tabBarBadgeStyle:
                screen.name === 'study' && dueWordsCount > 0 ? badgeStyle : undefined,
              tabBarIcon: ({ focused, color }) => (
                <Ionicons
                  name={screen.iconFilled}
                  size={LAYOUT.BUTTON.ICON_SIZE.XLARGE}
                  color={color}
                  style={focused ? styles.focusedIcon : styles.unfocusedIcon}
                />
              ),
            }}
          />
        ))}
      </Tabs>
    </>
  );
}
