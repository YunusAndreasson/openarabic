import {
  useEffect,
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
import { useArabicWord } from '@/hooks/vocabulary';
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

export function ArabicWord({
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

  // Use pre-computed colored segments from data loading (optimized for performance)
  const coloredSegments = word.coloredSegments || [];
  const hasComponents = coloredSegments.length > 1;

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
  const handleLayout = (event: LayoutChangeEvent) => {
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
  };

  // Pre-calculate text size once when component mounts (will never change)
  const calculatedFontSize = LAYOUT.TYPOGRAPHY.SCALE.LARGE;

  // Base text props for Arabic text
  const baseTextProps = {
    type: 'arabic' as const,
    arabicFontSize: calculatedFontSize,
    weight: (isSelected ? 'semibold' : 'normal') as TextWeight,
    style: styles.textStyle as TextStyle,
  };

  // Show tooltip on quick press with fade animation (manual trigger)
  const handlePress = () => {
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
  };

  // Compute final styles for the word container
  // Always reserve underline space to avoid layout jump by using a transparent baseline underline
  const baseUnderlineStyle = { borderBottomWidth: 1, borderBottomColor: colors.transparent };

  // Highlight style when word is being played - subtle but visible
  const highlightStyle = {
    backgroundColor: isHighlighted
      ? `${colors.tint}33` // Clear 20% opacity sage green background
      : colors.transparent,
    // No border, padding, or font changes to prevent any visual shifts
  };

  const containerStyle = [
    styles.wordContainer,
    baseUnderlineStyle,
    getSelectedStyle(isSelected, colors.disabled), // Soft underline for all selected words
    highlightStyle,
  ];

  // Render colored segments or single word
  let renderWordContent;
  if (!hasComponents || coloredSegments.length <= 1) {
    // Single color word - use semantic color name for consistent theming
    renderWordContent = (
      <ThemedText
        {...baseTextProps}
        colorName="arabicText"
      >
        {word.word_form}
      </ThemedText>
    );
  } else {
    // Multi-colored segments - render each with its own explicit color
    renderWordContent = (
      <ThemedText {...baseTextProps} skipDefaultColor>
        {coloredSegments.map(segment => (
          <ThemedText
            key={`${segment.type}-${segment.text}-${segment.color}`}
            {...baseTextProps}
            skipDefaultColor
            style={[baseTextProps.style, { color: segment.color }]}
          >
            {segment.text}
          </ThemedText>
        ))}
      </ThemedText>
    );
  }

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

ArabicWord.displayName = 'ArabicWord';
