import { TransparentHeaderButton } from '@/components/ui/TransparentHeaderButton';
import { router } from 'expo-router';
import { useCallback } from 'react';

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
 * existed to give this one component one prop.
 *
 * `router.back()` runs on the press itself. It used to wait 60ms "so the press
 * animation lands", but `HeaderIconButton` deliberately has no press animation —
 * its feedback is an instant pressed opacity — so the delay was latency spent
 * waiting for nothing.
 */
export const CloseButton = ({ onPress, accessibilityLabel }: CloseButtonProps) => {
  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
      return;
    }
    router.back();
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
