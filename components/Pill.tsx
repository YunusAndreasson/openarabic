import React, { useCallback, useMemo, memo } from 'react';
import { Pressable, StyleSheet, View, Platform } from 'react-native';
import Animated from 'react-native-reanimated';

import type { PillProps } from '@/types/ui/pill.types';

import { LAYOUT } from '../constants/layout';
import { useTransformAnimation } from '../hooks/animations';
import { useColors } from '../hooks/useColors';
import { useIsDarkMode } from '../hooks/useThemeDetection';
import { capitalizeFirstLetter } from '../utils/stringUtils';

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
      initialValue: 0.98, // Scale down to 98%
      targetValue: 1, // Scale up to 100%
      duration: LAYOUT.ANIMATION.DURATION.FAST / 2, // Faster duration for responsive feel
    });

    // Memoize the press handler
    const handlePress = useCallback(() => {
      if (onSelect) {
        onSelect(id);
      }
    }, [id, onSelect]);

    // Determine if this is a category pill (which has different styling)
    const isCategory = variant === 'category';
    const isHorizontalCategory = variant === 'horizontal-category';

    // Get category pill styles
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
        : isDarkMode
          ? colors.white + '30'
          : colors.cardBorder,
      borderWidth: isSelected ? 1 : 0.5,
      borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
      paddingHorizontal: LAYOUT.SPACING.MEDIUM,
      paddingVertical: LAYOUT.SPACING.TINY + 2,
      ...Platform.select({
        ios: {
          shadowColor: isDarkMode ? colors.black : colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDarkMode ? 0.25 : 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: isSelected ? 3 : 2,
        },
      }),
    });

    // Get filter pill styles
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
      borderWidth: isSelected ? LAYOUT.BORDER.WIDTH.NORMAL : LAYOUT.BORDER.WIDTH.THIN,
      borderColor: isSelected ? colors.tint : colors.cardBorder,
      borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
      ...Platform.select({
        ios: {
          shadowColor: isDarkMode ? colors.black : colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDarkMode ? 0.25 : 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: isSelected ? 3 : 2,
        },
      }),
    });

    // Get container style based on variant and selection state
    const containerStyle = useMemo(() => {
      return isCategory || isHorizontalCategory
        ? getCategoryStyle(isDarkMode, isSelected, colors)
        : getFilterStyle(isDarkMode, isSelected, colors);
    }, [colors, isDarkMode, isSelected, isCategory, isHorizontalCategory]);

    // For category pills that don't need interaction
    if (isCategory && !onSelect) {
      return (
        <View
          style={[
            styles.container,
            absolute && styles.absoluteContainer,
            containerStyle,
            isDarkMode && [styles.darkModeShadow, { shadowColor: colors.shadow }],
          ]}
        >
          <ThemedText
            type="overline"
            colorName="textSecondary"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={isDarkMode ? { color: colors.text } : null}
          >
            {capitalizeFirstLetter(label.toLowerCase())}
          </ThemedText>
        </View>
      );
    }

    // For interactive pills
    return (
      <Animated.View style={scaleStyle}>
        <Pressable
          style={({ pressed: isPressedState }) => [
            styles.pill,
            containerStyle,
            isPressedState &&
              !isSelected && {
                backgroundColor: isDarkMode ? `${colors.elevation2}80` : `${colors.elevation1}80`,
              },
            isSelected && styles.pillSelected,
            absolute && styles.absoluteContainer,
          ]}
          onPress={handlePress}
          onPressIn={() => {
            startScaleDown();
          }}
          onPressOut={() => {
            resetScale();
          }}
          disabled={!onSelect}
          android_ripple={
            isSelected
              ? null
              : {
                  color: isDarkMode ? colors.textOverlay : colors.overlay,
                  borderless: false,
                  radius: -5,
                }
          }
        >
          <ThemedText
            type="overline"
            colorName={isSelected ? 'tint' : isDarkMode ? 'text' : 'textSecondary'}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {isCategory ? capitalizeFirstLetter(label.toLowerCase()) : label.toUpperCase()}
          </ThemedText>
        </Pressable>
      </Animated.View>
    );
  }
);

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
  darkModeShadow: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  pill: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    marginBottom: LAYOUT.SPACING.SMALL,
    marginRight: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.SMALL - 1,
  },
  pillSelected: {
    borderWidth: LAYOUT.BORDER.WIDTH.THIN, // Use constant
  },
  pillText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 0.9, // Slightly smaller font size
    fontWeight: '500', // Add medium font weight for better readability
  },
});

Pill.displayName = 'Pill';

export default Pill;
