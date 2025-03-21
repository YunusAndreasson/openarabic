import React, { memo, useCallback, useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  LayoutRectangle,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import { useIsDarkMode } from '../hooks/useThemeDetection';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  interpolateColor,
  Easing,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { usePressAnimation } from '../hooks/animations';
import { WordTooltip } from './WordTooltip';
import { lightFeedback } from '@/utils/haptics';
import { ArabicWordProps } from '@/types/ui.types';

// Type for animated styles to fix TypeScript errors
type AnimatedStyles = {
  [key: string]: any;
};

function ArabicWordComponent({
  word,
  isSelected,
  onPress,
  scale = 1,
  baseSize = 32,
}: ArabicWordProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [layout, setLayout] = useState<LayoutRectangle | null>(null);
  const [pageLayout, setPageLayout] = useState<{ x: number; y: number } | null>(null);

  // Animated values for long press feedback
  const longPressProgress = useSharedValue(0);
  const borderOpacity = useSharedValue(isSelected ? 1 : 0);

  // Calculate absolute position considering page scroll - memoized for performance
  const absoluteLayout = useMemo(
    () =>
      layout && pageLayout
        ? {
            ...layout,
            x: layout.x + pageLayout.x,
            y: layout.y + pageLayout.y,
          }
        : null,
    [layout, pageLayout]
  );

  // Use standardized press animation with custom scale values
  const { animatedStyle, pressed } = usePressAnimation({
    type: 'card',
    scaleAmount: 1,
    opacityAmount: 1,
  });

  // Update the pressed value based on isSelected - direct assignment for immediate effect
  useEffect(() => {
    pressed.value = isSelected ? 1 : 0;
    // Animate border opacity to avoid layout shifts
    borderOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 150 });
  }, [isSelected, pressed, borderOpacity]);

  // Animated style for long press feedback
  const longPressStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      longPressProgress.value,
      [0, 1],
      ['transparent', isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)']
    );

    return {
      backgroundColor,
      borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    };
  }, [isDarkMode]);

  // Animated border style - always present but opacity changes
  const borderStyle = useAnimatedStyle(() => {
    return {
      borderBottomWidth: 1.5,
      borderBottomColor: interpolateColor(
        borderOpacity.value,
        [0, 1],
        ['transparent', isDarkMode ? colors.borderOverlay : colors.textOverlay]
      ),
    };
  }, [isDarkMode, colors.borderOverlay, colors.textOverlay]);

  // Capture layout on mount and when window resizes
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setLayout(event.nativeEvent.layout);

    if (Platform.OS === 'web') {
      setPageLayout({ x: window.pageXOffset, y: window.pageYOffset });
    } else {
      setPageLayout({ x: 0, y: 0 });
    }
  }, []);

  // Show tooltip on quick press
  const handlePress = useCallback(() => {
    if (!layout) return;
    setTooltipVisible(true);
  }, [layout]);

  // Reset animation for cleanup
  const cleanupAnimation = useCallback(() => {
    // Cancel any pending animations to avoid conflicts
    cancelAnimation(longPressProgress);
    // Ensure value is properly reset
    longPressProgress.value = withTiming(0, { duration: 200 });
  }, [longPressProgress]);

  // Add to study list on long press with animated feedback
  const handleLongPress = useCallback(() => {
    // Cancel any ongoing animations to prevent conflicts
    cancelAnimation(longPressProgress);

    // Trigger haptic feedback immediately
    lightFeedback();

    // Update selection state through the parent component
    onPress(word);

    // Animate the long press feedback - faster entry with bounce
    longPressProgress.value = withTiming(1, {
      duration: 80,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    // Automatically reset the animation with better reliability
    setTimeout(() => {
      if (longPressProgress) {
        cancelAnimation(longPressProgress);
        longPressProgress.value = withTiming(
          0,
          {
            duration: 250,
            easing: Easing.bezier(0.34, 1.56, 0.64, 1), // Bouncy easing
          },
          finished => {
            if (finished) {
              // Ensure value is completely reset
              runOnJS(cleanupAnimation)();
            }
          }
        );
      }
    }, 300);

    // Invalidate the dueWords query to refresh the vocabulary screen
    if (user) {
      queryClient.invalidateQueries({ queryKey: ['dueWords', user.id] });
    }
  }, [onPress, word, queryClient, user, longPressProgress, cleanupAnimation]);

  // Consolidated visual properties - calculate multiple derived values in a single pass
  // This reduces overhead from multiple hooks and ensures consistent generation
  const { textProps, wordStyle, accessibilityLabel } = useMemo(() => {
    // Calculate font size once
    const calculatedFontSize = baseSize * scale;

    // Build text props
    const calculatedTextProps = {
      type: 'arabic' as const,
      variant: isSelected ? ('primary' as const) : undefined,
      skipDefaultColor: true,
      colorName: isSelected ? ('tint' as const) : ('text' as const),
      arabicFontSize: calculatedFontSize,
      weight: isSelected ? ('600' as const) : ('normal' as const),
      style: {
        paddingVertical: 0,
        marginBottom: 0,
      },
    };

    // Build word styles
    const baseStyles = [styles.wordContainer] as const;
    const styleObjects: any[] = [];

    // Add tooltip feedback style
    if (tooltipVisible) {
      styleObjects.push({
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.01)',
      });
    }

    // Build accessibility label
    const label = `Arabic word: ${word.word_form}. ${
      isSelected
        ? 'Added to study list.'
        : 'Tap to see translation, long press to add to study list.'
    }`;

    return {
      fontSize: calculatedFontSize,
      textProps: calculatedTextProps,
      wordStyle: [...baseStyles, ...styleObjects],
      accessibilityLabel: label,
    };
  }, [baseSize, scale, isSelected, tooltipVisible, isDarkMode, word.word_form]);

  // Reset animation when component unmounts
  useEffect(() => {
    return () => {
      if (longPressProgress) {
        cancelAnimation(longPressProgress);
      }
    };
  }, [longPressProgress]);

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={250}
        style={wordStyle}
        activeOpacity={0.7}
        onLayout={handleLayout}
        accessibilityLabel={accessibilityLabel}
      >
        <Animated.View
          style={[
            styles.container,
            animatedStyle as AnimatedStyles,
            longPressStyle as AnimatedStyles,
            borderStyle as AnimatedStyles,
          ]}
        >
          <ThemedText {...textProps}>{word.word_form}</ThemedText>
        </Animated.View>
      </TouchableOpacity>

      {layout && (
        <WordTooltip
          visible={tooltipVisible}
          text={word.english}
          layout={absoluteLayout}
          onClose={() => setTooltipVisible(false)}
        />
      )}
    </>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const ArabicWord = memo(ArabicWordComponent);

const styles = StyleSheet.create({
  wordContainer: {
    marginHorizontal: 1, // Reduced for tighter word spacing
    marginVertical: LAYOUT.SPACING.TINY / 2,
    paddingHorizontal: 3, // Reduced for tighter word spacing
    paddingVertical: 3,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    flexShrink: 0, // Prevent shrinking
    flexGrow: 0, // Prevent growing
    alignSelf: 'flex-start', // Allow natural width
    maxWidth: 150, // Prevent extremely long words from causing layout issues
    // Prevent layout shifts by reserving space
    height: undefined, // Allow height to be determined by content
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
