import React, { useCallback, useMemo, memo } from 'react';
import { Pressable, StyleSheet, View, Platform, type TextStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import type { PillProps } from '@/types/ui/pill.types';

import { LAYOUT } from '../constants/layout';
import { useTransformAnimation } from '../hooks/animations';
import { useColors } from '../hooks/useColors';
import { useIsDarkMode } from '../hooks/useThemeDetection';

import { ThemedText } from './ThemedText';

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
  }: PillProps) => {
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
      return getContainerStyle(isCategory, isHorizontalCategory, isDarkMode, isSelected, colors);
    }, [colors, isDarkMode, isSelected, isCategory, isHorizontalCategory]);

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
              color: isDarkMode ? colors.textOverlay : colors.overlay,
              borderless: false,
              radius: -5,
            }
          : null,
      [isDarkMode, isSelected, colors]
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
            colorName={isSelected ? 'tint' : 'text'}
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
            isPressedState && !isSelected && pressedStyle,
            isSelected && styles.pillSelected,
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
            colorName={isSelected ? 'tint' : 'text'}
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
  colors: ReturnType<typeof useColors>
) {
  if (isCategory || isHorizontalCategory) {
    return getCategoryStyle(isDarkMode, isSelected, colors);
  }
  return getFilterStyle(isDarkMode, isSelected, colors);
}

const getCategoryStyle = (
  isDarkMode: boolean,
  isSelected: boolean,
  colors: ReturnType<typeof useColors>
) => ({
  backgroundColor: isSelected
    ? isDarkMode
      ? `${colors.tint}85`
      : `${colors.tint}90`
    : isDarkMode
      ? `${colors.elevation3}95`
      : `${colors.elevation1}98`,
  borderColor: isSelected
    ? isDarkMode
      ? `${colors.tint}80`
      : `${colors.tint}60`
    : colors.cardBorder,
  borderWidth: isSelected ? 1 : isDarkMode ? 1.5 : 0.5,
  borderStyle: 'solid' as const,
  borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  paddingVertical: LAYOUT.SPACING.TINY + 2,
  ...(Platform.OS === 'ios'
    ? {
        shadowColor: isDarkMode ? colors.black : colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDarkMode ? 0.25 : 0.1,
        shadowRadius: 4,
      }
    : {
        elevation: isSelected ? 3 : 2,
      }),
});

const getFilterStyle = (
  isDarkMode: boolean,
  isSelected: boolean,
  colors: ReturnType<typeof useColors>
) => ({
  backgroundColor: isSelected
    ? isDarkMode
      ? `${colors.tint}15`
      : `${colors.tint}10`
    : isDarkMode
      ? colors.elevation2
      : colors.elevation1,
  borderWidth: isSelected ? 1 : isDarkMode ? 1.5 : 0.5,
  borderColor: isSelected ? colors.tint : colors.cardBorder,
  borderStyle: 'solid' as const,
  borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  ...(Platform.OS === 'ios'
    ? {
        shadowColor: isDarkMode ? colors.black : colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDarkMode ? 0.2 : 0.08,
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
  pillSelected: {
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
  },
});

Pill.displayName = 'Pill';

export default Pill;
