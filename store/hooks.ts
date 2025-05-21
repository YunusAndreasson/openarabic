import { useMemo } from 'react';
import {
  useDispatch,
  useSelector,
  shallowEqual,
  TypedUseSelectorHook,
} from 'react-redux';

import type { RootState, AppDispatch } from './store';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();

// Create a more selective version of useAppSelector that memoizes the selector function
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Create a custom hook for selecting specific parts of the state with memoization
export function useAppSelectorMemo<Selected>(
  selector: (state: RootState) => Selected,
  equalityFn?: (left: Selected, right: Selected) => boolean
): Selected {
  // Memoize the selector function to prevent unnecessary rerenders
  const memoizedSelector = useMemo(() => selector, [selector]);

  // Use shallowEqual by default if no equality function is provided
  return useAppSelector(memoizedSelector, equalityFn || shallowEqual);
}
