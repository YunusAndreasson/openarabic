import { memo, useEffect, useMemo, useRef, type ComponentRef, type RefObject } from 'react';
import type { LayoutRectangle, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { Pressable } from 'react-native-gesture-handler';
import { Canvas, Paragraph as SkiaParagraph, TextDirection } from '@shopify/react-native-skia';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useSkiaFonts } from '@/hooks/theme/useSkiaFonts';
import { useArabicWord } from '@/hooks/vocabulary';
import type { SentenceWord } from '@/types/vocabulary.types';
import { buildColoredParagraph, buildSimpleParagraph } from '@/utils/skiaParagraphBuilder';
import { getSelectedStyle } from '@/utils/textStyleUtils';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Shared timing for tooltip fade animation (exported for WordTooltip)
export const WORD_TOOLTIP_ANIMATION_DURATION = 150;

// Module-level constant — no per-render allocation
// Type assertion needed: Reanimated v4 CSS animations aren't in ViewStyle
const HIGHLIGHT_ANIMATION_STYLE = {
  animationName: {
    '0%': { opacity: LAYOUT.OPACITY.SUBTLE },
    '100%': { opacity: LAYOUT.OPACITY.FULL },
  },
  animationDuration: '800ms',
  animationIterationCount: 'infinite' as const,
  animationDirection: 'alternate' as const,
  animationTimingFunction: 'ease-in-out',
} as unknown as ViewStyle;

interface SkiaArabicWordProps {
  word: SentenceWord;
  onTooltipOpen?: (word: SentenceWord, layout: LayoutRectangle) => void;
  wordRef?: RefObject<ComponentRef<typeof Pressable>>;
  testID?: string;
  /** When true, shows a pulsing highlight to draw attention (used for tutorial) */
  isHighlighted?: boolean;
  /** When true, shows a static highlight indicating word is active (shown in tooltip) */
  isActive?: boolean;
  /** When true, shows a subtle tint background to mark this as the target word (used for dictionary sentence examples) */
  isTargetWord?: boolean;
}

const SkiaArabicWordInternal = function SkiaArabicWord({
  word,
  onTooltipOpen,
  wordRef,
  testID,
  isHighlighted = false,
  isActive = false,
  isTargetWord = false,
}: SkiaArabicWordProps) {
  const colors = useColors();
  const { getArabicFont, fontFamily, fontManager } = useSkiaFonts();

  // Prevent memory leaks from async callbacks on unmounted components
  const isMountedRef = useRef(true);

  // Active word opacity — useAnimatedStyle required because AnimatedPressable
  // (RNGestureHandlerButton) doesn't support CSS transitions
  const activeStyle = useAnimatedStyle(
    () => ({
      opacity: isActive ? LAYOUT.OPACITY.HIGH : LAYOUT.OPACITY.FULL,
    }),
    [isActive],
  );

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
    // Get font with appropriate weight for selection state
    const font = getArabicFont(undefined, isSelected ? 'semibold' : 'normal');
    if (!font) {
      return null;
    }

    if (hasComponents && coloredSegments.length > 0) {
      // Build multi-colored paragraph from segments
      return buildColoredParagraph({
        segments: coloredSegments,
        font,
        fontFamily,
        fontManager,
        textDirection: TextDirection.RTL,
        maxWidth: 2000, // Large width to prevent wrapping of single words
        letterSpacing: 0,
      });
    } else {
      // Build simple single-color paragraph
      return buildSimpleParagraph(
        word.word_form,
        font,
        colors.arabicText,
        fontFamily,
        TextDirection.RTL,
        2000,
        fontManager,
      );
    }
  }, [
    getArabicFont,
    isSelected,
    hasComponents,
    coloredSegments,
    word.word_form,
    colors.arabicText,
    fontFamily,
    fontManager,
  ]);

  // Extra vertical space for Arabic diacritics (shadda, tanwin) that extend above the line
  const DIACRITICS_PADDING = 8;

  const canvasDimensions = useMemo(() => {
    if (!paragraph) {
      return { width: 60, height: 40 };
    }

    return {
      width: Math.ceil(paragraph.getMaxIntrinsicWidth() * 1.05),
      height: Math.ceil(paragraph.getHeight()) + DIACRITICS_PADDING,
    };
  }, [paragraph]);

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

  return (
    <View style={styles.wordWrapper}>
      {/* Pulsing highlight for tutorial */}
      {isHighlighted && (
        <Animated.View
          style={[styles.highlightOverlay, { backgroundColor: colors.tint }, HIGHLIGHT_ANIMATION_STYLE]}
        />
      )}
      {/* Static subtle highlight for target word in sentence examples */}
      {isTargetWord && !isHighlighted && (
        <View style={[styles.targetWordOverlay, { backgroundColor: colors.tint }]} />
      )}
      <AnimatedPressable
        ref={wordRef}
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
              width={canvasDimensions.width}
            />
          )}
        </Canvas>
      </AnimatedPressable>
    </View>
  );
};

const styles = StyleSheet.create({
  highlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  targetWordOverlay: {
    ...StyleSheet.absoluteFillObject,
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
