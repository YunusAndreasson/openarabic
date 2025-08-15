import { memo, useCallback, useMemo } from 'react';
import { Pressable, View, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { PillProps } from '@/types/ui/pill.types';

/**
 * A simple pill component for filters and categories
 */
const Pill = memo(
  ({
    id,
    label,
    isSelected = false,
    onSelect,
    variant = 'filter',
    pillBg,
    pillStyle,
  }: PillProps) => {
    const colors = useColors();
    const isDarkMode = useIsDarkMode();

    const handlePress = useCallback(() => {
      if (onSelect) {
        onSelect(id);
      }
    }, [id, onSelect]);

    const isCategory = variant === 'category';
    const textType = isCategory ? 'overline' : 'label';
    const textStyle: TextStyle = isDarkMode ? { color: colors.text } : {};

    const containerStyle = useMemo(() => {
      if (isCategory) {
        return {
          backgroundColor: isSelected
            ? `${colors.tint}CC` // 80% opacity
            : isDarkMode
            ? `${colors.elevation2}99` // 60% opacity
            : `${colors.elevation1}B3`, // 70% opacity
          borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
          paddingHorizontal: LAYOUT.SPACING.MEDIUM,
          paddingVertical: LAYOUT.SPACING.TINY,
          shadowColor: isDarkMode ? colors.black : colors.shadow,
          ...LAYOUT.ELEVATION.SMALL,
        };
      }

      // Filter variant
      return {
        backgroundColor:
          pillBg !== undefined
            ? pillBg
            : isSelected
            ? colors.tint
            : isDarkMode
            ? colors.elevation2
            : colors.elevation1,
        borderWidth: LAYOUT.BORDER.WIDTH.THIN,
        borderColor: isSelected ? colors.tint : colors.borderOverlay,
        borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
        paddingHorizontal: LAYOUT.SPACING.LARGE,
        paddingVertical: LAYOUT.SPACING.SMALL,
        marginBottom: LAYOUT.SPACING.SMALL,
        marginRight: LAYOUT.SPACING.SMALL,
        shadowColor: colors.shadow,
        ...LAYOUT.ELEVATION.SUBTLE,
      };
    }, [colors, isDarkMode, isSelected, isCategory, pillBg]);

    const pressedStyle = useMemo(
      () => ({
        backgroundColor: isDarkMode ? `${colors.elevation2}80` : `${colors.elevation1}80`,
      }),
      [isDarkMode, colors]
    );

    const getPressableStyle = useCallback(
      ({ pressed }: { pressed: boolean }) => [
        containerStyle,
        pillStyle,
        pressed && !isSelected && pressedStyle,
      ],
      [containerStyle, pillStyle, isSelected, pressedStyle]
    );

    // Non-interactive category pill
    if (isCategory && !onSelect) {
      return (
        <View style={containerStyle}>
          <ThemedText
            colorName={isSelected ? 'background' : 'text'}
            ellipsizeMode="tail"
            numberOfLines={1}
            style={textStyle}
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
        style={getPressableStyle}
        onPress={handlePress}
      >
        <ThemedText
          colorName={isSelected ? 'background' : 'text'}
          ellipsizeMode="tail"
          numberOfLines={1}
          style={textStyle}
          type={textType}
        >
          {label}
        </ThemedText>
      </Pressable>
    );
  }
);

Pill.displayName = 'Pill';

export default Pill;
