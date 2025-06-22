import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentRef,
  type RefObject,
} from 'react';
import type { LayoutChangeEvent, LayoutRectangle, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { DEFAULT_ANIMATION_DURATION, WORD_PRESS_SCALE } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { useOpacityAnimation, useTransformAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useArabicWord } from '@/hooks/vocabulary/useArabicWord';
import type { TextWeight } from '@/types/ui/text.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { selectionFeedback } from '@/utils/haptics';

import { WordTooltip } from './WordTooltip';

// Global counter for tooltip zIndex values with circular increment
const MIN_Z_INDEX = LAYOUT.Z_INDEX.TOOLTIP;
const MAX_Z_INDEX = 10000;
let tooltipZIndexCounter = MIN_Z_INDEX;

const getNextZIndex = () => {
  tooltipZIndexCounter = tooltipZIndexCounter >= MAX_Z_INDEX ? MIN_Z_INDEX : tooltipZIndexCounter;
  return tooltipZIndexCounter;
};

interface ArabicWordProps {
  word: SentenceWord;
  onPress: (word: SentenceWord) => void;
  position?: number;
  settings: {
    fontScale: number;
  };
  wordRef?: RefObject<ComponentRef<typeof TouchableOpacity>>;
  isDueWord?: boolean;
  testID?: string;
}

function ArabicWordComponent({
  word,
  onPress,
  position,
  settings,
  wordRef,
  isDueWord = false,
  testID,
}: ArabicWordProps) {
  const colors = useColors();
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [layout, setLayout] = useState<LayoutRectangle | null>(null);
  const [needsReverseAnimation, setNeedsReverseAnimation] = useState(false);
  const [tooltipZIndex, setTooltipZIndex] = useState<number>(0);

  // Use our new hook
  const { isSelected, setForceSelected, handleSelectionChange } = useArabicWord({
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
    targetValue: WORD_PRESS_SCALE,
    duration: DEFAULT_ANIMATION_DURATION,
  });

  // Use opacity animation for border
  const { setOpacity: setBorderOpacity } = useOpacityAnimation({
    initialOpacity: isSelected ? 1 : 0,
    duration: DEFAULT_ANIMATION_DURATION,
  });

  // Handle the animation reversal after a brief delay
  useEffect(() => {
    if (!needsReverseAnimation) return;

    const timer = setTimeout(() => {
      reversePressAnimation();
      setNeedsReverseAnimation(false);
    }, DEFAULT_ANIMATION_DURATION);

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

  // Capture layout on mount and when window resizes
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setLayout(event.nativeEvent.layout);
  }, []);

  // Pre-calculate text size once when component mounts (will never change)
  const calculatedFontSize = useMemo(() => settings.fontScale * 24, [settings.fontScale]);

  // More aggressively memoized text props (depends on selection and tooltip visibility)
  const textProps = useMemo(
    () => ({
      type: 'arabic' as const,
      variant: isSelected ? ('primary' as const) : undefined,
      skipDefaultColor: false,
      colorName: tooltipVisible ? ('tint' as const) : ('arabicText' as const),
      arabicFontSize: calculatedFontSize,
      weight: (isSelected ? 'semibold' : 'normal') as TextWeight,
      style: styles.textStyle as TextStyle,
    }),
    [isSelected, calculatedFontSize, tooltipVisible]
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
    selectionFeedback();

    // Execute the animation and selection separately
    startPressAnimation();

    // Schedule the reverse animation using state
    setNeedsReverseAnimation(true);

    // Set optimistic update to show selection immediately (this toggles selection)
    setForceSelected(!isSelected);

    // Then handle selection using the hook's handler
    handleSelectionChange();
  }, [handleSelectionChange, startPressAnimation, isSelected, setForceSelected]);

  const getSelectedStyle = useCallback(
    (): ViewStyle => ({
      borderBottomWidth: 1,
      borderBottomColor: isDueWord ? colors.wordDueUnderline : colors.wordSelectionUnderline,
    }),
    [colors.wordDueUnderline, colors.wordSelectionUnderline, isDueWord]
  );

  // Compute final styles for the word container
  const containerStyle = useMemo(
    () => [styles.wordContainer, isSelected && getSelectedStyle()],
    [isSelected, getSelectedStyle]
  );

  return (
    <Fragment>
      <TouchableOpacity
        ref={wordRef}
        activeOpacity={0.7}
        delayLongPress={250}
        style={containerStyle}
        testID={testID}
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
          arabicWord={word.word_form}
          wordId={word.id}
          visible={tooltipVisible}
          zIndex={tooltipZIndex}
          onClose={handleTooltipClose}
        />
      ) : null}
    </Fragment>
  );
}

const styles = StyleSheet.create({
  textStyle: {
    textAlign: 'center',
    paddingBottom: 2,
    marginBottom: -1,
  },
  wordContainer: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.MICRO,
  },
  wordView: {},
});

export const ArabicWord = memo(ArabicWordComponent, (prevProps, nextProps) => {
  return (
    prevProps.word.id === nextProps.word.id &&
    prevProps.settings.fontScale === nextProps.settings.fontScale &&
    prevProps.position === nextProps.position
  );
});
