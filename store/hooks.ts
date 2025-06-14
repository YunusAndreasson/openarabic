import { useMemo } from 'react';
import type { TypedUseSelectorHook } from 'react-redux';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';

import type { RootState, AppDispatch } from './store';
import { store } from './store'; // used to generate fallback state when Redux context is missing

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => {
  try {
    return useDispatch<AppDispatch>();
  } catch {
    // Fallback for when Redux context is not available
    console.warn('Redux context not available, returning no-op dispatch');
    return () => {};
  }
};

// Create a more selective version of useAppSelector that memoizes the selector function
export const useAppSelector: TypedUseSelectorHook<RootState> = (selector, equalityFn) => {
  try {
    return useSelector(selector, equalityFn);
  } catch {
    // Fallback for when Redux context is not available
    console.warn('Redux context not available, returning fallback state');
    // Generate the fallback state from the store so all slices are included.
    // Update this logic if new slices are added or the store shape changes.
    const fallbackState = store.getState();
    return selector(fallbackState);
  }
};

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
