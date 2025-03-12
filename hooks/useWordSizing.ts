import { useState, useEffect } from 'react';
import { SCREEN_WIDTH } from '../constants/layout';

interface WordSizingOptions {
  minFontSize?: number;
  maxFontSize?: number;
}

/**
 * Custom hook to calculate the optimal font size for a word based on its length
 * @param word The word to calculate font size for
 * @param options Configuration options for sizing
 * @returns The calculated font size
 */
export const useWordSizing = (word: string | undefined, options: WordSizingOptions = {}) => {
  // Use a consistent default font size for most words
  const { minFontSize = 50, maxFontSize = 100 } = options;

  const [fontSize, setFontSize] = useState(maxFontSize);

  useEffect(() => {
    if (!word) return;

    const wordLength = word.length;

    // Use a fixed font size for most words
    let newFontSize = maxFontSize;

    // Only scale down for very long words (over 15 characters)
    if (wordLength > 15) {
      // Calculate available width (90% of screen width)
      const availableWidth = SCREEN_WIDTH * 0.9;

      // Simple calculation for very long words
      const charWidthFactor = 0.6;
      const estimatedCharWidth = maxFontSize * charWidthFactor;

      // Calculate font size based on available width and word length
      newFontSize = Math.min(
        maxFontSize,
        (availableWidth / (wordLength * estimatedCharWidth)) * maxFontSize
      );

      // Ensure font size is not smaller than minimum
      newFontSize = Math.max(minFontSize, newFontSize);
    }

    setFontSize(newFontSize);
  }, [word, minFontSize, maxFontSize]);

  return fontSize;
};

export default useWordSizing;
