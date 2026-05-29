import type { Ionicons } from '@/components/ui/Icon';
import type { ComponentProps, FC } from 'react';

import { IconButton } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { BaseIconButtonProps } from '@/types/ui/button.types';

export const DeleteButton: FC<
  Omit<BaseIconButtonProps<ComponentProps<typeof Ionicons>['name']>, 'icon'>
> = ({ onPress, disabled = false }) => {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  return (
    <IconButton
      icon="trash"
      onPress={onPress}
      disabled={disabled}
      variant="danger"
      iconSize={LAYOUT.BUTTON.ICON_SIZE.SMALL}
      iconColor={isDarkMode ? colors.text : colors.black}
      hapticType="selection"
    />
  );
};
