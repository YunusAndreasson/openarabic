import { useMemo } from 'react';
import type { TypedUseSelectorHook } from 'react-redux';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';

import type { AppDispatch, RootState } from '@/store/store';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();

// Create a more selective version of useAppSelector that memoizes the selector function
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/**
 * Custom hook for selecting specific parts of the state with shallow equality checking.
 *
 * This hook uses `shallowEqual` by default to compare selected values, which prevents
 * re-renders when the selected object has the same properties but a different reference.
 *
 * **Important**: The selector function should be stable (memoized with useCallback) for
 * optimal performance. This hook does NOT memoize the selector - it only provides
 * shallowEqual comparison by default.
 *
 * @example
 * ```tsx
 * // ✅ GOOD - Inline selector (stable identity on each render)
 * const theme = useAppSelectorMemo(state => state.theme.theme);
 *
 * // ✅ ALSO GOOD - For the same reason
 * const settings = useAppSelectorMemo(state => ({
 *   font: state.settings.arabicFont,
 *   size: state.settings.arabicFontSize
 * }));
 *
 * // ⚠️ NOTE - If you need custom equality, pass it as second argument
 * const data = useAppSelectorMemo(state => state.data, customEqual);
 * ```
 */
export function useAppSelectorMemo<Selected>(
  selector: (state: RootState) => Selected,
  equalityFn?: (left: Selected, right: Selected) => boolean
): Selected {
  // Note: Memoizing the selector here doesn't help because selector identity
  // changes on every render (unless caller memoizes it). However, shallowEqual
  // comparison of the *result* prevents unnecessary re-renders.
  const memoizedSelector = useMemo(() => selector, [selector]);

  // Use shallowEqual by default if no equality function is provided
  return useAppSelector(memoizedSelector, equalityFn || shallowEqual);
}
