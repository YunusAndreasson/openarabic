import { memo, useEffect, useMemo, useRef, type ComponentRef, type RefObject } from 'react';
import type { LayoutRectangle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { Pressable } from 'react-native-gesture-handler';
import { Canvas, Paragraph as SkiaParagraph, TextDirection } from '@shopify/react-native-skia';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useSkiaFonts } from '@/hooks/theme/useSkiaFonts';
import { useArabicWord } from '@/hooks/vocabulary';
import type { ReanimatedCSSAnimationStyle } from '@/types/ui/base.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import {
  PARAGRAPH_LAYOUT_WIDTH,
  buildColoredParagraph,
  buildSimpleParagraph,
  measureParagraphCanvas,
} from '@/utils/skiaParagraphBuilder';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Clear space between the deepest descender and the marker rule.
 *
 * Sits below the descender reserve `measureParagraphCanvas` returns, so the rule
 * clears the real ink rather than the line box — which is why it used to cross
 * the tails on every face but Noto Sans.
 *
 * Arabic descends a long way below the baseline (ن, ج, ي), and a rule drawn
 * flush against that tail crowds the harf and hurts legibility. Reserving the
 * space inside the canvas keeps the rule clear of the descenders while staying
 * within the word's own bounds, which a negative offset would not — Android
 * clips absolutely positioned children that overflow their parent.
 */
const MARKER_UNDERLINE_GAP = 6;

// Long-press threshold: long enough not to fire during scroll hesitation,
// short enough to feel instant (RNGH default is 500ms)
const LONG_PRESS_DELAY_MS = 400;

// Module-level constant — no per-render allocation
const HIGHLIGHT_ANIMATION_STYLE = {
  animationName: {
    '0%': { opacity: LAYOUT.OPACITY.SUBTLE },
    '100%': { opacity: LAYOUT.OPACITY.FULL },
  },
  animationDuration: '800ms',
  animationIterationCount: 'infinite' as const,
  animationDirection: 'alternate' as const,
  animationTimingFunction: 'ease-in-out',
} as ReanimatedCSSAnimationStyle;

interface SkiaArabicWordProps {
  word: SentenceWord;
  onTooltipOpen?: (word: SentenceWord, layout: LayoutRectangle) => void;
  /** Long-press: instant save to practice (toggle) */
  onWordLongPress?: (word: SentenceWord, layout?: LayoutRectangle) => void;
  wordRef?: RefObject<ComponentRef<typeof Pressable>>;
  testID?: string;
  /** When true, pulses the marker underline to draw attention (used for tutorial) */
  isHighlighted?: boolean;
  /** SharedValue tracking the active word ID — drives opacity on UI thread without re-renders */
  activeWordIdSV?: SharedValue<string | number | null>;
  /** When true, marks this as the looked-up word (used for dictionary sentence examples) */
  isTargetWord?: boolean;
}

const SkiaArabicWordInternal = function SkiaArabicWord({
  word,
  onTooltipOpen,
  onWordLongPress,
  wordRef,
  testID,
  isHighlighted = false,
  activeWordIdSV,
  isTargetWord = false,
}: SkiaArabicWordProps) {
  const colors = useColors();
  const { fontSize, fontFamily, fontManager } = useSkiaFonts();

  // Prevent memory leaks from async callbacks on unmounted components
  const isMountedRef = useRef(true);

  // Fallback ref so the word can measure itself when the parent doesn't pass one
  const internalWordRef = useRef<ComponentRef<typeof Pressable>>(null);
  const pressableRef = wordRef ?? internalWordRef;

  // Active word opacity — derived from SharedValue on UI thread, no React re-renders
  const wordId = word.id;
  const activeStyle = useAnimatedStyle(() => {
    'worklet';
    const isActive = activeWordIdSV?.get() === wordId;
    return { opacity: isActive ? LAYOUT.OPACITY.HIGH : LAYOUT.OPACITY.FULL };
  });

  // Use our existing hook for word selection state
  const { isSelected } = useArabicWord({ word });

  // Use pre-computed colored segments from data loading (optimized for performance)
  const coloredSegments = word.coloredSegments || [];

  // Check if word has colored components (not just multiple segments)
  const hasComponents =
    coloredSegments.length > 0 &&
    coloredSegments.some(seg => seg.color !== colors.text && seg.color !== colors.arabicText);

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Build Skia paragraph based on whether word has colored components
  const paragraph = useMemo(() => {
    // Native ParagraphBuilder.Make requires a font provider — skip until the
    // shared manager finishes its one-time load (words fill in a frame later).
    if (!fontManager) {
      return null;
    }

    // Selection is never carried by the glyph color: repainting a saved word in
    // the brand tint both shouted and overwrote the grammar colors it covered.
    // The marker underline below is the only channel that says "saved".
    const baseColor = colors.arabicText;

    if (hasComponents && coloredSegments.length > 0) {
      // Build multi-colored paragraph from segments
      return buildColoredParagraph({
        segments: coloredSegments,
        fontSize,
        fontFamily,
        fontManager,
        textDirection: TextDirection.RTL,
        maxWidth: PARAGRAPH_LAYOUT_WIDTH,
        letterSpacing: 0,
      });
    }

    // Build simple single-color paragraph
    return buildSimpleParagraph({
      text: word.word_form,
      fontSize,
      color: baseColor,
      fontFamily,
      fontManager,
      textDirection: TextDirection.RTL,
      maxWidth: PARAGRAPH_LAYOUT_WIDTH,
    });
  }, [
    hasComponents,
    coloredSegments,
    word.word_form,
    colors.arabicText,
    fontSize,
    fontFamily,
    fontManager,
  ]);

  const canvasDimensions = useMemo(() => {
    // `MARKER_UNDERLINE_GAP` keeps the rule clear of the descenders while
    // staying inside the word's own bounds.
    const canvas = measureParagraphCanvas(paragraph, {
      fontSize,
      fontFamily,
      bottomGap: MARKER_UNDERLINE_GAP,
    });

    // Visual breathing room between words stays at the pre-bleed rhythm (~5%
    // of the word width was baked into the old canvas sizing).
    const visualPad = Math.ceil(fontSize * 0.05);

    return {
      ...canvas,
      // The reserve is paint-only, so cancel all of it in flex layout and hand
      // back a constant `visualPad` gap instead. That keeps the word rhythm
      // identical whatever the face bleeds — a heavily-bleeding Amiri glyph and
      // a flush Noto one both lay out at advance + 2 * visualPad. These stay
      // signed: a face that bleeds less than visualPad needs positive margin.
      marginLeft: visualPad - canvas.inkLeft,
      marginRight: visualPad - canvas.inkRight,
    };
  }, [paragraph, fontSize, fontFamily]);

  // Show tooltip on press - always measure fresh for 100% reliability
  const handlePress = () => {
    if (!pressableRef.current || !onTooltipOpen) return;

    try {
      pressableRef.current.measureInWindow((x, y, width, height) => {
        // Only call tooltip if component is still mounted and coordinates are valid
        if (isMountedRef.current && x !== undefined && y !== undefined && width > 0 && height > 0) {
          onTooltipOpen(word, { x, y, width, height });
        }
      });
    } catch {
      // Ignore measurement errors - tooltip won't show on this tap
    }
  };

  // Long-press: instant save. Measured layout is only needed for the
  // no-root fallback (tooltip mode), so measurement failure still saves.
  const handleLongPress = () => {
    if (!onWordLongPress) return;

    try {
      pressableRef.current?.measureInWindow((x, y, width, height) => {
        if (!isMountedRef.current) return;
        const layout =
          x !== undefined && y !== undefined && width > 0 && height > 0
            ? { x, y, width, height }
            : undefined;
        onWordLongPress(word, layout);
      });
    } catch {
      onWordLongPress(word, undefined);
    }
  };

  // All three "this word is notable" states share one visual channel — a thin
  // rule under the word — and differ only in weight and motion. Ranking them
  // into a single height also makes them mutually exclusive, so a saved word
  // that is also the dictionary target draws one line, never a doubled one.
  //
  // The rule is painted, not a `borderBottomWidth`: `wordContainer` is rounded,
  // and Android draws a bottom-only border on a rounded box as a degenerate arc
  // across the corner radius — which is why the old selected-word underline
  // never actually appeared there.
  const markerHeight = useMemo(() => {
    if (isHighlighted || isTargetWord) {
      return LAYOUT.BORDER.WIDTH.FOCUSED;
    }
    return isSelected ? LAYOUT.BORDER.WIDTH.NORMAL : 0;
  }, [isHighlighted, isTargetWord, isSelected]);

  // Absolutely positioned so weight can change without taking part in layout —
  // the emphasis can never nudge the line's rhythm. It sits at the foot of the
  // canvas, inside the space `MARKER_UNDERLINE_GAP` reserves.
  const markerBarStyle = useMemo(
    () => [
      styles.markerUnderline,
      {
        height: markerHeight,
        backgroundColor: colors.tint,
        left: LAYOUT.SPACING.MICRO + canvasDimensions.inkLeft,
        right: LAYOUT.SPACING.MICRO + canvasDimensions.inkRight,
      },
    ],
    [markerHeight, colors.tint, canvasDimensions.inkLeft, canvasDimensions.inkRight],
  );

  const canvasStyle = useMemo(
    () => ({ width: canvasDimensions.width, height: canvasDimensions.height }),
    [canvasDimensions.width, canvasDimensions.height],
  );

  const wrapperStyle = useMemo(
    () => [
      styles.wordWrapper,
      { marginLeft: canvasDimensions.marginLeft, marginRight: canvasDimensions.marginRight },
    ],
    [canvasDimensions.marginLeft, canvasDimensions.marginRight],
  );

  return (
    <View style={wrapperStyle}>
      <AnimatedPressable
        ref={pressableRef}
        style={[CONTAINER_STYLE, activeStyle]}
        testID={testID}
        onPress={handlePress}
        onLongPress={onWordLongPress ? handleLongPress : undefined}
        delayLongPress={LONG_PRESS_DELAY_MS}
      >
        <Canvas style={canvasStyle} pointerEvents="none">
          {paragraph && (
            <SkiaParagraph
              paragraph={paragraph}
              x={0}
              y={canvasDimensions.paintY}
              width={canvasDimensions.layoutWidth}
            />
          )}
        </Canvas>
      </AnimatedPressable>
      {/* Drawn last so the rule stays visible over the canvas edge; never
          interactive, or it would eat taps along the bottom of the word.
          Withheld until there is a word to mark: the paragraph lands a frame
          after mount, and a rule drawn against the placeholder box painted a
          stray line across whatever the reflow then moved out from under it —
          most visibly the English translation above. */}
      {markerHeight > 0 &&
        paragraph &&
        (isHighlighted ? (
          <Animated.View style={[markerBarStyle, HIGHLIGHT_ANIMATION_STYLE]} pointerEvents="none" />
        ) : (
          <View style={markerBarStyle} pointerEvents="none" />
        ))}
    </View>
  );
};

const styles = StyleSheet.create({
  markerUnderline: {
    bottom: 0,
    position: 'absolute',
  },
  wordContainer: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.MICRO,
  },
  wordWrapper: {
    position: 'relative',
  },
});

// Identical for every word in every state, so it is hoisted to a stable identity
// rather than rebuilt per render.
const CONTAINER_STYLE = [styles.wordContainer];

SkiaArabicWordInternal.displayName = 'SkiaArabicWord';

export const SkiaArabicWord = memo(SkiaArabicWordInternal);
