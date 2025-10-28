import { useSyncedState } from './useSyncedState';

/**
 * Hook for managing optimistic UI updates
 *
 * Provides immediate visual feedback by updating local state optimistically,
 * while syncing with the actual source of truth when it changes.
 *
 * @param actualValue - The source of truth value (from Redux, API, etc.)
 * @param supportsOptimistic - Whether optimistic updates are enabled
 * @returns [displayValue, setOptimisticValue] - Tuple of display value and setter
 *
 * @example
 * ```tsx
 * const currentValue = useAppSelector(state => state.settings.theme);
 * const [displayValue, setOptimisticValue] = useOptimisticState(
 *   currentValue,
 *   true
 * );
 *
 * const handleSelect = (newValue) => {
 *   setOptimisticValue(newValue); // Immediate visual feedback
 *   dispatch(updateTheme(newValue)); // Actual update
 * };
 * ```
 */
export function useOptimisticState<T>(
  actualValue: T,
  supportsOptimistic: boolean = false,
): [T, (value: T) => void] {
  const [optimisticValue, setOptimisticValue] = useSyncedState<T>(actualValue);

  // Return optimistic value if enabled, otherwise actual value
  const displayValue = supportsOptimistic ? optimisticValue : actualValue;

  return [displayValue, setOptimisticValue];
}
