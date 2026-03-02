import type { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { FC } from 'react';
import { useCallback, useEffect, useRef } from 'react';

import { TransparentHeaderButton } from '@/components/ui/TransparentHeaderButton';
import { TIMING_CONSTANTS } from '@/constants/animation';

/** Navigation action type - determines the icon shown */
type NavigationAction = 'close' | 'done';

/** Icon configuration for each navigation action */
const NAVIGATION_ICONS: Record<NavigationAction, keyof typeof Ionicons.glyphMap> = {
  close: 'close',
  done: 'checkmark-circle',
};

interface NavigationHeaderButtonProps {
  /** The navigation action type - determines icon */
  action: NavigationAction;
  /** Optional callback when pressed (defaults to router.back()) */
  onPress?: () => void;
}

/**
 * Unified navigation header button for dismissing screens.
 * Consolidates CloseButton and DoneButton into a single component.
 *
 * - `action="close"` - Shows X icon (for canceling/dismissing)
 * - `action="done"` - Shows checkmark icon (for completing/confirming)
 *
 * @example
 * <NavigationHeaderButton action="close" />
 * <NavigationHeaderButton action="done" onPress={handleSave} />
 */
export const NavigationHeaderButton: FC<NavigationHeaderButtonProps> = ({ action, onPress }) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      timeoutRef.current = setTimeout(() => {
        router.back();
      }, TIMING_CONSTANTS.NAVIGATION_DELAY);
    }
  }, [onPress]);

  return (
    <TransparentHeaderButton
      iconName={NAVIGATION_ICONS[action]}
      onPress={handlePress}
      size="medium"
    />
  );
};

NavigationHeaderButton.displayName = 'NavigationHeaderButton';
