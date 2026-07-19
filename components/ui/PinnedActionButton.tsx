import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/ThemedButton';
import { LAYOUT } from '@/constants/layout';

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

  return (
    <View style={[styles.container, { bottom: insets.bottom + LAYOUT.SPACING.SMALL }]}>
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
