/**
 * Tutorial Provider
 * Provides tutorial state management to entire app via Context
 */

import type { ReactNode } from 'react';

import type { TutorialId } from '@/constants/tutorials';
import { useTutorialManager } from '@/hooks/tutorials/useTutorialManager';
import { createRequiredContext } from '@/utils/createRequiredContext';

interface TutorialContextValue {
  shouldShowTutorial: (tutorialId: TutorialId) => boolean;
  completeTutorial: (tutorialId: TutorialId) => void;
  resetAllTutorials: () => Promise<void>;
  isLoaded: boolean;
}

/**
 * Hook to access tutorial context
 * Throws error if used outside TutorialProvider
 */
const [TutorialContext, useTutorialContext] = createRequiredContext<TutorialContextValue>(
  'TutorialContext',
  'useTutorialContext must be used within TutorialProvider',
);

export { useTutorialContext };

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
