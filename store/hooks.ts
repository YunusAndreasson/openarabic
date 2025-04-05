import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState, AppDispatch } from './store';

// Define TypedUseSelectorHook type
type TypedUseSelectorHook<TState> = <TSelected>(
  selector: (state: TState) => TSelected,
  equalityFn?: (left: TSelected, right: TSelected) => boolean
) => TSelected;

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch;

// Create a more selective version of useAppSelector that memoizes the selector function
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Create a custom hook for selecting specific parts of the state with memoization
export function useAppSelectorMemo<Selected>(
  selector: (state: RootState) => Selected,
  equalityFn?: (left: Selected, right: Selected) => boolean
): Selected {
  return useAppSelector(
    // Memoize the selector function to prevent unnecessary rerenders
    useMemo(() => selector, [selector]),
    equalityFn
  );
}
