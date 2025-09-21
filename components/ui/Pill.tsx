import { memo, useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { PillProps } from '@/types/ui/pill.types';

/**
 * A simple pill component for filters and categories
 */
const Pill = memo(({ id, label, isSelected = false, onSelect, variant = 'filter' }: PillProps) => {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  const handlePress = useCallback(() => {
    if (onSelect) {
      onSelect(id);
    }
  }, [id, onSelect]);

  const isCategory = variant === 'category';
  const textType = isCategory ? 'overline' : 'label';

  const containerStyle = useMemo(() => {
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
          ? `${colors.tint}CC` // 80% opacity
          : isDarkMode
          ? `${colors.elevation2}99` // 60% opacity
          : `${colors.elevation1}B3`, // 70% opacity
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
  }, [colors, isDarkMode, isSelected, isCategory]);

  const pressedStyle = useMemo(
    () => ({
      backgroundColor: isDarkMode ? `${colors.elevation2}80` : `${colors.elevation1}80`,
    }),
    [isDarkMode, colors]
  );

  const getPressableStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [containerStyle, pressed && !isSelected && pressedStyle],
    [containerStyle, isSelected, pressedStyle]
  );

  // Non-interactive category pill
  if (isCategory && !onSelect) {
    return (
      <View style={containerStyle}>
        <ThemedText
          colorName={isSelected ? 'background' : 'text'}
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
      accessibilityRole="button"
      accessibilityState={{ selected: !!isSelected }}
      accessibilityLabel={`${isSelected ? 'Selected' : 'Select'} ${label} ${variant}`}
      accessibilityHint={
        onSelect ? `Double tap to ${isSelected ? 'deselect' : 'select'} this ${variant}` : undefined
      }
      style={getPressableStyle}
      onPress={handlePress}
    >
      <ThemedText
        colorName={isSelected ? 'background' : 'text'}
        ellipsizeMode="tail"
        numberOfLines={1}
        type={textType}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
});

Pill.displayName = 'Pill';

export default Pill;
