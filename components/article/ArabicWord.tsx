import { useLocalSearchParams } from 'expo-router';
import React, { memo, useCallback, useEffect, useState, useMemo } from 'react';
import type { ComponentRef } from 'react';
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
  const [needsReverseAnimation, setNeedsReverseAnimation] = useState(false);

  // Use our new hook
  const { isAudioHighlighted, isSelected } = useArabicWord({
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

  // Update border opacity when selection changes
  useEffect(() => {
    setBorderOpacity(isSelected ? 1 : 0);
  }, [isSelected, setBorderOpacity]);

  // Pre-calculate text size once when component mounts (will never change)
  const calculatedFontSize = useMemo(() => settings.fontScale * 24, [settings.fontScale]);

  // Calculate styles based on state
  const finalStyles = useMemo(() => {
    const baseStyle = {
      ...styles.wordContainer,
      borderBottomColor: isSelected ? colors.tint + '40' : undefined,
      borderBottomWidth: isSelected ? 1 : 0,
    };

    // Only apply audio highlight if it's explicitly highlighted and not from user interaction
    if (isAudioHighlighted && !isSelected) {
      return {
        ...baseStyle,
        backgroundColor: colors.info + (isDarkMode ? '20' : '15'), // Subtle background only
      };
    }

    return baseStyle;
  }, [isSelected, isAudioHighlighted, colors.tint, colors.info, isDarkMode]);

  // More aggressively memoized text props (only depends on selection)
  const textProps = useMemo(
    () => ({
      type: 'arabic' as const,
      skipDefaultColor: false,
      colorName: isSelected ? 'tint' : ('arabicText' as const),
      arabicFontSize: calculatedFontSize,
      weight: isSelected ? ('600' as const) : ('normal' as const),
      style: styles.textStyle,
    }),
    [isSelected, calculatedFontSize]
  );

  // Pre-calculate the transliteration font size too
  const transliterationFontSize = useMemo(
    () => Math.max(10, calculatedFontSize * 0.5),
    [calculatedFontSize]
  );

  // Add to study list on long press with animated feedback
  const handleLongPress = useCallback(() => {
    // Provide haptic feedback
    lightFeedback();

    // Execute the animation and selection separately
    startPressAnimation();

    // Schedule the reverse animation using state
    setNeedsReverseAnimation(true);

    // Then handle selection
    onPress(word);
  }, [onPress, word, startPressAnimation]);

  return (
    <TouchableOpacity
      ref={wordRef}
      onLongPress={handleLongPress}
      delayLongPress={250}
      activeOpacity={0.7}
      style={finalStyles}
    >
      <Animated.View style={[{}, pressStyle]}>
        <ThemedText {...textProps}>{word.word_form}</ThemedText>
        {settings.showTransliteration && word.grammar_note ? (
          <ThemedText
            type="body"
            variant="subtle"
            style={styles.transliteration}
            arabicFontSize={transliterationFontSize}
          >
            {word.grammar_note}
          </ThemedText>
        ) : null}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  textStyle: {
    textAlign: 'center',
  },
  transliteration: {
    marginTop: -4,
    textAlign: 'center',
  },
  wordContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
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
