import { useMemo } from 'react';
import type { TypedUseSelectorHook } from 'react-redux';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';

import { Theme } from '@/constants/Colors';

import type { RootState, AppDispatch } from './store';

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
    // Return a minimal fallback state that matches the expected structure
    const fallbackState = {
      theme: { theme: Theme.Light },
      settings: {
        fontScale: 1,
        showEnglish: true,
        reminderTime: { hour: 19, minute: 0, enabled: false },
      },
      readingList: { articles: [], lastOpenedArticle: null },
      filters: { selectedCategories: [], selectedDifficulties: [], searchQuery: '' },
      listen: { currentArticle: null, isPlaying: false, queue: [], currentIndex: 0 },
    } as unknown as RootState;
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
