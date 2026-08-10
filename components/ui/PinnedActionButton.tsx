import type { JSX } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/ThemedButton';
import { LAYOUT } from '@/constants/layout';
import { useShouldShowMiniPlayer } from '@/hooks/audio/useShouldShowMiniPlayer';

interface PinnedActionButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
}

/**
 * Full-width primary CTA pinned above the tab bar — the single, reachable
 * action-button pattern shared by tab screens (practice review, playlist
 * play-all). Screens showing it add bottom content padding of
 * LAYOUT.BUTTON.HEIGHT.LARGE + LAYOUT.SPACING.XLARGE so list content
 * never hides behind it.
 */
export function PinnedActionButton({
  title,
  onPress,
  loading,
}: PinnedActionButtonProps): JSX.Element {
  const insets = useSafeAreaInsets();
  const shouldShowMiniPlayer = useShouldShowMiniPlayer();
  const miniPlayerClearance = shouldShowMiniPlayer
    ? LAYOUT.CARD.HEIGHT.MINI_PLAYER + LAYOUT.SPACING.SMALL
    : 0;

  // This button lives INSIDE a NativeTabs screen, whose content area already
  // ends flush above the native tab bar — the tab bar is separate native
  // chrome, not part of this view's own layout. On Android, `insets.bottom`
  // still reports the raw gesture-nav inset even here (confirmed on-device:
  // 24dp), even though that strip sits below chrome this view never reaches,
  // so adding it double-counts clearance the tab bar already owns and leaves
  // a large dead gap above it (measured ~32dp / ~84px on a 2.625x-density
  // device). iOS's UITabBarController-hosted content reads correctly with
  // the unmodified formula, so only Android needs the exclusion.
  const bottomInsetClearance = Platform.OS === 'android' ? 0 : insets.bottom;

  return (
    <View
      style={[
        styles.container,
        { bottom: bottomInsetClearance + LAYOUT.SPACING.SMALL + miniPlayerClearance },
      ]}
    >
      <ThemedButton
        title={title}
        onPress={onPress}
        variant="filled"
        size="large"
        loading={loading}
        style={styles.capsule}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    right: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    zIndex: LAYOUT.Z_INDEX.CARD,
  },
  // Capsule shape — the iOS 26 / M3 Expressive standard for a standalone
  // prominent CTA; scoped here so regular buttons keep the app radius
  capsule: {
    borderRadius: LAYOUT.BORDER_RADIUS.PILL,
  },
});
