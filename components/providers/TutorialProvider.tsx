/**
 * Tutorial Provider
 * Provides tutorial state management to entire app via Context
 */

import React, { createContext, useContext, type ReactNode } from 'react';

import type { TutorialId } from '@/constants/tutorials';
import { useTutorialManager } from '@/hooks/tutorials/useTutorialManager';

interface TutorialContextValue {
  shouldShowTutorial: (tutorialId: TutorialId) => boolean;
  completeTutorial: (tutorialId: TutorialId) => void;
  resetAllTutorials: () => Promise<void>;
  isLoaded: boolean;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

interface TutorialProviderProps {
  children: ReactNode;
}

/**
 * Provider component that manages tutorial state for entire app
 * Must be placed at app root level in _layout.tsx
 */
export function TutorialProvider({ children }: TutorialProviderProps) {
  const tutorialManager = useTutorialManager();

  return <TutorialContext value={tutorialManager}>{children}</TutorialContext>;
}

TutorialProvider.displayName = 'TutorialProvider';

/**
 * Hook to access tutorial context
 * Throws error if used outside TutorialProvider
 */
export function useTutorialContext(): TutorialContextValue {
  const context = useContext(TutorialContext);

  if (!context) {
    throw new Error('useTutorialContext must be used within TutorialProvider');
  }

  return context;
}
