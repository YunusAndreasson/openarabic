import { useLocalSearchParams } from 'expo-router';
import React, { memo, useCallback, useEffect, useState, useMemo } from 'react';
import type { ComponentRef } from 'react';
import type { LayoutRectangle, LayoutChangeEvent } from 'react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { LAYOUT } from '../../constants/layout';
import { useOpacityAnimation, useTransformAnimation } from '../../hooks/animations';
import { useArabicWord } from '../../hooks/useArabicWord';
import { useColors } from '../../hooks/useColors';
import { useIsDarkMode } from '../../hooks/useThemeDetection';
import type { SentenceWord } from '../../types/vocabulary.types';
import { lightFeedback } from '../../utils/haptics';
import { ThemedText } from '../ThemedText';

import { WordTooltip } from './WordTooltip';

// Global counter for tooltip zIndex values
let tooltipZIndexCounter = LAYOUT.Z_INDEX.TOOLTIP;
// Maximum z-index value to prevent potential integer overflow
const MAX_Z_INDEX = 10000;

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
}

function ArabicWordComponent({ word, onPress, position, settings, wordRef }: ArabicWordProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [layout, setLayout] = useState<LayoutRectangle | null>(null);
  const [needsReverseAnimation, setNeedsReverseAnimation] = useState(false);
  const [tooltipZIndex, setTooltipZIndex] = useState<number>(0);

  // Use our new hook
  const { isAudioHighlighted, isSelected, setForceSelected } = useArabicWord({
    word,
    position,
    onPress,
  });

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
    let timer: NodeJS.Timeout;

    if (needsReverseAnimation) {
      timer = setTimeout(() => {
        reversePressAnimation();
        setNeedsReverseAnimation(false);
      }, 200);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
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
    setWordOpacity(tooltipVisible ? (isDarkMode ? 0.7 : 0.5) : 1);
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
      weight: isSelected ? ('600' as const) : ('normal' as const),
      style: styles.textStyle,
    }),
    [isSelected, calculatedFontSize]
  );

  // Handle tooltip close
  const handleTooltipClose = useCallback(() => {
    setTooltipVisible(false);
  }, []);

  // Show tooltip on quick press with fade animation
  const handlePress = useCallback(() => {
    if (!layout) return;

    // Increment global counter and set new zIndex
    tooltipZIndexCounter += 1;
    // Reset if it gets too high to prevent potential issues
    if (tooltipZIndexCounter > MAX_Z_INDEX) {
      tooltipZIndexCounter = LAYOUT.Z_INDEX.TOOLTIP;
    }
    setTooltipZIndex(tooltipZIndexCounter);

    // Show tooltip immediately with animation handled in WordTooltip
    setTooltipVisible(true);
  }, [layout]);

  // Add to study list on long press with animated feedback
  const handleLongPress = useCallback(() => {
    console.log('Word long-pressed in ArabicWord component:', {
      wordId: word.id,
      wordForm: word.word_form,
      english: word.english,
      isSelected,
    });

    // Provide haptic feedback
    lightFeedback();

    // Execute the animation and selection separately
    startPressAnimation();

    // Schedule the reverse animation using state
    setNeedsReverseAnimation(true);

    // Set optimistic update to show selection immediately (this toggles selection)
    setForceSelected(!isSelected);

    // Then handle selection
    onPress(word);
  }, [onPress, word, startPressAnimation, isSelected, setForceSelected]);

  // Calculate styles based on state
  const finalStyles = useMemo(() => {
    const baseStyle = {
      ...styles.wordContainer,
      // Show border for all selected words (study words) with dimmed opacity
      borderBottomColor: isSelected ? colors.tint + '40' : 'transparent',
      borderBottomWidth: 1, // Keep consistent width to prevent layout shifts
    };

    // Audio highlight styles using only background color
    if (isAudioHighlighted) {
      return {
        ...baseStyle,
        backgroundColor: colors.info + (isDarkMode ? '20' : '15'), // Subtle background only
      };
    }

    return baseStyle;
  }, [isSelected, isAudioHighlighted, colors.tint, colors.info, isDarkMode]);

  return (
    <>
      <TouchableOpacity
        ref={wordRef}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={250}
        activeOpacity={0.7}
        onLayout={handleLayout}
        style={finalStyles}
      >
        <Animated.View style={[{}, pressStyle]}>
          <ThemedText {...textProps}>{word.word_form}</ThemedText>
        </Animated.View>
      </TouchableOpacity>
      {tooltipVisible && absoluteLayout ? (
        <WordTooltip
          visible={tooltipVisible}
          text={word.english}
          layout={absoluteLayout}
          onClose={handleTooltipClose}
          zIndex={tooltipZIndex}
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
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
});

export const ArabicWord = memo(ArabicWordComponent, (prevProps, nextProps) => {
  return (
    prevProps.isAudioHighlighted === nextProps.isAudioHighlighted &&
    prevProps.word.id === nextProps.word.id &&
    prevProps.settings.showTransliteration === nextProps.settings.showTransliteration &&
    prevProps.position === nextProps.position
  );
});
