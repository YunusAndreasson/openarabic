import React, { memo, useCallback, useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  LayoutRectangle,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { ThemedText } from '../ThemedText';
import { useColors } from '../../hooks/useColors';
import { LAYOUT } from '../../constants/layout';
import { Colors } from '../../constants/Colors';
import { useIsDarkMode } from '../../hooks/useThemeDetection';
import Animated, { useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useAuth } from '../../hooks/useAuth';
import { useOpacityAnimation, useTransformAnimation } from '../../hooks/animations';
import { WordTooltip } from './WordTooltip';
import { lightFeedback } from '@/utils/haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { analytics } from '@/services/analytics';

// Global counter for tooltip zIndex values
let tooltipZIndexCounter = LAYOUT.Z_INDEX.TOOLTIP;

export interface ArabicWordProps {
  word: {
    id?: number | string;
    word_form: string;
    english?: string;
    [key: string]: any;
  };
  isSelected?: boolean;
  onPress: (word: any) => void;
  scale?: number;
  baseSize?: number;
}

function ArabicWordComponent({
  word,
  isSelected: propIsSelected,
  onPress,
  scale = 1,
  baseSize = 32,
}: ArabicWordProps) {
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
  const isSelected = forceSelected !== null ? forceSelected : directlySelected || propIsSelected;

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
  const calculatedFontSize = baseSize * scale;

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

  // Show tooltip on quick press with fade animation
  const handlePress = useCallback(() => {
    if (!layout) return;

    // Increment global counter and set new zIndex
    tooltipZIndexCounter += 1;
    setTooltipZIndex(tooltipZIndexCounter);

    // Show tooltip immediately
    setTooltipVisible(true);
  }, [layout]);

  // Handle tooltip close
  const handleTooltipClose = useCallback(() => {
    setTooltipVisible(false);
  }, []);

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

  // Update styling for border based on selection and highlight state
  const borderStyle = useMemo(() => {
    const highlightColor = colors.tint ? `${colors.tint}40` : Colors.light.transparent;

    return {
      borderBottomWidth: LAYOUT.BORDER.WIDTH.NORMAL + LAYOUT.BORDER.WIDTH.THIN,
      borderBottomColor: isSelected ? colors.textOverlay : Colors.light.transparent,
      backgroundColor: isHighlighted ? highlightColor : Colors.light.transparent,
    };
  }, [isSelected, isHighlighted, colors.textOverlay, colors.tint]);

  // Track word selection changes
  useEffect(() => {
    if (user && word.id) {
      const wordId = typeof word.id === 'string' ? parseInt(word.id, 10) : word.id;
      if (isSelected) {
        analytics.trackAddStudyWord(wordId, {
          word: word.word_form,
          english: word.english,
          articleId: word.sentence?.article_id,
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
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={250}
        style={[
          styles.wordContainer,
          // Add offsetY adjustment for first sentence positioning
          highlightWord ? { marginTop: 2 } : null,
        ]}
        activeOpacity={0.7}
        onLayout={handleLayout}
      >
        <Animated.View
          style={[
            styles.container,
            // @ts-ignore - Animation types
            pressStyle,
            borderStyle,
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
          onClose={handleTooltipClose}
          zIndex={tooltipZIndex}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  wordContainer: {
    marginHorizontal: 1,
    marginVertical: LAYOUT.SPACING.TINY / 2,
    paddingHorizontal: 1,
    paddingVertical: 3,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    flexShrink: 0,
    flexGrow: 0,
    alignSelf: 'flex-start',
    maxWidth: 150,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: LAYOUT.BORDER.WIDTH.NORMAL + LAYOUT.BORDER.WIDTH.THIN,
  },
  textStyle: {
    paddingVertical: 0,
    marginBottom: 0,
    textAlign: 'right',
  },
});

export const ArabicWord = memo(ArabicWordComponent);
