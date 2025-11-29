import { memo, useEffect, useMemo, useRef, type ComponentRef, type RefObject } from 'react';
import type { LayoutRectangle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Canvas, Paragraph as SkiaParagraph, TextDirection } from '@shopify/react-native-skia';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useSkiaFonts } from '@/hooks/theme/useSkiaFonts';
import { useArabicWord } from '@/hooks/vocabulary';
import type { SentenceWord } from '@/types/vocabulary.types';
import { buildColoredParagraph, buildSimpleParagraph } from '@/utils/skiaParagraphBuilder';
import { getSelectedStyle } from '@/utils/textStyleUtils';

interface SkiaArabicWordProps {
  word: SentenceWord;
  onTooltipOpen?: (word: SentenceWord, layout: LayoutRectangle) => void;
  position?: number;
  wordRef?: RefObject<ComponentRef<typeof Pressable>>;
  testID?: string;
  /** When true, shows a pulsing highlight to draw attention (used for tutorial) */
  isHighlighted?: boolean;
}

const SkiaArabicWordInternal = function SkiaArabicWord({
  word,
  onTooltipOpen,
  position,
  wordRef,
  testID,
  isHighlighted = false,
}: SkiaArabicWordProps) {
  const colors = useColors();
  const { arabicFont, getArabicFont, fontFamily } = useSkiaFonts();

  // Prevent memory leaks from async callbacks on unmounted components
  const isMountedRef = useRef(true);

  // Pulsing highlight animation for tutorial
  const highlightOpacity = useSharedValue(0);

  useEffect(() => {
    if (isHighlighted) {
      highlightOpacity.value = withRepeat(
        withSequence(withTiming(1, { duration: 800 }), withTiming(0.3, { duration: 800 })),
        -1,
        false,
      );
    } else {
      highlightOpacity.value = 0;
    }
  }, [isHighlighted, highlightOpacity]);

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: highlightOpacity.value,
  }));

  // Use our existing hook for word selection state
  const { isSelected } = useArabicWord({
    word,
    position,
  });

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
  // Note: arabicFont is guaranteed to be available since app waits for fonts before rendering
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
  ]);

  // Calculate canvas dimensions from paragraph
  const canvasDimensions = useMemo(() => {
    const fontSize = arabicFont?.getSize() || LAYOUT.TYPOGRAPHY.SCALE.LARGE;

    if (!paragraph) {
      // Fallback dimensions if paragraph build failed (shouldn't happen)
      return { width: 60, height: 40, yOffset: fontSize * 0.5 };
    }

    // Simple, robust sizing with minimal buffers for Arabic text + diacritics
    const width = Math.ceil(paragraph.getMaxIntrinsicWidth() * 1.05); // 5% extra for safety
    const height = Math.ceil(fontSize * 2.4); // 2.4x font size for diacritics above/below
    const yOffset = fontSize * 0.5; // Offset to create space for top diacritics

    return { width, height, yOffset };
  }, [paragraph, arabicFont]);

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

  // Word container styles - transparent underline reserves space to prevent layout jumps
  const baseUnderlineStyle = { borderBottomWidth: 1, borderBottomColor: colors.transparent };

  const containerStyle = [
    styles.wordContainer,
    baseUnderlineStyle,
    getSelectedStyle(isSelected, colors.disabled),
  ];

  return (
    <View style={styles.wordWrapper}>
      {isHighlighted && (
        <Animated.View
          style={[styles.highlightOverlay, { backgroundColor: colors.tint }, highlightStyle]}
        />
      )}
      <Pressable ref={wordRef} style={containerStyle} testID={testID} onPress={handlePress}>
        <Canvas
          style={{ width: canvasDimensions.width, height: canvasDimensions.height }}
          pointerEvents="none"
        >
          {paragraph && (
            <SkiaParagraph
              paragraph={paragraph}
              x={0}
              y={canvasDimensions.yOffset}
              width={canvasDimensions.width}
            />
          )}
        </Canvas>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  highlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
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
