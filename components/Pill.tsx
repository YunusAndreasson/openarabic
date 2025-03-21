import React, { useCallback, useMemo, useEffect } from 'react';
import { Pressable, StyleSheet, View, Platform, TextStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFadeInAnimation, useScaleAnimation } from '../hooks/animations';
import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/useColors';
import { useIsDarkMode } from '../hooks/useThemeDetection';
import { ThemedText } from './ThemedText';
import { capitalizeFirstLetter } from '../utils/stringUtils';
import { PillProps } from '@/types/ui.types';

/**
 * A unified pill component that can be used for filters, categories, and other selectable items
 */
const Pill = React.memo(
  ({
    id,
    label,
    isSelected = false,
    onSelect,
    animationDelay = 0,
    absolute = false,
    variant = 'filter',
  }: PillProps) => {
    const colors = useColors();
    const isDarkMode = useIsDarkMode();

    // Use fade-in animation hook with consistent timing
    const { animatedStyle, startAnimation } = useFadeInAnimation(
      0, // Start fully transparent
      LAYOUT.ANIMATION.DURATION.FAST
    );

    // Use scale animation hook for press feedback
    const {
      animatedStyle: scaleStyle,
      startAnimation: startScaleDown,
      reverseAnimation: resetScale,
    } = useScaleAnimation(
      0.98, // Scale down to 98%
      1, // Scale up to 100%
      LAYOUT.ANIMATION.DURATION.FAST / 2 // Faster duration for responsive feel
    );

    // Memoize the press handler
    const handlePress = useCallback(() => {
      if (onSelect) {
        onSelect(id);
      }
    }, [id, onSelect]);

    // Determine if this is a category pill (which has different styling)
    const isCategory = variant === 'category';
    const isHorizontalCategory = variant === 'horizontal-category';

    // Get container style based on variant and selection state
    const containerStyle = useMemo(() => {
      if (isCategory || isHorizontalCategory) {
        // Enhanced category pill styling for better visibility
        return {
          backgroundColor: isSelected
            ? isDarkMode
              ? `${colors.tint}85` // Selected, dark mode - slightly more vibrant
              : `${colors.tint}90` // Selected, light mode - more opaque for better contrast
            : isDarkMode
              ? `${colors.elevation2}95` // Unselected, dark mode - using elevation2 for better contrast
              : `${colors.elevation1}98`, // Unselected, light mode - more opaque for better visibility
          borderColor: isSelected
            ? isDarkMode
              ? `${colors.tint}80` // Selected in dark mode - more visible border
              : `${colors.tint}60` // Selected in light mode - subtle border
            : isDarkMode
              ? colors.elevation3 // Unselected in dark mode - subtle border
              : colors.cardBorder, // Unselected in light mode - default border
          borderWidth: isSelected ? 1 : 0.5, // Thinner border for cleaner look
          borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM, // Match card border radius
          paddingHorizontal: LAYOUT.SPACING.MEDIUM,
          paddingVertical: LAYOUT.SPACING.TINY + 2,
          // Enhanced shadow for better visibility against any background
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
        };
      }

      // Enhanced filter pill styling for better readability
      return {
        backgroundColor: isSelected
          ? isDarkMode
            ? `${colors.tint}15` // Selected, dark mode - subtle tint background
            : `${colors.tint}10` // Selected, light mode - very subtle tint background
          : colors.cardBackground, // Unselected - use cardBackground for consistency with cards
        borderWidth: isSelected ? LAYOUT.BORDER.WIDTH.NORMAL : LAYOUT.BORDER.WIDTH.THIN, // Use constants
        borderColor: isSelected
          ? colors.tint // Selected - use tint color for border to make selection obvious
          : colors.cardBorder, // Unselected - use cardBorder for consistency with cards
        borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM, // Match card border radius
        // Add shadow for better visibility
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
      };
    }, [colors, isDarkMode, isSelected, isCategory, isHorizontalCategory]);

    // Get text style based on variant and selection state
    const textStyle = useMemo(() => {
      const style: TextStyle = {};

      if (isCategory || isHorizontalCategory) {
        style.color = isSelected
          ? isDarkMode
            ? colors.white // Selected text in dark mode - white for better contrast
            : colors.white // Selected text in light mode - white for better contrast
          : isDarkMode
            ? colors.text // Unselected text in dark mode - full opacity for better readability
            : colors.titleText; // Unselected text in light mode - using titleText for better contrast
        style.fontSize = LAYOUT.TYPOGRAPHY.SCALE.TINY + 1;
        style.fontWeight = isSelected ? '700' : '500'; // Slightly lighter weight for unselected
        style.letterSpacing = 0.3; // Reduced from 0.5 to allow more characters
        style.lineHeight = 16;
        style.textAlign = 'center';
      } else {
        // Filter pill text styling
        style.fontSize = LAYOUT.TYPOGRAPHY.SCALE.SMALL;
        style.fontWeight = isSelected ? '600' : '500'; // Slightly lighter weights for subtlety

        if (isSelected) {
          style.color = colors.tint; // Use tint color for selected state
        } else {
          style.color = colors.text; // Use standard text color for unselected state
        }
      }

      return style;
    }, [colors, isDarkMode, isSelected, isCategory, isHorizontalCategory]);

    // Start the fade-in animation when the component mounts
    useEffect(() => {
      startAnimation(animationDelay);
    }, [startAnimation, animationDelay]);

    // For category pills that don't need interaction
    if (isCategory && !onSelect) {
      return (
        <Animated.View style={animatedStyle}>
          <View
            style={[
              styles.container,
              absolute && styles.absoluteContainer,
              containerStyle,
              // Add subtle inner shadow for depth
              isDarkMode && {
                shadowColor: 'rgba(0,0,0,0.3)',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 1,
              },
            ]}
          >
            <ThemedText type="overline" variant="secondary" numberOfLines={1} ellipsizeMode="tail">
              {capitalizeFirstLetter(label.toLowerCase())}
            </ThemedText>
          </View>
        </Animated.View>
      );
    }

    // For interactive pills
    return (
      <Animated.View style={animatedStyle}>
        <Animated.View style={[scaleStyle, absolute && styles.absoluteContainer]}>
          <Pressable
            style={({ pressed: isPressedState }) => [
              styles.pill,
              containerStyle,
              isPressedState &&
                !isSelected && {
                  backgroundColor: isDarkMode ? `${colors.elevation2}80` : `${colors.elevation1}80`,
                },
              isSelected && styles.pillSelected,
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
                    color: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    borderless: false,
                    radius: -5,
                  }
            }
          >
            <ThemedText type="overline" variant="secondary" numberOfLines={1} ellipsizeMode="tail">
              {isCategory ? capitalizeFirstLetter(label.toLowerCase()) : label.toUpperCase()}
            </ThemedText>
          </Pressable>
        </Animated.View>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    zIndex: LAYOUT.Z_INDEX.OVERLAY + 10,
    minWidth: 50,
  },
  absoluteContainer: {
    position: 'absolute',
    top: LAYOUT.SPACING.MEDIUM,
    left: LAYOUT.SPACING.MEDIUM,
    zIndex: LAYOUT.Z_INDEX.OVERLAY + 10,
  },
  pill: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.SMALL - 1,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    marginRight: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.SMALL,
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
