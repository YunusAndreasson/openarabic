import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { OPACITY_HEX } from '@/constants/colors';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { PillProps } from '@/types/ui/pill.types';

/**
 * A simple pill component for filters and categories
 */
export function Pill({ id, label, isSelected = false, onSelect, variant = 'filter' }: PillProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  const handlePress = () => {
    if (onSelect) {
      onSelect(id);
    }
  };

  const isCategory = variant === 'category';
  const textType = isCategory ? 'overline' : 'label';

  const containerStyle = (() => {
    const baseStyle = {
      alignItems: 'center' as const,
      borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
      justifyContent: 'center' as const,
      minHeight: LAYOUT.SPACING.XLARGE,
      shadowColor: colors.shadow,
    };

    if (isCategory) {
      return {
        ...baseStyle,
        backgroundColor: isSelected
          ? `${colors.tint}${OPACITY_HEX.HIGH}` // 80%
          : isDarkMode
            ? `${colors.elevation2}${OPACITY_HEX.MEDIUM}` // 60%
            : `${colors.elevation1}${OPACITY_HEX.MEDIUM_HIGH}`, // 70%
        paddingHorizontal: LAYOUT.SPACING.MEDIUM,
        paddingVertical: 0,
        ...LAYOUT.ELEVATION.SMALL,
      };
    }

    // Filter variant
    return {
      ...baseStyle,
      backgroundColor: isSelected
        ? colors.tint
        : isDarkMode
          ? colors.elevation2
          : colors.elevation1,
      borderWidth: LAYOUT.BORDER.WIDTH.THIN,
      borderColor: isSelected ? colors.tint : colors.borderOverlay,
      paddingHorizontal: LAYOUT.SPACING.LARGE,
      paddingVertical: LAYOUT.SPACING.SMALL,
      marginBottom: LAYOUT.SPACING.SMALL,
      marginRight: LAYOUT.SPACING.SMALL,
      ...LAYOUT.ELEVATION.SUBTLE,
    };
  })();

  const pressedStyle = {
    backgroundColor: isDarkMode ? `${colors.elevation2}80` : `${colors.elevation1}80`,
  };

  const getPressableStyle = ({ pressed }: { pressed: boolean }) => [
    containerStyle,
    pressed && !isSelected && pressedStyle,
  ];

  // Determine text color - ensure contrast for selected state
  const textColorName = (() => {
    if (!isSelected) return 'text';
    // For selected state, use high-contrast color based on theme
    return isDarkMode ? 'text' : 'background';
  })();

  // Non-interactive category pill
  if (isCategory && !onSelect) {
    return (
      <View style={containerStyle}>
        <ThemedText
          colorName={textColorName}
          ellipsizeMode="tail"
          numberOfLines={1}
          type={textType}
        >
          {label}
        </ThemedText>
      </View>
    );
  }

  // Interactive pill
  return (
    <Pressable
      disabled={!onSelect}
      style={getPressableStyle}
      onPress={handlePress}
      hitSlop={LAYOUT.HIT_SLOP.SMALL}
    >
      <ThemedText colorName={textColorName} ellipsizeMode="tail" numberOfLines={1} type={textType}>
        {label}
      </ThemedText>
    </Pressable>
  );
}
