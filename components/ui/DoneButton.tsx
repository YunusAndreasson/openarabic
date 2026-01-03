import { router } from 'expo-router';
import type { FC } from 'react';
import { useCallback } from 'react';

import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { TIMING_CONFIG } from '@/constants/animation';
import { useColors } from '@/hooks/theme/useColors';

interface DoneButtonProps {
  /**
   * Optional callback when done is pressed (defaults to router.back())
   */
  onPress?: () => void;
}

// Small delay to let press animation complete before navigation
const NAVIGATION_DELAY = TIMING_CONFIG.FAST.duration / 2; // 60ms

export const DoneButton: FC<DoneButtonProps> = ({ onPress }) => {
  const colors = useColors();

  // Create press handler with navigation delay
  const handlePressAction = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      // Default behavior: navigate back with slight delay for better UX
      setTimeout(() => {
        router.back();
      }, NAVIGATION_DELAY);
    }
  }, [onPress]);

  return (
    <HeaderIconButton
      iconName="checkmark-circle"
      onPress={handlePressAction}
      size="medium"
      iconColor={colors.tint}
      backgroundColor={colors.transparent}
    />
  );
};
