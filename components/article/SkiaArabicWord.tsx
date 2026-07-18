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
import { buildColoredParagraph, buildSimpleParagraph } from '@/utils/skiaParagraphBuilder';
import { getSelectedStyle } from '@/utils/textStyleUtils';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Shared timing for tooltip fade animation (exported for WordTooltip)
export const WORD_TOOLTIP_ANIMATION_DURATION = 150;

// Extra vertical space for Arabic diacritics (shadda, tanwin) that extend above the line
const DIACRITICS_PADDING = 8;

/**
 * Horizontal ink bleed per font family, in em (fraction of font size).
 * Calligraphic fonts paint well beyond their glyph advances; without this
 * reserve the canvas clips edge glyphs and the paragraph can force-break
 * the word onto a hidden second line.
 */
const INK_BLEED_EM: Record<string, number> = {
  'Noto Sans Arabic': 0.08,
  'Digital Khatt New Madina': 0.3,
  Amiri: 0.3,
  'Scheherazade New': 0.3,
  'Noto Nastaliq Urdu': 0.35,
};
const DEFAULT_INK_BLEED_EM = 0.15;

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
        maxWidth: 2000, // Large width to prevent wrapping of single words
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
      maxWidth: 2000,
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
      return { width: 60, height: 40, layoutWidth: 60, bleedTrim: 0 };
    }

    const inkBleed = Math.ceil(fontSize * (INK_BLEED_EM[fontFamily] ?? DEFAULT_INK_BLEED_EM));
    // Visual breathing room between words stays at the pre-bleed rhythm (~5%
    // of the word width was baked into the old canvas sizing).
    const visualPad = Math.ceil(fontSize * 0.05);
    // Right-aligned RTL text hugs the layout right edge, so one bleed on the
    // layout width shifts the glyphs off the canvas edge and a second bleed
    // on the canvas width leaves room on the left.
    const layoutWidth = Math.ceil(paragraph.getMaxIntrinsicWidth()) + inkBleed;

    return {
      width: layoutWidth + inkBleed,
      height: Math.ceil(paragraph.getHeight()) + DIACRITICS_PADDING,
      layoutWidth,
      // Negative margin cancels the bleed in flex layout so word spacing
      // doesn't grow — the bleed exists for paint only, not for layout.
      bleedTrim: Math.max(0, inkBleed - visualPad),
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
    () =>
      canvasDimensions.bleedTrim > 0
        ? [styles.wordWrapper, { marginHorizontal: -canvasDimensions.bleedTrim }]
        : styles.wordWrapper,
    [canvasDimensions.bleedTrim],
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
