import React, { useCallback, useMemo, useEffect } from 'react';
import { Pressable, StyleSheet, View, Platform, TextStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useFadeInAnimation, useScaleAnimation } from '../hooks/animations';
import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/useColors';
import { useIsDarkMode } from '../hooks/useThemeDetection';
import { ThemedText } from './ThemedText';

/**
 * Props for the Pill component
 */
interface PillProps {
  /**
   * Unique identifier for the item
   */
  id: string | number;

  /**
   * Label text to display in the pill
   */
  label: string;

  /**
   * Whether the pill is currently selected
   */
  isSelected?: boolean;

  /**
   * Callback when the pill is selected
   */
  onSelect?: (id: string | number) => void;

  /**
   * Animation delay in milliseconds
   */
  animationDelay?: number;

  /**
   * Whether the pill should be positioned absolutely
   */
  absolute?: boolean;

  /**
   * Variant of the pill
   * - 'filter': Used for filter lists
   * - 'category': Used for category display
   * - 'horizontal-category': Used in horizontal category lists
   */
  variant?: 'filter' | 'category' | 'horizontal-category';
}

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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
              shadowOpacity: isDarkMode ? 0.25 : 0.15, // Adjusted shadow opacity
              shadowRadius: 3,
            },
            android: {
              elevation: isSelected ? 3 : 2, // Slightly reduced elevation for subtlety
            },
          }),
        };
      }

      // Enhanced filter pill styling for better readability
      return {
        backgroundColor: isSelected
          ? isDarkMode
            ? `${colors.elevation2}` // Selected, dark mode - using elevation2 for subtle contrast
            : `${colors.elevation1}` // Selected, light mode - using elevation1 for subtle contrast
          : isDarkMode
            ? colors.cardBackground // Unselected, dark mode - card background
            : colors.background, // Unselected, light mode - page background for subtle contrast
        borderWidth: 0.5, // Thinner border for cleaner look
        borderColor: isSelected
          ? `${colors.tint}60` // Selected - subtle tint border
          : isDarkMode
            ? colors.elevation3 // Unselected dark mode - subtle border
            : colors.cardBorder, // Unselected light mode - default border
        borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM, // Match card border radius
        // Add shadow for better visibility
        ...Platform.select({
          ios: {
            shadowColor: isDarkMode ? colors.black : colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDarkMode ? 0.2 : 0.1,
            shadowRadius: 2,
          },
          android: {
            elevation: isSelected ? 2 : 1,
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
        style.letterSpacing = 0.5;
        style.lineHeight = 16;
        style.textAlign = 'center';
      } else {
        // Filter pill text styling
        style.fontSize = LAYOUT.TYPOGRAPHY.SCALE.SMALL;
        style.fontWeight = isSelected ? '600' : '500'; // Slightly lighter weights for subtlety

        if (isSelected) {
          style.color = colors.tint; // Use tint color for selected state
          // Add subtle text shadow for selected pills in dark mode
          if (isDarkMode) {
            style.textShadowColor = colors.textShadowLight;
            style.textShadowOffset = { width: 0, height: 0.5 };
            style.textShadowRadius = 1;
          }
        } else {
          style.color = isDarkMode ? colors.text : colors.titleText; // Better contrast in light mode
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
            <ThemedText style={textStyle} skipDefaultColor numberOfLines={1} ellipsizeMode="tail">
              {label.toUpperCase()}
            </ThemedText>
          </View>
        </Animated.View>
      );
    }

    // For interactive pills
    return (
      <Animated.View style={animatedStyle}>
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
              isCategory && absolute && styles.absoluteContainer,
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
            <ThemedText
              style={[styles.pillText, textStyle]}
              skipDefaultColor
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {isCategory ? label.toUpperCase() : label}
            </ThemedText>
          </Pressable>
        </Animated.View>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    maxWidth: '70%',
    zIndex: 15,
  },
  absoluteContainer: {
    position: 'absolute',
    top: LAYOUT.SPACING.MEDIUM,
    left: LAYOUT.SPACING.MEDIUM,
  },
  pill: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL - 1, // Slightly reduced vertical padding for better proportions
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM, // Match card border radius
    marginRight: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  pillSelected: {
    borderWidth: 0.5, // Thinner border for cleaner look
  },
  pillText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
});

Pill.displayName = 'Pill';

export default Pill;
