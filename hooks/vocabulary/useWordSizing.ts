import { useMemo } from 'react';

interface WordSizingOptions {
  minFontSize?: number;
  maxFontSize?: number;
}

// Constants for word sizing calculations
const WORD_SIZING = {
  LONG_WORD_THRESHOLD: 15,
  DEFAULT_MIN_FONT_SIZE: 50,
  DEFAULT_MAX_FONT_SIZE: 100,
  CHAR_WIDTH_FACTOR: 0.6,
  SCREEN_WIDTH_FACTOR: 0.9,
} as const;

/**
 * Custom hook to calculate the optimal font size for a word based on its length
 * Uses responsive scaling that works across all device sizes without hardcoded screen constraints
 */
export const useWordSizing = (
  word: string | undefined,
  options: WordSizingOptions = {}
): number => {
  const {
    minFontSize = WORD_SIZING.DEFAULT_MIN_FONT_SIZE,
    maxFontSize = WORD_SIZING.DEFAULT_MAX_FONT_SIZE,
  } = options;

  return useMemo(() => {
    if (!word) return maxFontSize;

    // Use fixed font size for most words
    if (word.length <= WORD_SIZING.LONG_WORD_THRESHOLD) {
      return maxFontSize;
    }

    // For very long words, use proportional scaling based on word length only
    // This removes dependency on specific screen width values
    const lengthFactor = WORD_SIZING.LONG_WORD_THRESHOLD / word.length;
    const calculatedSize = maxFontSize * lengthFactor;

    // Ensure font size is not smaller than minimum
    return Math.max(minFontSize, calculatedSize);
  }, [word, minFontSize, maxFontSize]);
};
