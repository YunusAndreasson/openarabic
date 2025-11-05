/**
 * Individual tutorial hook
 * Manages visibility, timing, and dismissal for a single tutorial
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTutorialContext } from '@/components/providers';
import { TUTORIALS, type TutorialId } from '@/constants/tutorials';

interface UseTutorialReturn {
  /** Whether the tutorial is currently visible */
  isVisible: boolean;
  /** Trigger the tutorial to show (respects showDelay and completion state) */
  trigger: () => void;
  /** Dismiss the tutorial manually */
  dismiss: () => void;
  /** Tutorial configuration */
  config: (typeof TUTORIALS)[TutorialId];
}

/**
 * Hook for managing a single tutorial's visibility and timing
 *
 * @param tutorialId - The tutorial to manage
 * @returns Tutorial control methods and state
 *
 * @example
 * ```tsx
 * const wordTapTutorial = useTutorial(TutorialId.WORD_TAP);
 *
 * useEffect(() => {
 *   if (article && !isLoading) {
 *     wordTapTutorial.trigger();
 *   }
 * }, [article, isLoading]);
 *
 * return (
 *   <WordTapTutorial
 *     visible={wordTapTutorial.isVisible}
 *     onDismiss={wordTapTutorial.dismiss}
 *   />
 * );
 * ```
 */
export function useTutorial(tutorialId: TutorialId): UseTutorialReturn {
  const { shouldShowTutorial, completeTutorial } = useTutorialContext();
  const config = TUTORIALS[tutorialId];

  const [isVisible, setIsVisible] = useState(false);
  const hasTriggeredRef = useRef(false);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoDismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset hasTriggered when tutorial becomes available again (e.g., after reset)
  useEffect(() => {
    if (shouldShowTutorial(tutorialId)) {
      hasTriggeredRef.current = false;
    }
  }, [shouldShowTutorial, tutorialId]);

  /**
   * Trigger the tutorial to show
   * Respects showDelay and auto-dismiss configuration
   */
  const trigger = useCallback(() => {
    // Prevent duplicate triggers
    if (hasTriggeredRef.current) return;

    // Check if tutorial should be shown
    if (!shouldShowTutorial(tutorialId)) return;

    // Mark as triggered
    hasTriggeredRef.current = true;

    // Show after delay
    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);

      // Set up auto-dismiss if configured
      if (config.autoDismissDelay) {
        autoDismissTimeoutRef.current = setTimeout(() => {
          setIsVisible(false);
          completeTutorial(tutorialId);
        }, config.autoDismissDelay);
      }
    }, config.showDelay);
  }, [shouldShowTutorial, tutorialId, config, completeTutorial]);

  /**
   * Dismiss the tutorial manually
   * Marks tutorial as completed
   */
  const dismiss = useCallback(() => {
    setIsVisible(false);
    completeTutorial(tutorialId);

    // Clear any pending timeouts
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    if (autoDismissTimeoutRef.current) {
      clearTimeout(autoDismissTimeoutRef.current);
      autoDismissTimeoutRef.current = null;
    }
  }, [tutorialId, completeTutorial]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
      }
    };
  }, []);

  return {
    isVisible,
    trigger,
    dismiss,
    config,
  };
}
