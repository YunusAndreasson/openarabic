import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import type { IconName } from '@/components/ui/Icon';
import { memo } from 'react';

import type { IconButtonSize } from '@/constants/iconButton';
import { useColors } from '@/hooks/theme/useColors';

export interface TransparentHeaderButtonProps {
  /** Icon name (see constants/icons.ts) */
  icon: IconName;
  /** What the button does, for screen readers — it is icon-only. */
  accessibilityLabel: string;
  /** Press handler */
  onPress: () => void;
  /** Long press handler */
  onLongPress?: () => void;
  /** Button size - determines width, height, and icon size */
  size?: IconButtonSize;
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
 *   icon="close"
 *   accessibilityLabel="Close"
 *   onPress={handleClose}
 * />
 */
export const TransparentHeaderButton = memo<TransparentHeaderButtonProps>(
  ({
    icon,
    accessibilityLabel,
    onPress,
    onLongPress,
    size = 'medium',
    disabled = false,
    testID,
  }) => {
    const colors = useColors();

    return (
      <HeaderIconButton
        accessibilityLabel={accessibilityLabel}
        backgroundColor={colors.transparent}
        disabled={disabled}
        icon={icon}
        iconColor={colors.tint}
        size={size}
        testID={testID}
        onLongPress={onLongPress}
        onPress={onPress}
      />
    );
  },
);

TransparentHeaderButton.displayName = 'TransparentHeaderButton';
