import { shallowEqual, useDispatch, useSelector } from 'react-redux';

import type { AppDispatch, RootState } from '@/store/store';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

/**
 * Custom hook for selecting specific parts of the state with shallow equality checking.
 *
 * This hook uses `shallowEqual` to compare selected values, which prevents
 * re-renders when the selected object has the same properties but a different reference.
 * This is particularly useful when selecting multiple primitive values as an object.
 *
 * @example
 * ```tsx
 * // ✅ GOOD - Selecting a single primitive (shallowEqual works like ===)
 * const theme = useAppSelectorShallow(state => state.theme.theme);
 *
 * // ✅ GREAT - Selecting multiple values as object (shallowEqual prevents re-renders)
 * const settings = useAppSelectorShallow(state => ({
 *   font: state.settings.arabicFont,
 *   size: state.settings.arabicFontSize
 * }));
 * // Without shallowEqual, the inline object would cause re-renders on every render
 * // With shallowEqual, only re-renders if font or size values actually change
 * ```
 */
export function useAppSelectorShallow<Selected>(
  selector: (state: RootState) => Selected,
): Selected {
  return useAppSelector(selector, shallowEqual);
}
