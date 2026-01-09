import type { FC } from 'react';

import { NavigationHeaderButton } from '@/components/ui/NavigationHeaderButton';

interface CloseButtonProps {
  /**
   * Optional callback when close is pressed (defaults to router.back())
   */
  onPress?: () => void;
}

/**
 * Close button for dismissing modals and screens.
 * Uses "close" icon (X) - distinct from DoneButton which uses checkmark.
 */
export const CloseButton: FC<CloseButtonProps> = ({ onPress }) => {
  return <NavigationHeaderButton action="close" onPress={onPress} />;
};
