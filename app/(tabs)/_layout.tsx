import { Ionicons } from '@/components/ui';
import type { JSX } from 'react';
import { Fragment, useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

import { router, usePathname } from 'expo-router';

import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { PRACTICE_DUE_WORDS_LIMIT } from '@/constants/queries';
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

  // Same capped query the practice screen runs, cache entry included — the limit
  // is part of the query key, so passing nothing here was a second, unbounded
  // fetch of the whole due backlog just to draw a badge. It also made the two
  // disagree in public: the screen said "100+ to review today" under a tab
  // wearing "999+", Material's own overflow for a four-digit count, and that pill
  // is wide enough to cover most of the icon it is attached to.
  const { dueWords } = useFSRSQueries({
    userId: session?.user?.id,
    limit: PRACTICE_DUE_WORDS_LIMIT,
  });
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
      // Without this, the unselected label falls through to the platform default
      // (`Color.android.dynamic.onSurfaceVariant`), which is tuned for Material's
      // own surfaces rather than ours: it painted a blue-grey #C5C6D0 that
      // measured 1.6:1 on the light theme's near-white bar — legible in the dark
      // theme by luck, and effectively invisible in the light and sepia ones. The
      // label now takes the same token as the icon beside it, so a tab is one
      // color rather than two. `selected` is spelled out rather than left to
      // expo-router's fallback to `tintColor`, because in the sepia theme that
      // tint is 3.86:1 on its own bar — see `tabLabelSelected`.
      labelStyle={{
        default: { color: colors.tabIconDefault },
        selected: { color: colors.tabLabelSelected },
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
        <NativeTabs.Trigger key={screen.name} name={screen.name} accessibilityLabel={screen.title}>
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
