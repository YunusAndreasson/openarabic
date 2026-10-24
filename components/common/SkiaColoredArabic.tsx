import { memo, useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { Canvas, Paragraph as SkiaParagraph } from 'react-native-skia';

import { ThemedText } from '@/components/primitives/ThemedText';
import { LINE_HEIGHT_MULTIPLIERS } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useSkiaFonts } from '@/hooks/theme/useSkiaFonts';
import { useSkiaGpuAvailable } from '@/hooks/theme/useSkiaGpuAvailable';
import type { ColoredSegment } from '@/types/vocabulary.types';
import { buildWordParagraph, measureParagraphCanvas } from '@/utils/skiaParagraphBuilder';

interface SkiaColoredArabicProps {
  /** The full word or phrase, used when there is nothing to colour. */
  text: string;
  /** Per-component colours; when empty the whole string paints in `color`. */
  segments?: ColoredSegment[];
  /** Point size for the glyphs. Defaults to the user's Arabic reading size. */
  fontSize?: number;
  /** Colour for text with no coloured components. Defaults to `arabicText`. */
  color?: string;
}

/**
 * Arabic rendered through Skia so the script actually joins.
 *
 * A React Native `<Text>` cannot carry per-component colour on Arabic: each
 * nested `<Text>` becomes its own metric-affecting span, and Android's
 * `StaticLayout` shapes every span as a separate run. Cursive joining stops at
 * each boundary, so a coloured word came out as disconnected pieces with its
 * final harakah orphaned — `يَقُولُ` painted as `يَ  قُول  ُ`.
 *
 * Skia shapes the whole string first and applies the colour runs to the shaped
 * glyphs, which is why the article body has always rendered correctly. This is
 * that same path, without the tap/marker behaviour of `SkiaSentenceWords`.
 */
const SkiaColoredArabicInternal = function SkiaColoredArabic({
  text,
  segments,
  fontSize: fontSizeOverride,
  color,
}: SkiaColoredArabicProps) {
  const colors = useColors();
  const gpuAvailable = useSkiaGpuAvailable();
  const { fontSize: readingFontSize, fontFamily, fontManager } = useSkiaFonts();
  // Skia sizes glyphs in raw pixels, so it is the one text path in the app that
  // ignores the OS "Larger Text" setting — nothing here passes
  // `allowFontScaling={false}`, so every `ThemedText` around it grows and the
  // Arabic alone stays put. On the word card that reads as the headword being
  // too small beside its own gloss, which is the complaint that found this.
  //
  // `useWindowDimensions` rather than `PixelRatio.getFontScale()`: the former is
  // reactive, so changing the system setting resizes the word instead of waiting
  // for a remount.
  //
  // A no-op at the default scale of 1.
  const { fontScale } = useWindowDimensions();
  const fontSize = Math.round((fontSizeOverride ?? readingFontSize) * fontScale);
  const baseColor = color ?? colors.arabicText;

  // The reader's own builder: grammar-coloured when a segment carries a
  // colour, one run in `baseColor` otherwise. Null until the shared font
  // manager finishes its one-time load (native ParagraphBuilder.Make requires
  // a font provider).
  const paragraph = useMemo(
    () =>
      buildWordParagraph({
        word: { word_form: text, coloredSegments: segments },
        colors,
        plainColor: baseColor,
        fontSize,
        fontFamily,
        fontManager,
      }),
    [segments, text, colors, baseColor, fontSize, fontFamily, fontManager],
  );

  const canvas = useMemo(
    () => measureParagraphCanvas(paragraph, { fontSize, fontFamily }),
    [paragraph, fontSize, fontFamily],
  );

  // The ink reserve is paint-only, so cancel it in flex layout: the component's
  // layout box is the glyph advance, and callers space words with their own gap
  // rather than inheriting however much the chosen face happens to bleed.
  const canvasStyle = useMemo(
    () => ({
      width: canvas.width,
      height: canvas.height,
      marginLeft: -canvas.inkLeft,
      marginRight: -canvas.inkRight,
    }),
    [canvas.width, canvas.height, canvas.inkLeft, canvas.inkRight],
  );

  // No GPU, so a canvas would stay blank. One Text in one colour: a single
  // span is a single shaping run, so the word still joins. It loses the
  // grammar colours, not the Arabic. Text applies the OS font scale itself.
  if (!gpuAvailable) {
    const fallbackStyle = fontSizeOverride
      ? {
          color: baseColor,
          fontSize: fontSizeOverride,
          lineHeight: Math.round(fontSizeOverride * LINE_HEIGHT_MULTIPLIERS.ARABIC),
        }
      : { color: baseColor };
    return (
      <ThemedText type="arabic" style={fallbackStyle} accessibilityLanguage="ar">
        {text}
      </ThemedText>
    );
  }

  // Nothing to paint yet: hold the height so the surrounding layout does not
  // jump when the fonts land a frame later.
  if (!paragraph) {
    return (
      <View style={canvasStyle} accessible accessibilityRole="text" accessibilityLabel={text} />
    );
  }

  return (
    <Canvas style={canvasStyle} accessible accessibilityRole="text" accessibilityLabel={text}>
      <SkiaParagraph paragraph={paragraph} x={0} y={canvas.paintY} width={canvas.layoutWidth} />
    </Canvas>
  );
};

SkiaColoredArabicInternal.displayName = 'SkiaColoredArabic';

export const SkiaColoredArabic = memo(SkiaColoredArabicInternal);
