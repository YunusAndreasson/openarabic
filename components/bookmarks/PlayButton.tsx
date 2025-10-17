import type { Ionicons } from '@expo/vector-icons';
import { useMemo, type ComponentProps, type FC } from 'react';

import { IconButton } from '@/components/ui/IconButton';
import { Theme } from '@/constants/colors';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useCurrentTheme, useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { BaseIconButtonProps } from '@/types/ui/button.types';

interface PlayButtonProps
  extends Omit<BaseIconButtonProps<ComponentProps<typeof Ionicons>['name']>, 'icon'> {
  isPlaying?: boolean;
}

function getIconName(isPlaying: boolean): 'pause' | 'play' {
  return isPlaying ? 'pause' : 'play';
}

const PlayButton: FC<PlayButtonProps> = ({ onPress, isPlaying = false, disabled = false }) => {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const currentTheme = useCurrentTheme();

  // Use appropriate icon color for each theme for optimal contrast
  const iconColor = useMemo(
    () =>
      currentTheme === Theme.Sepia
        ? colors.white // Use white icon for sepia theme for better contrast on amber background
        : isDarkMode
        ? colors.black
        : colors.text,
    [currentTheme, isDarkMode, colors.white, colors.black, colors.text]
  );

  return (
    <IconButton
      icon={getIconName(isPlaying)}
      onPress={onPress}
      disabled={disabled}
      iconColor={iconColor}
      debounce
      debounceDuration={300}
      hapticType="light"
      iconStyle={{ marginLeft: LAYOUT.SPACING.MICRO }}
    />
  );
};

export default PlayButton;
