import {
  memo,
  useEffect,
  useRef,
  type ComponentRef,
  type RefObject,
} from 'react';
import type { LayoutRectangle, TextStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useArabicWord } from '@/hooks/vocabulary';
import type { TextWeight } from '@/types/ui/text.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { getSelectedStyle } from '@/utils/textStyleUtils';

interface ArabicWordProps {
  word: SentenceWord;
  onTooltipOpen?: (word: SentenceWord, layout: LayoutRectangle) => void;
  position?: number;
  wordRef?: RefObject<ComponentRef<typeof Pressable>>;
  isHighlighted?: boolean;
  testID?: string;
}

const ArabicWordInternal = function ArabicWord({
  word,
  onTooltipOpen,
  position,
  wordRef,
  isHighlighted = false,
  testID,
}: ArabicWordProps) {
  const colors = useColors();

  // Prevent memory leaks from async callbacks on unmounted components
  const isMountedRef = useRef(true);

  // Use our existing hook for word selection state
  const { isSelected } = useArabicWord({
    word,
    position,
  });

  // Use pre-computed colored segments from data loading (optimized for performance)
  const coloredSegments = word.coloredSegments || [];
  const hasComponents = coloredSegments.length > 1;

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Base text props for Arabic text
  const baseTextProps = {
    type: 'arabic' as const,
    arabicFontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    weight: (isSelected ? 'semibold' : 'normal') as TextWeight,
    style: styles.textStyle as TextStyle,
  };

  // Show tooltip on press - always measure fresh for 100% reliability
  const handlePress = () => {
    if (!wordRef?.current || !onTooltipOpen) return;

    try {
      wordRef.current.measureInWindow((x, y, width, height) => {
        // Only call tooltip if component is still mounted and coordinates are valid
        if (
          isMountedRef.current &&
          x !== undefined &&
          y !== undefined &&
          width > 0 &&
          height > 0
        ) {
          onTooltipOpen(word, { x, y, width, height });
        }
      });
    } catch {
      // Ignore measurement errors - tooltip won't show on this tap
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
      onPress={handlePress}
    >
      {renderWordContent}
    </Pressable>
  );
};

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
});

ArabicWordInternal.displayName = 'ArabicWord';

export const ArabicWord = memo(ArabicWordInternal);
