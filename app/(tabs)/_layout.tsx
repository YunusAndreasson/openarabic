import type { JSX } from 'react';
import { Fragment } from 'react';
import { Platform } from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { TAB_SCREENS } from '@/constants/tabs';
import { useAuth } from '@/hooks/auth';
import { useColors } from '@/hooks/theme';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

export default function TabLayout(): JSX.Element {
  const { session } = useAuth();
  const colors = useColors();

  // Get due words count using the same hook as the practice screen
  const { dueWords } = useFSRSQueries({ userId: session?.user?.id });
  const dueWordsCount = dueWords?.length ?? 0;

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
      // iOS 26: tab bar shrinks like Safari when scrolling down. No-op on older iOS / Android.
      minimizeBehavior={Platform.OS === 'ios' ? 'onScrollDown' : undefined}
      // Pre-iOS-26 parity for the liquid-glass tab bar. iOS 26+ uses its own
      // glass material and ignores this; older iOS gets a frosted chrome.
      blurEffect={Platform.OS === 'ios' ? 'systemChromeMaterial' : undefined}
      // Prevents the iOS 18 and earlier "blur disappears at scroll edge"
      // artifact when FlashList content reaches the bottom — the docs cite
      // this prop specifically as the fix for FlatList/FlashList integration.
      // No-op on iOS 26+ (handled by liquid glass) and Android.
      disableTransparentOnScrollEdge={Platform.OS === 'ios'}
      // Android has no system blur, so the bar otherwise defaults to white in
      // dark mode. Match the theme surface explicitly.
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
