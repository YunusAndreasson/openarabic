import type { JSX } from 'react';
import { Fragment, useEffect } from 'react';
import { Platform } from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { GlobalMiniPlayer } from '@/components/audio';
import { ROUTE_PATHS } from '@/constants/routes';
import { TAB_SCREENS } from '@/constants/tabs';
import { useAuth } from '@/hooks/auth';
import { useShouldShowMiniPlayer } from '@/hooks/audio/useShouldShowMiniPlayer';
import { useColors } from '@/hooks/theme';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

// iOS 26+ supports `NativeTabs.BottomAccessory` and the liquid-glass tab bar that
// integrates with the accessory's minimize-on-scroll behavior. Use it as the home
// for the MiniPlayer there; older iOS / Android keep the floating overlay.
const HAS_BOTTOM_ACCESSORY = isLiquidGlassAvailable();

export default function TabLayout(): JSX.Element {
  const { session, isLoading } = useAuth();
  const colors = useColors();
  const showMiniPlayer = useShouldShowMiniPlayer();

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
                <NativeTabs.Trigger.VectorIcon
                  family={Ionicons}
                  name={screen.icon.ion.default}
                />
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
          {screen.name === 'practice' && dueWordsCount > 0 && (
            <NativeTabs.Trigger.Badge>{String(dueWordsCount)}</NativeTabs.Trigger.Badge>
          )}
        </NativeTabs.Trigger>
      ))}
      {HAS_BOTTOM_ACCESSORY && showMiniPlayer && (
        <NativeTabs.BottomAccessory>
          <GlobalMiniPlayer embedded />
        </NativeTabs.BottomAccessory>
      )}
    </NativeTabs>
  );
}
