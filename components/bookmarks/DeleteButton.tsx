import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, FC } from 'react';

import IconButton from '@/components/ui/IconButton';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { BaseIconButtonProps } from '@/types/ui/button.types';

const DeleteButton: FC<
  Omit<BaseIconButtonProps<ComponentProps<typeof Ionicons>['name']>, 'icon'>
> = ({ onPress, disabled = false }) => {
  const colors = useColors();

  return (
    <IconButton
      icon="trash"
      onPress={onPress}
      disabled={disabled}
      variant="danger"
      iconSize={LAYOUT.BUTTON.ICON_SIZE.SMALL}
      iconColor={colors.black}
      hapticType="selection"
    />
  );
};

export default DeleteButton;
