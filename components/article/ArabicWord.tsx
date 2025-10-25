import { memo, useEffect, useRef, type ComponentRef, type RefObject } from 'react';
import type { LayoutRectangle, TextStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useArabicWord } from '@/hooks/vocabulary';
import type { TextWeight } from '@/types/ui/text.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';
import { generateColorCodedSegments } from '@/utils/colorCodedTextUtils';
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

  // Check if word has colored components (not just multiple segments)
  // A word can have components even with only 1 segment if that segment is colored
  const hasComponents =
    coloredSegments.length > 0 &&
    coloredSegments.some(seg => seg.color !== colors.text && seg.color !== colors.arabicText);

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
        if (isMountedRef.current && x !== undefined && y !== undefined && width > 0 && height > 0) {
          onTooltipOpen(word, { x, y, width, height });
        }
      });
    } catch {
      // Ignore measurement errors - tooltip won't show on this tap
    }
  };

  // Debug logging: Long press any word to see detailed analysis in console
  const handleLongPress = () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🐛 WORD DEBUG (Long Press)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Word:', word.word_form, '→', word.english);
    console.log('🆔 IDs:', `word=${word.id} root=${word.root_id} pos=${position}`);
    console.log(
      '🎨 Components:',
      `hasComponents=${hasComponents} segments=${coloredSegments.length}`,
    );
    console.log('📊 Arabic Segments:', JSON.stringify(coloredSegments, null, 2));

    // Compute English colored segments for debugging
    try {
      const analysis = analyzeArabicWord(word.word_form, word.english || '');
      const formatted = formatWordAnalysis(analysis);

      const englishSegments = generateColorCodedSegments({
        text: word.english || '',
        formattedAnalysis: formatted,
        analysis,
        colors,
        defaultColor: colors.text,
      });

      console.log(
        '📝 English Segments:',
        JSON.stringify(
          englishSegments.map(s => ({ text: s.text, color: s.color })),
          null,
          2,
        ),
      );

      console.log(
        '🔍 Analysis Details:',
        JSON.stringify(
          {
            hasComponents: analysis.hasComponents,
            prefixes: analysis.prefixes.map(p => ({
              arabic: p.arabicMatch,
              english: p.englishMatches,
              role: p.role,
            })),
            suffix: analysis.suffix
              ? {
                  arabic: analysis.suffix.arabicMatch,
                  english: analysis.suffix.englishMatches,
                  role: analysis.suffix.role,
                }
              : null,
            infix: analysis.infix
              ? {
                  arabic: analysis.infix.arabicMatch,
                  english: analysis.infix.englishMatches,
                }
              : null,
            remainingArabic: analysis.remainingArabic,
            remainingEnglish: analysis.remainingEnglish,
          },
          null,
          2,
        ),
      );
    } catch (error) {
      console.log('⚠️ English coloring analysis failed:', error);
    }

    console.log('🎯 State:', `selected=${isSelected} highlighted=${isHighlighted}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  };

  // Word container styles - transparent underline reserves space to prevent layout jumps
  const baseUnderlineStyle = { borderBottomWidth: 1, borderBottomColor: colors.transparent };

  // Subtle highlight when word is being played (20% opacity)
  const highlightStyle = {
    backgroundColor: isHighlighted ? `${colors.tint}33` : colors.transparent,
  };

  const containerStyle = [
    styles.wordContainer,
    baseUnderlineStyle,
    getSelectedStyle(isSelected, colors.disabled),
    highlightStyle,
  ];

  // Render word with colored segments or default color
  let renderWordContent;
  if (!hasComponents) {
    renderWordContent = (
      <ThemedText {...baseTextProps} colorName="arabicText">
        {word.word_form}
      </ThemedText>
    );
  } else {
    // Render segments with grammar colors (handles single or multiple segments)
    renderWordContent = (
      <ThemedText {...baseTextProps} skipDefaultColor>
        {/* Index required: segments can have duplicate type-text (e.g., multiple "prefix-وَ") */}
        {/* coloredSegments are computed once and stable, so index is safe */}
        {coloredSegments.map((segment, index) => (
          <ThemedText
            // eslint-disable-next-line react/no-array-index-key
            key={`${index}-${segment.type}-${segment.text}`}
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
      onLongPress={handleLongPress}
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
