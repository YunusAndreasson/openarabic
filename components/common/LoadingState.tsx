import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { PulsatingLoader } from '@/components/ui/PulsatingLoader';
import { LAYOUT } from '@/constants/layout';

interface LoadingStateProps {
  /** Optional message displayed below the loader */
  message?: string;
  /** Loader diameter in pixels. Defaults to 64. */
  size?: number;
}

/**
 * Larger than `PulsatingLoader`'s own 48pt default on purpose: this is the
 * screen-filling state, where 48 reads as lost in the middle of an empty page.
 * Inline loaders inside a section should use `PulsatingLoader` directly.
 */
export const LOADING_STATE_LOADER_SIZE = 64;

/**
 * Generic loading state mirroring EmptyState / ErrorState — a flex-filled,
 * centered container with a PulsatingLoader and an optional message below.
 */
export function LoadingState({ message, size = LOADING_STATE_LOADER_SIZE }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <PulsatingLoader size={size} />
      {message ? (
        <ThemedText align="center" type="body" colorName="secondaryText" style={styles.message}>
          {message}
        </ThemedText>
      ) : null}
    </View>
  );
}

LoadingState.displayName = 'LoadingState';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    marginTop: LAYOUT.SPACING.LARGE,
  },
});
