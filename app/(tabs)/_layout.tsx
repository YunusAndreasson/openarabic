import type { JSX } from 'react';
import { Fragment, useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { Tabs, router } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { ROUTE_PATHS } from '@/constants/routes';
import { TAB_SCREENS } from '@/constants/tabs';
import { useAuth } from '@/hooks/auth';
import { useColors } from '@/hooks/theme';
import { useBlurProps } from '@/hooks/ui/useBlurProps';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

export default function TabLayout(): JSX.Element {
  const { session, isLoading } = useAuth();
  const colors = useColors();
  const blurProps = useBlurProps('tabBar');

  // Get due words count using the same hook as the practice screen
  const { dueWords } = useFSRSQueries({ userId: session?.user?.id });
  const dueWordsCount = dueWords?.length ?? 0;

  useEffect(() => {
    if (!isLoading && !session?.user) {
      router.replace(ROUTE_PATHS.AUTH);
    }
  }, [session, isLoading]);

  if (!colors || !session?.user) {
    return <Fragment />;
  }

  // Use NativeTabs on iOS for native tab bar with liquid glass effect
  if (Platform.OS === 'ios') {
    return (
      <NativeTabs
        tintColor={colors.tint}
        badgeBackgroundColor={colors.error}
        iconColor={{
          default: colors.tabIconDefault,
          selected: colors.tint,
        }}
      >
        {TAB_SCREENS.map(screen => (
          <NativeTabs.Trigger key={screen.name} name={screen.name}>
            <NativeTabs.Trigger.Icon sf={screen.icon.sf} />
            <NativeTabs.Trigger.Label>{screen.title}</NativeTabs.Trigger.Label>
            {screen.name === 'practice' && dueWordsCount > 0 && (
              <NativeTabs.Trigger.Badge>{String(dueWordsCount)}</NativeTabs.Trigger.Badge>
            )}
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    );
  }

  // Android: Use regular JavaScript tabs with blur background
  return (
    <Tabs
      screenOptions={{
        animation: 'fade', // Smooth cross-fade transition between tabs
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopColor: colors.border,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={blurProps.intensity}
            tint={blurProps.tint}
            blurMethod="dimezisBlurViewSdk31Plus"
            style={styles.tabBarBlur}
          />
        ),
        headerShown: false, // Headers are handled by nested Stack navigators
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
                name={
                  (focused
                    ? screen.icon.filled
                    : screen.icon.outline) as keyof typeof Ionicons.glyphMap
                }
                size={24}
                color={color}
              />
            ),
            tabBarBadge:
              screen.name === 'practice' && dueWordsCount > 0 ? dueWordsCount : undefined,
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBlur: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});
