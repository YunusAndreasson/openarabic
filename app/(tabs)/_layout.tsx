import { Ionicons } from '@/components/ui';
import type { JSX } from 'react';
import { Fragment, useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

import { router, usePathname } from 'expo-router';

import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { ROUTE_PATHS } from '@/constants/routes';
import { TAB_SCREENS } from '@/constants/tabs';
import { useAuth } from '@/hooks/auth';
import { useColors } from '@/hooks/theme';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

// Tab roots that are not the home tab — hardware back returns to Explore from
// these instead of exiting the app (standard Android back pattern). Nested
// screens are untouched: their pathnames don't match, so back pops normally.
const NON_HOME_TAB_ROOT_PATHS = ['/practice', '/playlist'];

export default function TabLayout(): JSX.Element {
  const { session } = useAuth();
  const colors = useColors();
  const pathname = usePathname();

  // Get due words count using the same hook as the practice screen
  const { dueWords } = useFSRSQueries({ userId: session?.user?.id });
  const dueWordsCount = dueWords?.length ?? 0;

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (NON_HOME_TAB_ROOT_PATHS.includes(pathname)) {
        router.navigate(ROUTE_PATHS.EXPLORE_TAB);
        return true;
      }
      return false; // Home tab root or nested screen — let the system handle it
    });
    // Optional call: jest-expo's BackHandler shim returns undefined
    return () => subscription?.remove();
  }, [pathname]);

  // Auth gating is handled by <Stack.Protected guard={isAuthenticated}> in the
  // root layout — this subtree only mounts when authenticated, so no imperative
  // redirect is needed here. See [[project-auth-flow-stack-protected]].
  if (!colors) {
    return <Fragment />;
  }

  return (
    <NativeTabs
      tintColor={colors.tint}
      badgeBackgroundColor={colors.error}
      // iOS has NO API for badge text color — UIKit always paints system white
      // on whatever background you set. badgeTextColor is Android/Web only
      // (verified in react-native-screens TabsScreen.ios.types.d.ts: only
      // tabBarItemBadgeBackgroundColor is exposed). Gate explicitly so the
      // limitation is obvious in code.
      badgeTextColor={Platform.OS === 'android' ? colors.white : undefined}
      iconColor={{
        default: colors.tabIconDefault,
        // Android draws an indicator pill (colors.tint) behind the selected
        // icon, so the icon needs the contrast color. iOS has no pill — the
        // icon itself carries the tint.
        selected: Platform.OS === 'android' ? colors.onTint : colors.tint,
      }}
      // iOS NativeTabs intentionally minimal — matching edenmind's reference
      // impl. Three iOS-only props (minimizeBehavior, blurEffect,
      // disableTransparentOnScrollEdge) were previously set; they hook into the
      // same scroll observers UIKit uses for the top nav bar's large-title
      // collapse + scroll-edge fade, and at least one of them was silently
      // killing both. Leaving them at their iOS defaults is what makes Mail /
      // Photos behave correctly, so we do the same.
      // Android-only: explicit background because there's no system blur to
      // fall back on (otherwise the bar reads as bright white in dark mode).
      backgroundColor={Platform.OS === 'android' ? colors.elevation1 : undefined}
      // Android Material 3 expressive theming (no-op on iOS)
      indicatorColor={colors.tint}
      rippleColor={colors.navigationRipple}
    >
      {TAB_SCREENS.map(screen => (
        <NativeTabs.Trigger key={screen.name} name={screen.name}>
          <NativeTabs.Trigger.Icon
            sf={screen.icon.sf}
            src={{
              default: (
                <NativeTabs.Trigger.VectorIcon family={Ionicons} name={screen.icon.ion.default} />
              ),
              selected: (
                <NativeTabs.Trigger.VectorIcon family={Ionicons} name={screen.icon.ion.selected} />
              ),
            }}
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
