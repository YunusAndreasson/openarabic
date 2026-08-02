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
  measureInkOverhang,
} from '@/utils/skiaParagraphBuilder';
import { getSelectedStyle } from '@/utils/textStyleUtils';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Extra vertical space for Arabic diacritics (shadda, tanwin) above the line.
 *
 * Deliberately a constant, not a per-word measurement like the horizontal ink
 * bleed: `forceStrutHeight` makes `getHeight()` identical for every word at a
 * given font size, so a fixed paint offset keeps every baseline in a sentence
 * on the same line. Deriving this per word would shift baselines word by word.
 */
const DIACRITICS_PADDING = 8;

/**
 * Fallback horizontal ink bleed per font family, in em (fraction of font size).
 * Calligraphic fonts paint well beyond their glyph advances; without this
 * reserve the canvas clips edge glyphs and the paragraph can force-break
 * the word onto a hidden second line.
 *
 * Only used when the native module can't measure the real bleed — see
 * `measureInkOverhang`, which supersedes these estimates on Skia >= 2.8.0.
 */
const INK_BLEED_EM: Record<string, number> = {
  'Noto Sans Arabic': 0.08,
  'Digital Khatt New Madina': 0.3,
  Amiri: 0.3,
  'Scheherazade New': 0.3,
  'Noto Nastaliq Urdu': 0.35,
};
const DEFAULT_INK_BLEED_EM = 0.15;

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
  /** When true, shows a pulsing highlight to draw attention (used for tutorial) */
  isHighlighted?: boolean;
  /** SharedValue tracking the active word ID — drives opacity on UI thread without re-renders */
  activeWordIdSV?: SharedValue<string | number | null>;
  /** When true, shows a subtle tint background to mark this as the target word (used for dictionary sentence examples) */
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

    // Selected (study-list/due) words shift subtly to the brand tint instead of a
    // weight change; grammar-colored segments keep their educational colors.
    const baseColor = isSelected ? colors.tint : colors.arabicText;

    if (hasComponents && coloredSegments.length > 0) {
      const segments = isSelected
        ? coloredSegments.map(segment =>
            segment.color === colors.text || segment.color === colors.arabicText
              ? { ...segment, color: baseColor }
              : segment,
          )
        : coloredSegments;

      // Build multi-colored paragraph from segments
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
    isSelected,
    hasComponents,
    coloredSegments,
    word.word_form,
    colors.tint,
    colors.arabicText,
    colors.text,
    fontSize,
    fontFamily,
    fontManager,
  ]);

  const canvasDimensions = useMemo(() => {
    if (!paragraph) {
      return { width: 60, height: 40, layoutWidth: 60, marginLeft: 0, marginRight: 0 };
    }

    // Real painted extent where the native module can report it, per-family
    // estimate everywhere else. Measuring also sizes fonts absent from the map.
    const overhang = measureInkOverhang(paragraph, PARAGRAPH_LAYOUT_WIDTH);
    const estimate = Math.ceil(fontSize * (INK_BLEED_EM[fontFamily] ?? DEFAULT_INK_BLEED_EM));
    const leftReserve = overhang ? Math.ceil(overhang.left) : estimate;
    const rightReserve = overhang ? Math.ceil(overhang.right) : estimate;

    // Visual breathing room between words stays at the pre-bleed rhythm (~5%
    // of the word width was baked into the old canvas sizing).
    const visualPad = Math.ceil(fontSize * 0.05);
    // Right-aligned RTL text hugs the layout right edge, so the left reserve
    // has to widen the layout box itself while the right reserve only widens
    // the canvas around it.
    const layoutWidth = Math.ceil(paragraph.getMaxIntrinsicWidth()) + leftReserve;

    return {
      width: layoutWidth + rightReserve,
      height: Math.ceil(paragraph.getHeight()) + DIACRITICS_PADDING,
      layoutWidth,
      // The reserve is paint-only, so cancel all of it in flex layout and hand
      // back a constant `visualPad` gap instead. That keeps the word rhythm
      // identical whatever the face bleeds — a heavily-bleeding Amiri glyph and
      // a flush Noto one both lay out at advance + 2 * visualPad. These stay
      // signed: a face that bleeds less than visualPad needs positive margin.
      marginLeft: visualPad - leftReserve,
      marginRight: visualPad - rightReserve,
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

  // Memoize styles that depend on state to prevent recreation
  const containerStyle = useMemo(
    () => [
      styles.wordContainer,
      styles.underlineReserve,
      getSelectedStyle(isSelected, colors.disabled),
    ],
    [isSelected, colors.disabled],
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
      {/* Pulsing highlight for tutorial */}
      {isHighlighted && (
        <Animated.View
          style={[
            styles.highlightOverlay,
            { backgroundColor: colors.tint },
            HIGHLIGHT_ANIMATION_STYLE,
          ]}
        />
      )}
      {/* Static subtle highlight for target word in sentence examples */}
      {isTargetWord && !isHighlighted && (
        <View style={[styles.targetWordOverlay, { backgroundColor: colors.tint }]} />
      )}
      <AnimatedPressable
        ref={pressableRef}
        style={[containerStyle, activeStyle]}
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
              y={DIACRITICS_PADDING}
              width={canvasDimensions.layoutWidth}
            />
          )}
        </Canvas>
      </AnimatedPressable>
    </View>
  );
};

const styles = StyleSheet.create({
  highlightOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  targetWordOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    opacity: 0.2, // Subtle tint for target word indication
  },
  underlineReserve: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 1,
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

SkiaArabicWordInternal.displayName = 'SkiaArabicWord';

export const SkiaArabicWord = memo(SkiaArabicWordInternal);
