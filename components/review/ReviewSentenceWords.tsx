import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SkiaColoredArabic } from '@/components/common/SkiaColoredArabic';
import { getCompactArabicFontSize, LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useDebouncedArabicFontSize } from '@/hooks/theme/useDebouncedArabicFontSize';
import type { ReviewCard } from '@/services/firstReview';
import type { ExampleWord } from '@/services/sentences';
import type { ColoredSegment } from '@/types/vocabulary.types';
import type { ThemeColors } from '@/types/ui/theme.types';

type Word = Pick<ExampleWord, 'position' | 'wordForm'> & {
  coloredSegments?: Pick<ColoredSegment, 'text' | 'color'>[];
  isTarget?: boolean;
};

// The first-review journal stores colours by character offset. Whitespace in
// the original sentence defines the words, including on cards without runs.
function splitWords(sentence: string, runs: ReviewCard['segments'], colors: ThemeColors): Word[] {
  return Array.from(sentence.matchAll(/\S+/gu), ({ 0: wordForm, index: position }) => {
    const end = position + wordForm.length;
    // The journal writes one run per word segment, with separate space runs.
    const coloredSegments = runs
      ?.filter(run => run.offset >= position && run.offset < end)
      .map(run => ({
        text: run.text,
        color: run.role ? colors.grammar[run.role] : colors.arabicText,
      }));
    return { position, wordForm, coloredSegments };
  });
}

interface Props {
  sentence: string;
  words?: ExampleWord[];
  runs?: ReviewCard['segments'];
}

export function ReviewSentenceWords({ sentence, words, runs }: Props) {
  const colors = useColors();
  const readingSize = useDebouncedArabicFontSize(100);
  const size = getCompactArabicFontSize(readingSize || LAYOUT.TYPOGRAPHY.SCALE.LARGE);
  const [width, setWidth] = useState(0);
  const tokens = words?.length ? words : splitWords(sentence, runs, colors);
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLanguage="ar"
      accessibilityLabel={sentence}
      style={styles.row}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 &&
        tokens.map(word => (
          <View
            key={word.position}
            testID={`example-word-${word.position}`}
            style={styles.word}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <SkiaColoredArabic
              text={word.wordForm}
              segments={word.coloredSegments}
              fontSize={size}
              wordMaxWidth={width}
              reserveInk
            />
            {word.isTarget && (
              <View
                testID={`example-word-${word.position}-underline`}
                style={[styles.underline, { backgroundColor: colors.tint }]}
                pointerEvents="none"
              />
            )}
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'stretch',
    direction: 'ltr', // row-reverse always starts on the right, even in an RTL app.
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    columnGap: LAYOUT.SPACING.TINY + LAYOUT.SPACING.HALF_TINY,
    rowGap: LAYOUT.SPACING.HALF_TINY,
  },
  word: {
    flexShrink: 0,
    maxWidth: '100%',
    paddingBottom: LAYOUT.SPACING.TINY,
  },
  underline: {
    position: 'absolute',
    left: LAYOUT.SPACING.MICRO,
    right: LAYOUT.SPACING.MICRO,
    bottom: 0,
    height: LAYOUT.BORDER.WIDTH.FOCUSED,
  },
});
