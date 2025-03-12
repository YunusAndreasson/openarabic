import { useState, useEffect } from 'react';
import { SCREEN_WIDTH } from '../constants/layout';

interface WordSizingOptions {
  minFontSize?: number;
  maxFontSize?: number;
}

/**
 * Custom hook to calculate the optimal font size for a word based on its length
 * Only scales down for very long words (over 15 characters)
 */
export const useWordSizing = (word: string | undefined, options: WordSizingOptions = {}) => {
  const { minFontSize = 50, maxFontSize = 100 } = options;
  const [fontSize, setFontSize] = useState(maxFontSize);

  useEffect(() => {
    if (!word) return;

    // Use fixed font size for most words
    if (word.length <= 15) {
      setFontSize(maxFontSize);
      return;
    }

    // For very long words, calculate a reduced size
    const availableWidth = SCREEN_WIDTH * 0.9;
    const charWidthFactor = 0.6;
    const estimatedCharWidth = maxFontSize * charWidthFactor;

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
