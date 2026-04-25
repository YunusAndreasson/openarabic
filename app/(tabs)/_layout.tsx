import type { JSX } from 'react';
import { Fragment, useEffect } from 'react';
import { Platform } from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { ROUTE_PATHS } from '@/constants/routes';
import { TAB_SCREENS } from '@/constants/tabs';
import { useAuth } from '@/hooks/auth';
import { useColors } from '@/hooks/theme';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

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

  if (!colors || !session?.user) {
    return <Fragment />;
  }

  return (
    <NativeTabs
      tintColor={colors.tint}
      badgeBackgroundColor={colors.error}
      iconColor={{
        default: colors.tabIconDefault,
        selected: colors.tint,
      }}
      // iOS 26: tab bar shrinks like Safari when scrolling down. No-op on older iOS / Android.
      minimizeBehavior={Platform.OS === 'ios' ? 'onScrollDown' : undefined}
      // Android Material 3 expressive theming (no-op on iOS)
      indicatorColor={colors.tint}
      rippleColor={colors.navigationRipple}
    >
      {TAB_SCREENS.map(screen => (
        <NativeTabs.Trigger key={screen.name} name={screen.name}>
          <NativeTabs.Trigger.Icon
            sf={screen.icon.sf}
            src={
              <NativeTabs.Trigger.VectorIcon
                family={Ionicons}
                name={screen.icon.ion.selected}
              />
            }
          />
          <NativeTabs.Trigger.Label>{screen.title}</NativeTabs.Trigger.Label>
          {screen.name === 'practice' && dueWordsCount > 0 && (
            <NativeTabs.Trigger.Badge>{String(dueWordsCount)}</NativeTabs.Trigger.Badge>
          )}
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
