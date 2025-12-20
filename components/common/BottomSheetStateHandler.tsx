import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

export interface BottomSheetStateHandlerProps {
  /**
   * Whether data is currently loading
   */
  isLoading?: boolean;

  /**
   * Whether an error occurred
   */
  isError?: boolean;

  /**
   * Whether data is empty (no content to show)
   */
  isEmpty?: boolean;

  /**
   * Custom loading message (defaults to STRINGS.LOADING)
   */
  loadingMessage?: string;

  /**
   * Custom error message (defaults to STRINGS.ERROR_LOADING_DATA)
   */
  errorMessage?: string;

  /**
   * Custom empty state message
   */
  emptyMessage?: string;

  /**
   * Content to render when data is successfully loaded
   */
  children: ReactNode;
}

/**
 * Handles loading, error, and empty states for bottom sheet content
 *
 * Provides consistent styling and messaging across all bottom sheets:
 * - Loading state with centered message
 * - Error state with error-colored message
 * - Empty state with tertiary text
 * - Success state with custom content
 *
 * @example
 * ```tsx
 * <BottomSheetStateHandler
 *   isLoading={isLoading}
 *   isError={isError}
 *   isEmpty={!data}
 *   emptyMessage="No streak data available"
 * >
 *   <StreakMetrics data={data} />
 * </BottomSheetStateHandler>
 * ```
 */
export function BottomSheetStateHandler({
  isLoading = false,
  isError = false,
  isEmpty = false,
  loadingMessage = 'Loading...',
  errorMessage = STRINGS.ERROR_LOADING_DATA,
  emptyMessage,
  children,
}: BottomSheetStateHandlerProps): ReactNode {
  // Loading state
  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <ThemedText type="body" colorName="text">
          {loadingMessage}
        </ThemedText>
      </View>
    );
  }

  // Error state
  if (isError) {
    return (
      <View style={styles.stateContainer}>
        <ThemedText type="body" colorName="error">
          {errorMessage}
        </ThemedText>
      </View>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <View style={styles.stateContainer}>
        <ThemedText type="body" colorName="textTertiary">
          {emptyMessage}
        </ThemedText>
      </View>
    );
  }

  // Success state - render children
  return <>{children}</>;
}

const styles = StyleSheet.create({
  stateContainer: {
    paddingVertical: LAYOUT.SPACING.XLARGE,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
});
