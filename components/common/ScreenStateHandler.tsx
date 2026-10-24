import type { JSX, ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { ThemedView } from '@/components/primitives/ThemedView';
import { LAYOUT } from '@/constants/layout';

interface ScreenStateHandlerProps {
  /** Nothing to show yet. */
  readonly isLoading: boolean;
  /**
   * The load failed with nothing to show. Gate it on having no data, so a
   * failed background refetch keeps the content on screen.
   */
  readonly isError: boolean;
  readonly errorMessage: string;
  readonly onRetry?: () => void;
  readonly isEmpty?: boolean;
  /** What an empty screen shows instead of `children`. */
  readonly empty?: ReactNode;
  readonly children: ReactNode;
}

/**
 * The full-screen error → loading → empty ladder in front of a screen's
 * content, the chain each tab screen used to write out for itself.
 *
 * Error comes first: a failed source is reported even while another is still
 * loading. Every state fills the screen in the same container, with no safe
 * area, so moving from one state to the next does not shift the content.
 * `children` render bare, so a screen whose scroll view must be the top of its
 * tree (the iOS large-title collapse) keeps it there.
 */
export function ScreenStateHandler({
  isLoading,
  isError,
  errorMessage,
  onRetry,
  isEmpty = false,
  empty,
  children,
}: ScreenStateHandlerProps): JSX.Element {
  if (isError) {
    return (
      <ThemedView useSafeArea={false} style={styles.container}>
        <ErrorState message={errorMessage} onRetry={onRetry} />
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView useSafeArea={false} style={styles.container}>
        <LoadingState />
      </ThemedView>
    );
  }

  if (isEmpty) {
    return (
      <ThemedView useSafeArea={false} style={styles.container}>
        {empty}
      </ThemedView>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: LAYOUT.COMMON_STYLES.CONTAINER,
});
