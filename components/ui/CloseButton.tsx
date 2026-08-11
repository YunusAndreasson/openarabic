import { TransparentHeaderButton } from '@/components/ui/TransparentHeaderButton';
import { router } from 'expo-router';
import type { FC } from 'react';
import { useCallback, useEffect, useRef } from 'react';

import { TIMING_CONSTANTS } from '@/constants/animation';
import { STRINGS } from '@/constants/strings';

interface CloseButtonProps {
  /**
   * Optional callback when close is pressed (defaults to router.back())
   */
  onPress?: () => void;
  /** Override the spoken label when "Close" isn't specific enough. */
  accessibilityLabel?: string;
}

/**
 * Close button for dismissing modals and screens — the `headerRight` of every
 * modal and pushed screen in the app.
 *
 * This used to delegate to a `NavigationHeaderButton` that took an
 * `action: 'close' | 'done'`. The `done` branch had no callers, so that layer
 * existed to give this one component one prop; the deferred `router.back()`
 * it contributed now lives here directly.
 */
export const CloseButton: FC<CloseButtonProps> = ({ onPress, accessibilityLabel }) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
      return;
    }
    // Deferred so the press animation lands before the screen tears down.
    timeoutRef.current = setTimeout(() => {
      router.back();
    }, TIMING_CONSTANTS.NAVIGATION_DELAY);
  }, [onPress]);

  return (
    <TransparentHeaderButton
      accessibilityLabel={accessibilityLabel ?? STRINGS.CLOSE_A11Y}
      icon="close"
      onPress={handlePress}
    />
  );
};

CloseButton.displayName = 'CloseButton';
