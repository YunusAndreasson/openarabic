import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { PulsatingLoader } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';

interface LoadingStateProps {
  /** Optional message displayed below the loader */
  message?: string;
  /** Loader diameter in pixels. Defaults to 64. */
  size?: number;
}

const DEFAULT_LOADER_SIZE = 64;

/**
 * Generic loading state mirroring EmptyState / ErrorState — a flex-filled,
 * centered container with a PulsatingLoader and an optional message below.
 */
export function LoadingState({ message, size = DEFAULT_LOADER_SIZE }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <PulsatingLoader size={size} />
      {message ? (
        <ThemedText align="center" type="body" variant="secondary" style={styles.message}>
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
