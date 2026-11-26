import { Fragment, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Canvas, Group, Paragraph, Rect } from 'react-native-skia';

import { ThemedText } from '@/components/primitives/ThemedText';
import { getCompactArabicFontSize, LAYOUT, LINE_HEIGHT_MULTIPLIERS } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useDebouncedArabicFontSize } from '@/hooks/theme/useDebouncedArabicFontSize';
import { useSkiaFonts } from '@/hooks/theme/useSkiaFonts';
import { useSkiaGpuAvailable } from '@/hooks/theme/useSkiaGpuAvailable';
import type { ReviewCard } from '@/services/firstReview';
import type { ExampleWord } from '@/services/sentences';
import type { ColoredSegment } from '@/types/vocabulary.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import { layoutSentenceWords } from '@/utils/sentenceWordLayout';
import { buildWordParagraph, measureParagraphCanvas } from '@/utils/skiaParagraphBuilder';

const COLUMN_GAP = LAYOUT.SPACING.TINY + LAYOUT.SPACING.HALF_TINY;
const ROW_GAP = LAYOUT.SPACING.HALF_TINY;
const UNDERLINE_INSET = LAYOUT.SPACING.MICRO;
const UNDERLINE_HEIGHT = LAYOUT.BORDER.WIDTH.FOCUSED;

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
  const gpuAvailable = useSkiaGpuAvailable();
  const { fontFamily, fontManager } = useSkiaFonts();
  const { fontScale } = useWindowDimensions();
  const readingSize = useDebouncedArabicFontSize(100);
  const size = getCompactArabicFontSize(readingSize || LAYOUT.TYPOGRAPHY.SCALE.LARGE);
  const fontSize = Math.round(size * fontScale);
  const [width, setWidth] = useState(0);
  const tokens = words?.length ? words : splitWords(sentence, runs, colors);
  // Share one GPU surface across the example. Each word still shapes with its
  // own colours and ink reserve, and the rows use the original centred wrap.
  const painted =
    gpuAvailable && fontManager && width > 0
      ? tokens.map(word => {
          const paragraph = buildWordParagraph({
            word: { word_form: word.wordForm, coloredSegments: word.coloredSegments },
            colors,
            fontSize,
            fontFamily,
            fontManager,
          });
          const canvas = measureParagraphCanvas(paragraph, { fontSize, fontFamily });
          const scale = Math.min(1, width / canvas.width);
          return {
            word,
            paragraph,
            canvas,
            scale,
            outerWidth: canvas.width * scale,
            height: canvas.height * scale + LAYOUT.SPACING.TINY,
            marginLeft: 0,
          };
        })
      : [];
  const layout =
    painted.length && painted.every(word => word.paragraph)
      ? layoutSentenceWords(painted, width, COLUMN_GAP, { centered: true, rowGap: ROW_GAP })
      : null;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLanguage="ar"
      accessibilityLabel={sentence}
      style={[styles.container, !layout && styles.row]}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
    >
      {layout ? (
        <Canvas style={{ width, height: layout.height }} pointerEvents="none">
          {painted.map(({ word, paragraph, canvas, scale, height, outerWidth }, index) => {
            const box = layout.words[index];
            if (!box || !paragraph) return null;
            return (
              <Fragment key={word.position}>
                <Group transform={[{ translateX: box.x }, { translateY: box.y }, { scale }]}>
                  <Paragraph
                    paragraph={paragraph}
                    x={0}
                    y={canvas.paintY}
                    width={canvas.layoutWidth}
                  />
                </Group>
                {word.isTarget && (
                  <Rect
                    x={box.x + UNDERLINE_INSET}
                    y={box.y + height - UNDERLINE_HEIGHT}
                    width={Math.max(0, outerWidth - 2 * UNDERLINE_INSET)}
                    height={UNDERLINE_HEIGHT}
                    color={colors.tint}
                  />
                )}
              </Fragment>
            );
          })}
        </Canvas>
      ) : (
        width > 0 &&
        tokens.map(word => (
          <View
            key={word.position}
            style={styles.word}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <ThemedText
              type="arabic"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                fontSize: size,
                lineHeight: Math.round(size * LINE_HEIGHT_MULTIPLIERS.ARABIC),
                maxWidth: width,
              }}
            >
              {word.wordForm}
            </ThemedText>
            {word.isTarget && <View style={[styles.underline, { backgroundColor: colors.tint }]} />}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
  },
  row: {
    direction: 'ltr', // row-reverse always starts on the right, even in an RTL app.
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    columnGap: COLUMN_GAP,
    rowGap: ROW_GAP,
  },
  word: {
    flexShrink: 0,
    maxWidth: '100%',
    paddingBottom: LAYOUT.SPACING.TINY,
  },
  underline: {
    position: 'absolute',
    left: UNDERLINE_INSET,
    right: UNDERLINE_INSET,
    bottom: 0,
    height: UNDERLINE_HEIGHT,
  },
});
