import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentRef,
  type RefObject,
} from 'react';
import type { LayoutChangeEvent, LayoutRectangle, TextStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { useOpacityAnimation, usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useArabicWord, useArabicWordAnalysis } from '@/hooks/vocabulary';
import type { TextWeight } from '@/types/ui/text.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { getSelectedStyle } from '@/utils/textStyleUtils';

interface ArabicWordProps {
  word: SentenceWord;
  onTooltipOpen: (layout: LayoutRectangle) => void;
  position?: number;
  wordRef?: RefObject<ComponentRef<typeof Pressable>>;
  isHighlighted?: boolean;
  testID?: string;
}

function ArabicWordComponent({
  word,
  onTooltipOpen,
  position,
  wordRef,
  isHighlighted = false,
  testID,
}: ArabicWordProps) {
  const colors = useColors();
  const [absoluteLayout, setAbsoluteLayout] = useState<LayoutRectangle | null>(null);

  // Use our existing hook for word selection state
  const { isSelected } = useArabicWord({
    word,
    position,
  });

  // Use the new analysis hook for color-coding
  const { hasComponents, coloredSegments } = useArabicWordAnalysis(
    word.word_form,
    word.english || '',
    true // Always enabled for now
  );

  // Use opacity animation for border
  const { setOpacity: setBorderOpacity } = useOpacityAnimation({
    initialOpacity: isSelected ? 1 : 0,
    duration: TIMING_CONFIG.MEDIUM.duration,
  });

  // Press animation for clear visual feedback when tapping
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    type: 'button', // Scale-only feedback using WORD_PRESS_SCALE (0.95)
  });

  // Update border opacity when selection changes
  useEffect(() => {
    setBorderOpacity(isSelected ? 1 : 0);
  }, [isSelected, setBorderOpacity]);

  // Capture layout and measure absolute position
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const layoutRect = event.nativeEvent.layout;

      // Immediately set the relative layout as fallback
      setAbsoluteLayout(layoutRect);

      // Then try to get absolute coordinates asynchronously
      if (wordRef?.current) {
        // Small delay to ensure the layout is fully rendered
        setTimeout(() => {
          try {
            wordRef.current?.measureInWindow((x, y, width, height) => {
              if (x !== undefined && y !== undefined && width > 0 && height > 0) {
                setAbsoluteLayout({ x, y, width, height });
              }
            });
          } catch {
            // Ignore measurement errors - fallback to relative layout
          }
        }, 0);
      }
    },
    [wordRef]
  );

  // Pre-calculate text size once when component mounts (will never change)
  const calculatedFontSize = useMemo(
    () => LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    []
  );

  // Base text props for Arabic text
  const baseTextProps = useMemo(
    () => ({
      type: 'arabic' as const,
      skipDefaultColor: true, // We'll handle colors manually
      arabicFontSize: calculatedFontSize,
      weight: (isSelected ? 'semibold' : 'normal') as TextWeight,
      style: styles.textStyle as TextStyle,
    }),
    [isSelected, calculatedFontSize]
  );

  // Show tooltip on quick press with fade animation (manual trigger)
  const handlePress = useCallback(() => {
    // Open the tooltip immediately (no audio playback on word press)
    // Ensure we have fresh absolute coordinates
    if (wordRef?.current) {
      try {
        wordRef.current.measureInWindow((x, y, width, height) => {
          if (x !== undefined && y !== undefined && width > 0 && height > 0) {
            const freshLayout = { x, y, width, height };
            setAbsoluteLayout(freshLayout);
            onTooltipOpen(freshLayout);
          } else if (absoluteLayout) {
            // Fallback to existing layout
            onTooltipOpen(absoluteLayout);
          }
        });
      } catch {
        // Fallback to existing layout on error
        if (absoluteLayout) {
          onTooltipOpen(absoluteLayout);
        }
      }
    } else if (absoluteLayout) {
      onTooltipOpen(absoluteLayout);
    }
  }, [absoluteLayout, onTooltipOpen, wordRef]);

  // Compute final styles for the word container
  // Always reserve underline space to avoid layout jump by using a transparent baseline underline
  const baseUnderlineStyle = useMemo(
    () => ({ borderBottomWidth: 1, borderBottomColor: colors.transparent }),
    [colors.transparent]
  );

  // Highlight style when word is being played - subtle but visible
  const highlightStyle = useMemo(
    () => ({
      backgroundColor: isHighlighted
        ? `${colors.tint}33` // Clear 20% opacity sage green background
        : colors.transparent,
      // No border, padding, or font changes to prevent any visual shifts
    }),
    [isHighlighted, colors.transparent, colors.tint]
  );

  const containerStyle = useMemo(
    () => [
      styles.wordContainer,
      baseUnderlineStyle,
      getSelectedStyle(isSelected, colors.disabled), // Soft underline for all selected words
      highlightStyle,
    ],
    [isSelected, colors.disabled, baseUnderlineStyle, highlightStyle]
  );

  // Render colored segments or single word
  const renderWordContent = useMemo(() => {
    if (!hasComponents || coloredSegments.length <= 1) {
      // Single color word - use default Arabic text color
      return (
        <ThemedText
          {...baseTextProps}
          colorName="arabicText"
          style={[baseTextProps.style, { color: colors.arabicText }]}
        >
          {word.word_form}
        </ThemedText>
      );
    }

    // Multi-colored segments - render each with its own color
    return (
      <ThemedText {...baseTextProps}>
        {coloredSegments.map(segment => (
          <ThemedText
            key={`${segment.type}-${segment.text}-${segment.color}`}
            {...baseTextProps}
            style={[baseTextProps.style, { color: segment.color }]}
          >
            {segment.text}
          </ThemedText>
        ))}
      </ThemedText>
    );
  }, [hasComponents, coloredSegments, baseTextProps, colors.arabicText, word.word_form]);

  return (
    <Pressable
      ref={wordRef}
      style={containerStyle}
      testID={testID}
      onLayout={handleLayout}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[styles.wordView, animatedStyle]}>{renderWordContent}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  textStyle: {
    textAlign: 'center',
    paddingBottom: LAYOUT.SPACING.MICRO,
    marginBottom: -LAYOUT.SPACING.MICRO,
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
  // Check primitive values first for early return
  if (
    prevProps.word.id !== nextProps.word.id ||
    prevProps.position !== nextProps.position ||
    prevProps.isHighlighted !== nextProps.isHighlighted ||
    prevProps.testID !== nextProps.testID
  ) {
    return false;
  }

  // Check word properties that affect rendering
  if (
    prevProps.word.english !== nextProps.word.english ||
    prevProps.word.word_form !== nextProps.word.word_form ||
    prevProps.word.root_id !== nextProps.word.root_id
  ) {
    return false;
  }

  // Check stable references
  if (
    prevProps.onTooltipOpen !== nextProps.onTooltipOpen ||
    prevProps.wordRef !== nextProps.wordRef
  ) {
    return false;
  }

  return true;
});
