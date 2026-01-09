/**
 * Central tutorial state management hook
 * Provides single source of truth for all tutorial completion states
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { TutorialId } from '@/constants/tutorials';
import {
  loadAllTutorialStates,
  markTutorialCompleted,
  resetAllTutorials as resetAllTutorialsStorage,
} from '@/utils/tutorialStorage';

interface TutorialManagerState {
  /** Map of tutorial ID to completion state */
  completedTutorials: Record<TutorialId, boolean>;
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
  const [state, setState] = useState<TutorialManagerState>({
    completedTutorials: {} as Record<TutorialId, boolean>,
    isLoaded: false,
  });

  // Load tutorial states from AsyncStorage on mount
  useEffect(() => {
    let mounted = true;

    async function loadStates() {
      const states = await loadAllTutorialStates();
      if (mounted) {
        setState({
          completedTutorials: states,
          isLoaded: true,
        });
      }
    }

    loadStates();

    return () => {
      mounted = false;
    };
  }, []);

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
  const completeTutorial = useCallback((tutorialId: TutorialId) => {
    // Optimistic update
    setState(prev => ({
      ...prev,
      completedTutorials: {
        ...prev.completedTutorials,
        [tutorialId]: true,
      },
    }));

    // Persist to AsyncStorage in background
    markTutorialCompleted(tutorialId);
  }, []);

  /**
   * Reset all tutorials (clear all completion states)
   * Used by "Show tutorials again" feature in Account settings
   */
  const resetAllTutorials = useCallback(async () => {
    await resetAllTutorialsStorage();

    // Reset in-memory state
    setState(prev => {
      const resetStates = {} as Record<TutorialId, boolean>;
      Object.keys(prev.completedTutorials).forEach(key => {
        resetStates[key as TutorialId] = false;
      });

      return {
        ...prev,
        completedTutorials: resetStates,
      };
    });
  }, []);

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
