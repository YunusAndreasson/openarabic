import { Ionicons } from '@/components/ui';
import type { JSX } from 'react';
import { useEffect, useMemo } from 'react';
import { BackHandler, Platform } from 'react-native';

import { router, usePathname } from 'expo-router';

import { NativeTabs } from 'expo-router/native-tabs';

import { ScreenErrorFallback } from '@/components/common';
import { PRACTICE_DUE_WORDS_LIMIT } from '@/constants/queries';
import { ROUTE_PATHS } from '@/constants/routes';
import { TAB_SCREENS } from '@/constants/tabs';
import { useAuth } from '@/hooks/auth';
import { useColors } from '@/hooks/theme';
import { useIsTabBarHidden } from '@/hooks/ui/useTabBarAutoHide';
import { useDueWordsCount } from '@/hooks/vocabulary/useFSRSQueries';
import { formatDueCount } from '@/utils/dueCountText';

// Tab roots that are not the home tab — hardware back returns to Explore from
// these instead of exiting the app (standard Android back pattern). Nested
// screens are untouched: their pathnames don't match, so back pops normally.
const NON_HOME_TAB_ROOT_PATHS = ['/practice', '/playlist', '/account'];

function AndroidTabBackHandler(): null {
  const pathname = usePathname();

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (NON_HOME_TAB_ROOT_PATHS.includes(pathname)) {
        router.navigate(ROUTE_PATHS.EXPLORE_TAB);
        return true;
      }
      return false;
    });
    // jest-expo's BackHandler shim returns undefined even though the native type
    // promises a subscription; keep cleanup tolerant in tests and older shims.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return () => subscription?.remove();
  }, [pathname]);

  return null;
}

export default function TabLayout(): JSX.Element {
  const { session } = useAuth();
  const colors = useColors();
  // Android only — always false on iOS, where `minimizeBehavior` below hands
  // the same job to UIKit. See `useTabBarAutoHide`.
  const isTabBarHidden = useIsTabBarHidden();
  const dueWordsCount = useDueWordsCount({
    userId: session?.user?.id,
    limit: PRACTICE_DUE_WORDS_LIMIT,
  });

  const iconColor = useMemo(
    () => ({
      default: colors.tabIconDefault,
      selected: Platform.OS === 'android' ? colors.onTint : colors.tint,
    }),
    [colors.onTint, colors.tabIconDefault, colors.tint],
  );
  const labelStyle = useMemo(
    () => ({
      default: { color: colors.tabIconDefault },
      selected: { color: colors.tabLabelSelected },
    }),
    [colors.tabIconDefault, colors.tabLabelSelected],
  );

  return (
    <>
      {Platform.OS === 'android' && <AndroidTabBackHandler />}
      <NativeTabs
        // React Activity for the tabs (SDK 58): a tab that loses focus is hidden
        // with its state kept, and its effects clean up until it is shown again,
        // so three covered tabs stop running timers, listeners and refetch
        // subscriptions behind the one in view.
        activityEnabled
        // A tab that throws shows a Refresh state in place of itself while the
        // tab bar and the other tabs keep working.
        unstable_screenErrorBoundary={ScreenErrorFallback}
        tintColor={colors.tint}
        // Scrolled-away tab bar. Two mechanisms for one behaviour, because only
        // iOS has a native one:
        //   iOS 26+ — UIKit watches the screen's primary scroll view and
        //     minimizes the bar to a pill on the way down. Re-introduced
        //     deliberately: this prop was removed once alongside `blurEffect`
        //     and `disableTransparentOnScrollEdge` when one of the three was
        //     killing the top nav bar's large-title collapse. The other two set
        //     `scrollEdgeAppearance` and are the far likelier culprits, so only
        //     this one comes back — verify the large title still collapses on
        //     the next iOS build before assuming it is innocent.
        //   Android — no equivalent exists, so `hidden` is driven from JS by
        //     the scroll-direction hook the tab roots spread onto their lists.
        minimizeBehavior={Platform.OS === 'ios' ? 'onScrollDown' : undefined}
        hidden={isTabBarHidden}
        badgeBackgroundColor={colors.error}
        // iOS has NO API for badge text color — UIKit always paints system white
        // on whatever background you set. badgeTextColor is Android/Web only
        // (verified in react-native-screens TabsScreen.ios.types.d.ts: only
        // tabBarItemBadgeBackgroundColor is exposed). Gate explicitly so the
        // limitation is obvious in code.
        badgeTextColor={Platform.OS === 'android' ? colors.white : undefined}
        iconColor={iconColor}
        // Without this, the unselected label falls through to the platform default
        // (`Color.android.dynamic.onSurfaceVariant`), which is tuned for Material's
        // own surfaces rather than ours: it painted a blue-grey #C5C6D0 that
        // measured 1.6:1 on the light theme's near-white bar — legible in the dark
        // theme by luck, and effectively invisible in the light and sepia ones. The
        // label now takes the same token as the icon beside it, so a tab is one
        // color rather than two. `selected` is spelled out rather than left to
        // expo-router's fallback to `tintColor`, because in the sepia theme that
        // tint is 3.86:1 on its own bar — see `tabLabelSelected`.
        labelStyle={labelStyle}
        // Material hides the labels of unselected tabs by default, which left
        // three of the four destinations as a bare compass, headphones and
        // graduation cap. With four tabs there is room for every name, and a
        // name is what tells a new learner that the cap is where practice lives.
        labelVisibilityMode="labeled"
        // `blurEffect` and `disableTransparentOnScrollEdge` stay unset on iOS:
        // both write `scrollEdgeAppearance`, which is what killed the top nav
        // bar's large-title collapse and scroll-edge fade when the three iOS
        // props were set together. Leaving them at their iOS defaults is what
        // makes Mail / Photos behave correctly, so we do the same.
        // Android-only: explicit background because there's no system blur to
        // fall back on (otherwise the bar reads as bright white in dark mode).
        backgroundColor={Platform.OS === 'android' ? colors.elevation1 : undefined}
        // Android Material 3 expressive theming (no-op on iOS)
        indicatorColor={colors.tint}
        rippleColor={colors.navigationRipple}
      >
        {TAB_SCREENS.map(screen => (
          <NativeTabs.Trigger
            key={screen.name}
            name={screen.name}
            accessibilityLabel={screen.title}
          >
            {/* These three must be *direct* children and the exact element
                types expo-router exports: NativeTabTrigger reads its own
                `props.children` and keeps only elements whose `type ===`
                NativeTabsTriggerIcon / Label / Badge (identity check in
                `filterAllowedChildrenElements`). It never renders them, so a
                wrapper component — even one that returns the right element —
                is silently dropped and the tab loses its icon entirely. */}
            <NativeTabs.Trigger.Icon
              sf={screen.icon.sf}
              // Hoisting or memoising this buys nothing: the VectorIcon elements
              // inside are new on every render either way, the tab bar renders once
              // rather than per row, and restructuring risks the identity check
              // described above.
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              src={{
                default: (
                  <NativeTabs.Trigger.VectorIcon family={Ionicons} name={screen.icon.ion.default} />
                ),
                selected: (
                  <NativeTabs.Trigger.VectorIcon
                    family={Ionicons}
                    name={screen.icon.ion.selected}
                  />
                ),
              }}
            />
            <NativeTabs.Trigger.Label>{screen.title}</NativeTabs.Trigger.Label>
            {/* Spelled by the same function as the practice screen's lead card,
                so the number a learner follows into the tab is the number they
                find there — including the "+" once the due query clips. */}
            {screen.name === 'practice' && dueWordsCount > 0 && (
              <NativeTabs.Trigger.Badge>{formatDueCount(dueWordsCount)}</NativeTabs.Trigger.Badge>
            )}
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    </>
  );
}
