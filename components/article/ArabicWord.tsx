import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React, { memo, useCallback, useEffect, useState, useMemo } from 'react';
import type { ComponentRef } from 'react';
import type { LayoutRectangle, LayoutChangeEvent } from 'react-native';
import { StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, { useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSelector } from 'react-redux';

import { LAYOUT } from '../../constants/layout';
import { useOpacityAnimation, useTransformAnimation } from '../../hooks/animations';
import { useAuth } from '../../hooks/useAuth';
import { useColors } from '../../hooks/useColors';
import { useIsDarkMode } from '../../hooks/useThemeDetection';
import { analytics } from '../../services/analytics';
import type { RootState } from '../../store/store';
import type { SentenceWord } from '../../types/vocabulary.types';
import { lightFeedback } from '../../utils/haptics';
import { ThemedText } from '../ThemedText';

import { WordTooltip } from './WordTooltip';

// Global counter for tooltip zIndex values
let tooltipZIndexCounter = LAYOUT.Z_INDEX.TOOLTIP;

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [layout, setLayout] = useState<LayoutRectangle | null>(null);
  const [pageLayout, setPageLayout] = useState<{ x: number; y: number } | null>(null);
  const [needsReverseAnimation, setNeedsReverseAnimation] = useState(false);
  const [tooltipZIndex, setTooltipZIndex] = useState<number>(0);
  const [forceSelected, setForceSelected] = useState<boolean | null>(null);

  // Get audio state with robust selector
  const audioState = useSelector((state: RootState) => ({
    wordId: state.audio.currentWordId,
    position: state.audio.currentPosition,
    isPlaying: state.audio.isPlaying,
  }));

  // Determine highlighting with fallbacks for backward compatibility
  // Case 1: If both component and Redux have position - check both ID and position
  // Case 2: If position is missing on either side - fall back to ID-only comparison
  const isAudioHighlighted = useMemo(() => {
    // If this component has position info and Redux has position info
    if (position !== undefined && audioState.position !== null) {
      // Check both word ID and position (precise mode for duplicates)
      return audioState.wordId === word.id && audioState.position === position;
    }

    // Fallback to ID-only comparison (backward compatible)
    return audioState.wordId === word.id;
  }, [audioState, word.id, position]);

  // Directly get selected status from cache to bypass potential stale props
  const studyWords = queryClient.getQueryData(['studyWords', user?.id]);

  // Determine if this word is selected by checking if it exists in study words
  const directlySelected = useMemo(() => {
    if (!studyWords || !Array.isArray(studyWords)) return false;

    const wordId = word.id;
    return studyWords.some(sw => {
      const swId = sw.sentence_word_id;
      return swId === wordId || String(swId) === String(wordId);
    });
  }, [studyWords, word.id]);

  // Use directly checked selection status OR forced selection OR prop
  const isSelected = forceSelected !== null ? forceSelected : directlySelected;

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
      layout && pageLayout
        ? {
            ...layout,
            x: layout.x + pageLayout.x,
            y: layout.y + pageLayout.y,
          }
        : null,
    [layout, pageLayout]
  );

  // Update border opacity when selection changes
  useEffect(() => {
    setBorderOpacity(isSelected ? 1 : 0);
  }, [isSelected, setBorderOpacity]);

  // Update word opacity based on tooltip visibility
  useEffect(() => {
    // Original effect for word opacity animation
    setWordOpacity(tooltipVisible ? (isDarkMode ? 0.7 : 0.5) : 1);
  }, [tooltipVisible, isDarkMode, setWordOpacity]);

  // Capture layout on mount and when window resizes
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setLayout(event.nativeEvent.layout);

    if (Platform.OS === 'web') {
      setPageLayout({ x: window.pageXOffset, y: window.pageYOffset });
    } else {
      setPageLayout({ x: 0, y: 0 });
    }
  }, []);

  // Calculate font size once outside the memo to avoid recalculations
  const calculatedFontSize = settings.fontScale * 24;

  // Memoize text props to prevent unnecessary recalculations
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
    // Gradually hide the tooltip
    setTooltipVisible(false);
  }, []);

  // Show tooltip on quick press with fade animation
  const handlePress = useCallback(() => {
    if (!layout) return;

    // Increment global counter and set new zIndex
    tooltipZIndexCounter += 1;
    setTooltipZIndex(tooltipZIndexCounter);

    // Show tooltip immediately with animation handled in WordTooltip
    setTooltipVisible(true);
  }, [layout]);

  // Add to study list on long press with animated feedback
  const handleLongPress = useCallback(() => {
    // If no user, do nothing on long press
    if (!user) {
      return;
    }

    // Provide haptic feedback
    lightFeedback();

    // Execute the animation and selection separately
    startPressAnimation();

    // Schedule the reverse animation using state
    setNeedsReverseAnimation(true);

    // Set optimistic update to show selection immediately
    setForceSelected(!isSelected);

    // Then handle selection
    onPress(word);
  }, [onPress, word, startPressAnimation, isSelected, user]);

  // Calculate styles based on state
  const finalStyles = useMemo(() => {
    const baseStyle = {
      ...styles.wordContainer,
      backgroundColor: isSelected ? colors.tint + '10' : undefined,
      borderBottomColor: isSelected ? colors.tint : undefined,
      borderBottomWidth: isSelected ? 2 : 0,
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

  // Remove scale style completely as it's no longer needed
  const scaleStyle = useMemo(() => ({}), []);

  // Track word selection changes
  useEffect(() => {
    if (user && word.id) {
      const wordId = typeof word.id === 'string' ? parseInt(word.id, 10) : word.id;
      if (isSelected) {
        analytics.trackAddStudyWord(wordId, {
          word: word.word_form,
          english: word.english,
          ...(word.sentence?.article_id && { articleId: word.sentence.article_id }),
        });
      } else {
        analytics.trackRemoveStudyWord(wordId, {
          word: word.word_form,
          english: word.english,
        });
      }
    }
  }, [isSelected, user, word]);

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
        <Animated.View style={[scaleStyle, pressStyle]}>
          <ThemedText {...textProps}>{word.word_form}</ThemedText>
          {settings.showTransliteration && word.grammar_note ? (
            <ThemedText
              type="body"
              variant="subtle"
              style={styles.transliteration}
              arabicFontSize={Math.max(10, calculatedFontSize * 0.5)}
            >
              {word.grammar_note}
            </ThemedText>
          ) : null}
        </Animated.View>
      </TouchableOpacity>
      {tooltipVisible && absoluteLayout ? (
        <WordTooltip
          visible={tooltipVisible}
          text={word.word_form}
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
  transliteration: {
    marginTop: -4,
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

export const ArabicWord = memo(ArabicWordComponent);
