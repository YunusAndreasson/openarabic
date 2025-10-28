import { useCallback } from 'react';

import { useSyncedState } from './useSyncedState';

/**
 * Hook for managing optimistic UI updates for toggle operations
 * Immediately updates UI state, then reverts if the async operation fails
 *
 * @param actualValue - The true/current value from server/state
 * @param onToggle - Async function to call when toggling (should handle actual mutation)
 * @returns Object with optimistic value and toggle handler
 *
 * @example
 * ```typescript
 * const { value: optimisticIsBookmarked, toggle } = useOptimisticToggle(
 *   isInReadingList,
 *   async () => {
 *     await bookmarkService.toggle(articleId);
 *   }
 * );
 *
 * <Button onPress={toggle}>
 *   {optimisticIsBookmarked ? 'Bookmarked' : 'Bookmark'}
 * </Button>
 * ```
 */
export function useOptimisticToggle(
  actualValue: boolean,
  onToggle: () => Promise<void>,
): {
  value: boolean;
  toggle: () => Promise<void>;
} {
  const [optimisticValue, setOptimisticValue] = useSyncedState(actualValue);

  /**
   * Toggle handler with optimistic update and error rollback
   * Updates UI immediately, then calls async operation
   * Reverts to previous state if operation fails
   */
  const toggle = useCallback(async () => {
    // Optimistic update - immediately show the new state
    const newState = !optimisticValue;
    setOptimisticValue(newState);

    try {
      await onToggle();
      // Success - the optimistic state should match the actual state now
      // The actual value will be updated externally and synced via useEffect
    } catch {
      // Revert optimistic update on error
      setOptimisticValue(optimisticValue);
      // Error handling completed silently (onToggle should handle error toasts/logging)
    }
  }, [onToggle, optimisticValue, setOptimisticValue]);

  return {
    value: optimisticValue,
    toggle,
  };
}
