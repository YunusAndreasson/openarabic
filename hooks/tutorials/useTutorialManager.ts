/**
 * Central tutorial state management hook
 * Provides single source of truth for all tutorial completion states
 */

import { use, useCallback, useEffect, useMemo, useState } from 'react';

import { AuthContext } from '@/components/providers/AuthProvider';
import type { TutorialId } from '@/constants/tutorials';
import {
  loadAllTutorialStates,
  markTutorialCompleted,
  resetAllTutorials as resetAllTutorialsStorage,
} from '@/utils/tutorialStorage';

interface TutorialManagerState {
  /**
   * Map of tutorial ID to completion state.
   *
   * `Partial` because that is the truth for the first frames: the map starts
   * EMPTY and is only total once AsyncStorage has answered. Declared total (and
   * seeded with `{} as Record<TutorialId, boolean>`) every lookup read as
   * `boolean` while actually being `undefined`, so the type could not have
   * caught a reader that trusted it before `isLoaded`.
   */
  completedTutorials: Partial<Record<TutorialId, boolean>>;
  /** Whether initial state has been loaded from AsyncStorage */
  isLoaded: boolean;
}

/**
 * Hook for managing all tutorial states
 * Call this once at app root level to provide tutorial state to entire app
 *
 * @returns Tutorial manager methods and state
 */
export function useTutorialManager() {
  const auth = use(AuthContext);
  const userId = auth?.user?.id ?? null;
  const [state, setState] = useState<TutorialManagerState>({
    completedTutorials: {},
    isLoaded: false,
  });

  // Load tutorial states from AsyncStorage on mount
  useEffect(() => {
    let mounted = true;

    async function loadStates() {
      const states = await loadAllTutorialStates(userId);
      if (mounted) {
        setState({
          completedTutorials: states,
          isLoaded: true,
        });
      }
    }

    void loadStates();

    return () => {
      mounted = false;
    };
  }, [userId]);

  /**
   * Check if a tutorial should be shown
   * Returns false if tutorial is completed or state not yet loaded
   */
  const shouldShowTutorial = useCallback(
    (tutorialId: TutorialId): boolean => {
      return state.isLoaded && !state.completedTutorials[tutorialId];
    },
    [state.isLoaded, state.completedTutorials],
  );

  /**
   * Mark a tutorial as completed
   * Optimistic update with background persistence
   */
  const completeTutorial = useCallback(
    (tutorialId: TutorialId) => {
      // Optimistic update
      setState(prev => ({
        ...prev,
        completedTutorials: {
          ...prev.completedTutorials,
          [tutorialId]: true,
        },
      }));

      // Persist to AsyncStorage in background
      void markTutorialCompleted(tutorialId, userId);
    },
    [userId],
  );

  /**
   * Reset all tutorials (clear all completion states)
   * Used by "Show tutorials again" feature in Account settings
   */
  const resetAllTutorials = useCallback(async () => {
    await resetAllTutorialsStorage(userId);

    // Reset in-memory state. Emptying the map is what "none completed" means
    // here — `shouldShowTutorial` reads `!completedTutorials[id]`, so an absent
    // key and an explicit `false` are the same answer, and rebuilding a map of
    // falses only to be read for falsiness was work with no reader.
    setState(prev => ({ ...prev, completedTutorials: {} }));
  }, [userId]);

  return useMemo(
    () => ({
      shouldShowTutorial,
      completeTutorial,
      resetAllTutorials,
      isLoaded: state.isLoaded,
    }),
    [shouldShowTutorial, completeTutorial, resetAllTutorials, state.isLoaded],
  );
}
