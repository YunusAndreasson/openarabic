import { memo, useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { Canvas, Paragraph as SkiaParagraph, TextDirection } from 'react-native-skia';

import { useColors } from '@/hooks/theme/useColors';
import { useSkiaFonts } from '@/hooks/theme/useSkiaFonts';
import type { ColoredSegment } from '@/types/vocabulary.types';
import {
  PARAGRAPH_LAYOUT_WIDTH,
  buildColoredParagraph,
  buildSimpleParagraph,
  measureParagraphCanvas,
} from '@/utils/skiaParagraphBuilder';

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
 * that same path, without the tap/marker behaviour of `SkiaArabicWord`.
 */
const SkiaColoredArabicInternal = function SkiaColoredArabic({
  text,
  segments,
  fontSize: fontSizeOverride,
  color,
}: SkiaColoredArabicProps) {
  const colors = useColors();
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

  // A segment set that carries no grammar colour is the same picture as plain
  // text — build the cheaper single-run paragraph for it.
  const hasComponents =
    !!segments?.length &&
    segments.some(seg => seg.color !== colors.text && seg.color !== colors.arabicText);

  const paragraph = useMemo(() => {
    // Native ParagraphBuilder.Make requires a font provider — skip until the
    // shared manager finishes its one-time load.
    if (!fontManager) return null;

    // `hasComponents` is an aliased type guard, so it narrows `segments` here.
    if (hasComponents) {
      return buildColoredParagraph({
        segments,
        fontSize,
        fontFamily,
        fontManager,
        textDirection: TextDirection.RTL,
        maxWidth: PARAGRAPH_LAYOUT_WIDTH,
        letterSpacing: 0,
      });
    }

    return buildSimpleParagraph({
      text,
      fontSize,
      color: baseColor,
      fontFamily,
      fontManager,
      textDirection: TextDirection.RTL,
      maxWidth: PARAGRAPH_LAYOUT_WIDTH,
    });
  }, [hasComponents, segments, text, baseColor, fontSize, fontFamily, fontManager]);

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
