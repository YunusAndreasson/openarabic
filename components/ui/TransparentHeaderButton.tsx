import type { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';

import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { useColors } from '@/hooks/theme/useColors';

export interface TransparentHeaderButtonProps {
  /** Icon name from Ionicons */
  iconName: keyof typeof Ionicons.glyphMap;
  /** Press handler */
  onPress: () => void;
  /** Long press handler */
  onLongPress?: () => void;
  /** Button size - determines width, height, and icon size */
  size?: 'small' | 'medium' | 'large';
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Header icon button with transparent background and tint icon color.
 * Used for native iOS glass effect in navigation headers.
 *
 * This component standardizes the common pattern of:
 * ```
 * <HeaderIconButton
 *   iconColor={colors.tint}
 *   backgroundColor={colors.transparent}
 *   ...
 * />
 * ```
 *
 * @example
 * <TransparentHeaderButton
 *   iconName="close"
 *   onPress={handleClose}
 *   size="medium"
 * />
 */
export const TransparentHeaderButton = memo<TransparentHeaderButtonProps>(
  ({ iconName, onPress, onLongPress, size = 'medium', disabled = false, testID }) => {
    const colors = useColors();

    return (
      <HeaderIconButton
        iconName={iconName}
        onPress={onPress}
        onLongPress={onLongPress}
        size={size}
        iconColor={colors.tint}
        backgroundColor={colors.transparent}
        disabled={disabled}
        testID={testID}
      />
    );
  },
);

TransparentHeaderButton.displayName = 'TransparentHeaderButton';
