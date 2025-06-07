import { useLocalSearchParams } from 'expo-router';
import React, { memo, useCallback, useEffect, useState, useMemo } from 'react';
import type { ComponentRef } from 'react';
import type { LayoutRectangle, LayoutChangeEvent, ViewStyle, TextStyle } from 'react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { LAYOUT } from '../../constants/layout';
import { useOpacityAnimation, useTransformAnimation } from '../../hooks/animations';
import { useColors } from '../../hooks/useColors';
import { useIsDarkMode } from '../../hooks/useThemeDetection';
import { useArabicWord } from '../../hooks/vocabulary/useArabicWord';
import type { TextWeight } from '../../types/ui/text.types';
import type { SentenceWord } from '../../types/vocabulary.types';
import { lightFeedback } from '../../utils/haptics';
import { ThemedText } from '../ThemedText';

import { WordTooltip } from './WordTooltip';

// Global counter for tooltip zIndex values with circular increment
const MIN_Z_INDEX = LAYOUT.Z_INDEX.TOOLTIP;
const MAX_Z_INDEX = 10000;
let tooltipZIndexCounter = MIN_Z_INDEX;

const getNextZIndex = () => {
  tooltipZIndexCounter =
    tooltipZIndexCounter >= MAX_Z_INDEX ? MIN_Z_INDEX : tooltipZIndexCounter + 1;
  return tooltipZIndexCounter;
};

const OPACITY = {
  TOOLTIP_DARK: 0.7,
  TOOLTIP_LIGHT: 0.5,
} as const;

interface ArabicWordProps {
  word: SentenceWord;
  onPress: (word: SentenceWord) => void;
  position?: number;
  settings: {
    showEnglish: boolean;
    fontScale: number;
    showTransliteration?: boolean;
    showWordType?: boolean;
  };
  wordRef?: React.RefObject<ComponentRef<typeof TouchableOpacity>>;
  isAudioHighlighted?: boolean;
  isDueWord?: boolean;
}

function ArabicWordComponent({
  word,
  onPress,
  position,
  settings,
  wordRef,
  isDueWord = false,
}: ArabicWordProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [layout, setLayout] = useState<LayoutRectangle | null>(null);
  const [needsReverseAnimation, setNeedsReverseAnimation] = useState(false);
  const [tooltipZIndex, setTooltipZIndex] = useState<number>(0);

  // Use our new hook
  const { isAudioHighlighted, isSelected, setForceSelected, handleSelectionChange } = useArabicWord(
    {
      word,
      position,
      onPress,
    }
  );

  // Use transform animation for press feedback
  const {
    animatedStyle: pressStyle,
    startAnimation: startPressAnimation,
    reverseAnimation: reversePressAnimation,
  } = useTransformAnimation({
    type: 'scale',
    initialValue: 1,
    targetValue: 0.95,
    duration: 200,
  });

  // Use opacity animation for border
  const { setOpacity: setBorderOpacity } = useOpacityAnimation({
    initialOpacity: isSelected ? 1 : 0,
    duration: 200,
  });

  // Use opacity animation for word fade
  const { setOpacity: setWordOpacity } = useOpacityAnimation({
    initialOpacity: 1,
    duration: 200,
  });

  // Get URL params for highlighting
  const { highlightWord } = useLocalSearchParams<{ highlightWord?: string }>();
  const isHighlighted = word.id != null && highlightWord === word.id.toString();

  // Use Reanimated for highlight animation
  const highlightOpacity = useSharedValue(0);

  useEffect(() => {
    if (isHighlighted) {
      // Use Reanimated's animation sequence
      highlightOpacity.value = withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0, { duration: 1000 })
      );
    }
  }, [isHighlighted, highlightOpacity]);

  // Handle the animation reversal after a brief delay
  useEffect(() => {
    if (!needsReverseAnimation) return;

    const timer = setTimeout(() => {
      reversePressAnimation();
      setNeedsReverseAnimation(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [needsReverseAnimation, reversePressAnimation]);

  // Calculate absolute position considering page scroll - memoized for performance
  const absoluteLayout = useMemo(
    () =>
      layout
        ? {
            ...layout,
            x: layout.x,
            y: layout.y,
          }
        : null,
    [layout]
  );

  // Update border opacity when selection changes
  useEffect(() => {
    setBorderOpacity(isSelected ? 1 : 0);
  }, [isSelected, setBorderOpacity]);

  // Update word opacity based on tooltip visibility
  useEffect(() => {
    setWordOpacity(
      tooltipVisible ? (isDarkMode ? OPACITY.TOOLTIP_DARK : OPACITY.TOOLTIP_LIGHT) : 1
    );
  }, [tooltipVisible, isDarkMode, setWordOpacity]);

  // Capture layout on mount and when window resizes
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setLayout(event.nativeEvent.layout);
  }, []);

  // Pre-calculate text size once when component mounts (will never change)
  const calculatedFontSize = useMemo(() => settings.fontScale * 24, [settings.fontScale]);

  // More aggressively memoized text props (only depends on selection)
  const textProps = useMemo(
    () => ({
      type: 'arabic' as const,
      variant: isSelected ? ('primary' as const) : undefined,
      skipDefaultColor: false,
      colorName: 'arabicText' as const,
      arabicFontSize: calculatedFontSize,
      weight: (isSelected ? 'semibold' : 'normal') as TextWeight,
      style: styles.textStyle as TextStyle,
    }),
    [isSelected, calculatedFontSize]
  );

  // Handle tooltip close
  const handleTooltipClose = useCallback(() => {
    setTooltipVisible(false);
  }, []);

  // Show tooltip on quick press with fade animation (manual trigger)
  const handlePress = useCallback(() => {
    if (!layout) return;

    // Set new zIndex using optimized counter
    setTooltipZIndex(getNextZIndex());

    // Show tooltip immediately with animation handled in WordTooltip
    setTooltipVisible(true);
  }, [layout]);

  // Add to study list on long press with animated feedback
  const handleLongPress = useCallback(() => {
    // Provide haptic feedback
    lightFeedback();

    // Execute the animation and selection separately
    startPressAnimation();

    // Schedule the reverse animation using state
    setNeedsReverseAnimation(true);

    // Set optimistic update to show selection immediately (this toggles selection)
    setForceSelected(!isSelected);

    // Then handle selection using the hook's handler
    handleSelectionChange();
  }, [handleSelectionChange, startPressAnimation, isSelected, setForceSelected]);

  // Generate dynamic styles
  const getAudioHighlightedStyle = useCallback(
    (): ViewStyle => ({
      backgroundColor: colors.audioHighlight,
      borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
      shadowColor: colors.audioHighlightBorder,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 1,
      elevation: 2,
    }),
    [colors.audioHighlight, colors.audioHighlightBorder]
  );

  const getSelectedStyle = useCallback(
    (): ViewStyle => ({
      borderBottomWidth: 1,
      borderBottomColor: isDueWord ? colors.wordDueUnderline : colors.wordSelectionUnderline,
      paddingBottom: 2,
      marginBottom: -1,
    }),
    [colors.wordDueUnderline, colors.wordSelectionUnderline, isDueWord]
  );

  // Compute final styles for the word container
  const containerStyle = useMemo(
    () => [
      styles.wordContainer,
      isAudioHighlighted && getAudioHighlightedStyle(),
      isSelected && getSelectedStyle(),
    ],
    [isAudioHighlighted, isSelected, getAudioHighlightedStyle, getSelectedStyle]
  );

  return (
    <>
      <TouchableOpacity
        ref={wordRef}
        activeOpacity={0.7}
        delayLongPress={250}
        style={containerStyle}
        onLayout={handleLayout}
        onLongPress={handleLongPress}
        onPress={handlePress}
      >
        <Animated.View style={[styles.wordView, pressStyle]}>
          <ThemedText {...textProps}>{word.word_form}</ThemedText>
        </Animated.View>
      </TouchableOpacity>
      {tooltipVisible && absoluteLayout ? (
        <WordTooltip
          layout={absoluteLayout}
          text={word.english}
          visible={tooltipVisible}
          zIndex={tooltipZIndex}
          onClose={handleTooltipClose}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  textStyle: {
    textAlign: 'center',
  },
  wordContainer: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.MICRO,
    paddingVertical: 2,
  },
  wordView: {},
});

export const ArabicWord = memo(ArabicWordComponent, (prevProps, nextProps) => {
  return (
    prevProps.isAudioHighlighted === nextProps.isAudioHighlighted &&
    prevProps.word.id === nextProps.word.id &&
    prevProps.settings.showTransliteration === nextProps.settings.showTransliteration &&
    prevProps.settings.fontScale === nextProps.settings.fontScale &&
    prevProps.position === nextProps.position
  );
});
