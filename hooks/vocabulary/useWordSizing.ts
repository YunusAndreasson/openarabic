import { useState, useEffect } from 'react';

import { SCREEN_WIDTH } from '@/constants/layout';

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
 * Only scales down for very long words (over 15 characters)
 */
export const useWordSizing = (
  word: string | undefined,
  options: WordSizingOptions = {}
): number => {
  const {
    minFontSize = WORD_SIZING.DEFAULT_MIN_FONT_SIZE,
    maxFontSize = WORD_SIZING.DEFAULT_MAX_FONT_SIZE,
  } = options;
  const [fontSize, setFontSize] = useState(maxFontSize);

  useEffect(() => {
    if (!word) return;

    // Use fixed font size for most words
    if (word.length <= WORD_SIZING.LONG_WORD_THRESHOLD) {
      setFontSize(maxFontSize);
      return;
    }

    // For very long words, calculate a reduced size
    const availableWidth = SCREEN_WIDTH * WORD_SIZING.SCREEN_WIDTH_FACTOR;
    const estimatedCharWidth = maxFontSize * WORD_SIZING.CHAR_WIDTH_FACTOR;

    // Calculate font size based on available width and word length
    const calculatedSize = Math.min(
      maxFontSize,
      (availableWidth / (word.length * estimatedCharWidth)) * maxFontSize
    );

    // Ensure font size is not smaller than minimum
    setFontSize(Math.max(minFontSize, calculatedSize));
  }, [word, minFontSize, maxFontSize]);

  return fontSize;
};

export default useWordSizing;
