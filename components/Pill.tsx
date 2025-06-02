import React, { useCallback, useMemo, memo, ReactNode } from 'react';
import { Pressable, StyleSheet, View, Platform, type TextStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import type { PillProps as OriginalPillProps } from '@/types/ui/pill.types';

import { LAYOUT } from '../constants/layout';
import { useTransformAnimation } from '../hooks/animations';
import { useColors } from '../hooks/useColors';
import { useIsDarkMode } from '../hooks/useThemeDetection';

import { ThemedText } from './ThemedText';

// Opacity constants for category pills
const CATEGORY_OPACITY = {
  SELECTED: 'CC', // 80% opacity
  BLUR_DARK: '99', // 60% opacity for dark mode blur effect
  BLUR_LIGHT: 'B3', // 70% opacity for light mode blur effect
} as const;

/**
 * A unified pill component that can be used for filters, categories, and other selectable items
 */
const Pill = memo(
  ({
    id,
    label,
    isSelected = false,
    onSelect,
    absolute = false,
    variant = 'filter',
    pillBg,
    pillStyle,
  }: Omit<OriginalPillProps, 'label'> & {
    label: ReactNode;
    pillBg?: string;
    pillStyle?: object;
  }) => {
    const colors = useColors();
    const isDarkMode = useIsDarkMode();

    // Use scale animation hook for press feedback
    const {
      animatedStyle: scaleStyle,
      startAnimation: startScaleDown,
      reverseAnimation: resetScale,
    } = useTransformAnimation({
      type: 'scale',
      initialValue: 0.98,
      targetValue: 1,
      duration: LAYOUT.ANIMATION.DURATION.FAST / 2,
    });

    const handlePress = useCallback(() => {
      if (onSelect) {
        onSelect(id);
      }
    }, [id, onSelect]);

    const isCategory = variant === 'category';
    const isHorizontalCategory = variant === 'horizontal-category';
    const textType = isCategory || isHorizontalCategory ? 'overline' : 'label';

    const textStyle: TextStyle = isDarkMode ? { color: colors.text } : {};

    const containerStyle = useMemo(() => {
      return getContainerStyle(
        isCategory,
        isHorizontalCategory,
        isDarkMode,
        isSelected,
        colors,
        pillBg
      );
    }, [colors, isDarkMode, isSelected, isCategory, isHorizontalCategory, pillBg]);

    const pressedStyle = useMemo(
      () => ({
        backgroundColor: isDarkMode ? `${colors.elevation2}80` : `${colors.elevation1}80`,
      }),
      [isDarkMode, colors]
    );

    const androidRipple = useMemo(
      () =>
        !isSelected
          ? {
              color: colors.navigationRipple,
              borderless: false,
              radius: -5,
            }
          : null,
      [isSelected, colors]
    );

    const handlePressIn = useCallback(() => {
      startScaleDown();
    }, [startScaleDown]);

    const handlePressOut = useCallback(() => {
      resetScale();
    }, [resetScale]);

    const shadowStyle = useMemo(
      () => ({
        shadowColor: isDarkMode ? colors.black : colors.shadow,
        shadowOffset: { width: 0, height: isDarkMode ? 1 : 2 },
        shadowOpacity: isDarkMode ? 0.25 : 0.1,
        shadowRadius: isDarkMode ? 1 : 4,
      }),
      [isDarkMode, colors]
    );

    if (isCategory && !onSelect) {
      return (
        <View
          style={[
            styles.container,
            absolute && styles.absoluteContainer,
            containerStyle,
            isDarkMode && shadowStyle,
          ]}
        >
          <ThemedText
            type={textType}
            colorName={isSelected ? 'background' : 'text'}
            numberOfLines={1}
            ellipsizeMode="tail"
            style={textStyle}
          >
            {label}
          </ThemedText>
        </View>
      );
    }

    return (
      <Animated.View style={scaleStyle}>
        <Pressable
          style={({ pressed: isPressedState }) => [
            styles.pill,
            containerStyle,
            pillStyle,
            isPressedState && !isSelected && pressedStyle,
            absolute && styles.absoluteContainer,
          ]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!onSelect}
          android_ripple={androidRipple}
        >
          <ThemedText
            type={textType}
            colorName={isSelected ? 'background' : 'text'}
            numberOfLines={1}
            ellipsizeMode="tail"
            style={textStyle}
          >
            {label}
          </ThemedText>
        </Pressable>
      </Animated.View>
    );
  }
);

function getContainerStyle(
  isCategory: boolean,
  isHorizontalCategory: boolean,
  isDarkMode: boolean,
  isSelected: boolean,
  colors: ReturnType<typeof useColors>,
  pillBg?: string
) {
  if (isCategory || isHorizontalCategory) {
    return getCategoryStyle(isDarkMode, isSelected, colors);
  }
  return getFilterStyle(isDarkMode, isSelected, colors, pillBg);
}

const getCategoryStyle = (
  isDarkMode: boolean,
  isSelected: boolean,
  colors: ReturnType<typeof useColors>
) => ({
  backgroundColor: isSelected
    ? isDarkMode
      ? `${colors.tint}${CATEGORY_OPACITY.SELECTED}` // 80% opacity for selected state
      : `${colors.tint}${CATEGORY_OPACITY.SELECTED}`
    : isDarkMode
      ? `${colors.elevation2}${CATEGORY_OPACITY.BLUR_DARK}` // 60% opacity for blur-like effect
      : `${colors.elevation1}${CATEGORY_OPACITY.BLUR_LIGHT}`, // 70% opacity for blur-like effect
  borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  paddingVertical: LAYOUT.SPACING.TINY + 2,
  // Enhanced shadow for depth perception (simulates blur effect)
  ...(Platform.OS === 'ios'
    ? {
        shadowColor: isDarkMode ? colors.black : colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDarkMode ? 0.4 : 0.15, // Increased opacity for blur-like effect
        shadowRadius: 6, // Increased radius for softer shadow
      }
    : {
        elevation: isSelected ? 4 : 3, // Higher elevation for blur-like effect
      }),
});

const getFilterStyle = (
  isDarkMode: boolean,
  isSelected: boolean,
  colors: ReturnType<typeof useColors>,
  pillBg?: string
) => ({
  backgroundColor:
    pillBg !== undefined
      ? pillBg
      : isSelected
        ? colors.tint
        : isDarkMode
          ? colors.elevation2
          : colors.elevation1,
  borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  ...(Platform.OS === 'ios'
    ? {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: LAYOUT.OPACITY.XLIGHT,
        shadowRadius: 3,
      }
    : {
        elevation: isSelected ? 2 : 1,
      }),
});

const styles = StyleSheet.create({
  absoluteContainer: {
    left: LAYOUT.SPACING.MEDIUM,
    position: 'absolute',
    top: LAYOUT.SPACING.MEDIUM,
    zIndex: LAYOUT.Z_INDEX.OVERLAY + 10,
  },
  container: {
    minWidth: 50,
    zIndex: LAYOUT.Z_INDEX.OVERLAY + 10,
  },
  pill: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    marginBottom: LAYOUT.SPACING.SMALL,
    marginRight: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.SMALL - 1,
  },
});

Pill.displayName = 'Pill';

/**
 * pillStyle: Optional style override for the pill container (e.g., to remove margin for sort controls)
 */

export default Pill;
