import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

/**
 * Base hook for managing internal state that syncs with an external value
 *
 * This hook provides a reusable pattern for maintaining local state that
 * automatically synchronizes when the external source of truth changes.
 *
 * Use cases:
 * - Optimistic UI updates (update immediately, sync with actual state later)
 * - Controlled/uncontrolled component patterns
 * - Local state that needs to reset when external value changes
 *
 * @param externalValue - The source of truth value (from props, Redux, API, etc.)
 * @returns [internalValue, setInternalValue] - Tuple of synced value and setter
 *
 * @example
 * ```tsx
 * // Optimistic toggle example
 * const [localValue, setLocalValue] = useSyncedState(actualValue);
 *
 * const handleToggle = async () => {
 *   setLocalValue(!localValue); // Immediate update
 *   await updateServer(!localValue); // Async operation
 *   // External value will eventually change and sync via useEffect
 * };
 * ```
 */
export function useSyncedState<T>(externalValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [internalValue, setInternalValue] = useState<T>(externalValue);

  // Sync internal state with external value when it changes
  // This ensures the display value is correct when the component mounts
  // or when the external value changes from an external source
  useEffect(() => {
    setInternalValue(externalValue);
  }, [externalValue]);

  return [internalValue, setInternalValue];
}
