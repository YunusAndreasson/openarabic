import React, { memo, useMemo, useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  TextStyle,
  LayoutRectangle,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import { SentenceWord } from '../types/vocabulary.types';
import { LAYOUT, getArabicTextStyle } from '../constants/layout';
import { useIsDarkMode } from '../hooks/useThemeDetection';
import Animated from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useCardAnimation } from '../hooks/animations';
import { WordTooltip } from './WordTooltip';
import * as Haptics from 'expo-haptics';

interface ArabicWordProps {
  word: SentenceWord;
  isSelected: boolean;
  onPress: (word: SentenceWord) => void;
  scale?: number;
  baseSize?: number;
}

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
  const [isLongPressed, setIsLongPressed] = useState(false);
  const [layout, setLayout] = useState<LayoutRectangle | null>(null);
  const [pageLayout, setPageLayout] = useState<{ x: number; y: number } | null>(null);

  // Calculate absolute position considering page scroll
  const absoluteLayout =
    layout && pageLayout
      ? {
          ...layout,
          x: layout.x + pageLayout.x,
          y: layout.y + pageLayout.y,
        }
      : null;

  // Use standardized card animation with custom scale values
  const { animatedStyle, pressed } = useCardAnimation(1, 1);

  // Update the pressed value based on isSelected
  useEffect(() => {
    pressed.value = isSelected ? 1 : 0;
  }, [isSelected, pressed]);

  // Capture layout on mount and when window resizes
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    // Capture the layout of the word element to position the tooltip properly
    setLayout(event.nativeEvent.layout);

    // Get page absolute position for tooltip positioning
    // This is important for ensuring the tooltip appears in the correct position
    if (Platform.OS === 'web') {
      setPageLayout({ x: window.pageXOffset, y: window.pageYOffset });
    } else {
      // On native platforms, pageLayout is already accounted for in the layout measurements
      setPageLayout({ x: 0, y: 0 });
    }
  }, []);

  // Show tooltip on quick press with subtle feedback
  const handlePress = useCallback(() => {
    if (!layout) return;

    // Show tooltip without haptic feedback
    setTooltipVisible(true);
  }, [layout]);

  // Add to study list on long press
  const handleLongPress = useCallback(() => {
    // Set visual feedback
    setIsLongPressed(true);

    // Add to study list
    onPress(word);

    // Provide gentle haptic feedback using the app's standard pattern
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // Silently fail if haptics aren't available
    });

    // Invalidate the dueWords query to refresh the vocabulary screen
    if (user) {
      queryClient.invalidateQueries({ queryKey: ['dueWords', user.id] });
    }

    // Reset visual state after a delay
    setTimeout(() => {
      setIsLongPressed(false);
    }, 300);
  }, [onPress, word, queryClient, user]);

  // Handle tooltip close
  const handleTooltipClose = useCallback(() => {
    setTooltipVisible(false);
  }, []);

  // Determine the text color based on whether the word is selected for study
  const textColor = isSelected ? colors.tint : colors.text;

  // Apply highlight for long-pressed state
  const longPressedStyle = isLongPressed
    ? {
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)',
        borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
      }
    : null;

  // Visual feedback for tooltip visibility - more subtle
  const tooltipVisibleStyle = tooltipVisible
    ? {
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
        borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
      }
    : null;

  // Combine visual feedback styles
  const combinedStyle = tooltipVisibleStyle || longPressedStyle;

  // Memoize the text style to prevent unnecessary re-renders
  const textStyle = useMemo(
    () => ({
      ...getArabicTextStyle(baseSize * scale, {
        color: textColor,
        fontWeight: isSelected ? '600' : ('normal' as TextStyle['fontWeight']),
        textShadowColor: isSelected ? colors.textShadowLight : 'transparent',
        textShadowRadius: isSelected ? 1 : 0,
        textShadowOffset: { width: 0, height: 0 },
      }),
    }),
    [textColor, baseSize, scale, isSelected, colors.textShadowLight]
  );

  // Memoize the underline style
  const underlineStyle = useMemo(
    () => ({
      ...styles.underline,
      width: `${Math.min(100, word.word_form.length * 90)}%` as any,
      backgroundColor: isDarkMode
        ? colors.borderOverlay // Use borderOverlay color in dark mode
        : colors.textOverlay, // Use textOverlay color in light mode
    }),
    [isDarkMode, colors.borderOverlay, colors.textOverlay, word.word_form.length]
  );

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={[styles.wordContainer, combinedStyle]}
        activeOpacity={0.6}
        onLayout={handleLayout}
        accessibilityLabel={`Arabic word: ${word.word_form}. ${
          isSelected
            ? 'Added to study list.'
            : 'Tap to see translation, long press to add to study list.'
        }`}
      >
        <Animated.View style={[styles.container, animatedStyle]}>
          <ThemedText style={textStyle} skipDefaultColor>
            {word.word_form}
          </ThemedText>

          {/* Enhanced underline for selected words */}
          {isSelected && <View style={underlineStyle} />}
        </Animated.View>
      </TouchableOpacity>

      {/* The tooltip positioned in the app's root level */}
      <WordTooltip
        visible={tooltipVisible}
        text={word.english}
        layout={absoluteLayout}
        onClose={handleTooltipClose}
      />
    </>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const ArabicWord = memo(ArabicWordComponent);

const styles = StyleSheet.create({
  wordContainer: {
    marginHorizontal: LAYOUT.SPACING.TINY / 2,
    marginVertical: LAYOUT.SPACING.TINY / 2,
    paddingHorizontal: 1,
    paddingVertical: 2,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
  },
  container: {
    position: 'relative',
    alignItems: 'center',
  },
  underline: {
    height: 1.5,
    position: 'absolute',
    bottom: -1.5,
    alignSelf: 'center',
    borderRadius: LAYOUT.SPACING.TINY,
  },
});
