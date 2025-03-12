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

  // Handle long press with immediate feedback
  const handleLongPress = useCallback(() => {
    // Trigger haptic feedback first for immediate tactile response
    // Using the light impact style for a subtle, quick feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Update selection state through the parent component
    onPress(word);

    // Visual feedback for the press action
    setIsLongPressed(true);

    // Invalidate queries after the immediate feedback
    if (user) {
      queryClient.invalidateQueries({ queryKey: ['dueWords', user.id] });
    }

    // Reset the visual pressed state after a short delay
    setTimeout(() => {
      setIsLongPressed(false);
    }, 200); // Reduced from 300ms for faster reset
  }, [onPress, word, user, queryClient]);

  // Handle tooltip close
  const handleTooltipClose = useCallback(() => {
    setTooltipVisible(false);
  }, []);

  // Determine text color based on selection state - direct application
  const textColor = isSelected ? colors.tint : colors.text;

  // Apply highlight for long-pressed state - immediate visual feedback
  const longPressedStyle = isLongPressed
    ? {
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)',
      }
    : undefined;

  // Visual feedback for tooltip visibility - subtle
  const tooltipVisibleStyle = tooltipVisible
    ? {
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
      }
    : undefined;

  // Combine visual feedback styles
  const combinedStyle = longPressedStyle || tooltipVisibleStyle;

  // Memoize the text style for optimal performance
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
        delayLongPress={250} // Reduced for faster response
        style={[styles.wordContainer, combinedStyle]}
        activeOpacity={0.7} // Slightly increased for better visual feedback
        onLayout={handleLayout}
        accessibilityLabel={`Arabic word: ${word.word_form}. ${
          isSelected
            ? 'Added to study list.'
            : 'Tap to see translation, long press to add to study list.'
        }`}
      >
        <View style={styles.container}>
          <ThemedText style={textStyle} skipDefaultColor>
            {word.word_form}
          </ThemedText>

          {/* Underline for selected words */}
          {isSelected && <View style={underlineStyle} />}
        </View>
      </TouchableOpacity>

      {/* Tooltip */}
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
