import type { FC } from 'react';

import { NavigationHeaderButton } from '@/components/ui/NavigationHeaderButton';

interface DoneButtonProps {
  /**
   * Optional callback when done is pressed (defaults to router.back())
   */
  onPress?: () => void;
}

/**
 * Done button for confirming actions and dismissing screens.
 * Uses checkmark-circle icon - distinct from CloseButton which uses X.
 */
export const DoneButton: FC<DoneButtonProps> = ({ onPress }) => {
  return <NavigationHeaderButton action="done" onPress={onPress} />;
};
