import { useState, useEffect } from 'react';
import { SCREEN_WIDTH } from '../constants/layout';

interface WordSizingOptions {
  minFontSize?: number;
  maxFontSize?: number;
  safetyMargin?: number;
}

/**
 * Custom hook to calculate the optimal font size for a word based on its length
 * @param word The word to calculate font size for
 * @param options Configuration options for sizing
 * @returns The calculated font size
 */
export const useWordSizing = (word: string | undefined, options: WordSizingOptions = {}) => {
  const { minFontSize = 60, maxFontSize = 240, safetyMargin = 0.99 } = options;

  const [fontSize, setFontSize] = useState(maxFontSize);

  useEffect(() => {
    if (!word) return;

    const wordLength = word.length;

    // Base calculation on screen width and word length
    // Using 105% of screen width for maximum size (slight overflow is acceptable)
    const availableWidth = SCREEN_WIDTH * 1.05;

    // Determine character width factor based on word length
    let charWidthFactor;

    if (wordLength === 1) {
      // Single character can be gigantic
      charWidthFactor = 0.35; // Extremely aggressive for single characters
    } else if (wordLength === 2) {
      // Two characters can be enormous
      charWidthFactor = 0.4; // Extremely aggressive for two characters
    } else if (wordLength === 3) {
      // Three characters can be extremely large
      charWidthFactor = 0.45; // Very aggressive for three characters
    } else if (wordLength === 4) {
      // Four characters can be very large
      charWidthFactor = 0.5; // Very aggressive for four characters
    } else if (wordLength <= 6) {
      // Short words (5-6 characters) can be large
      charWidthFactor = 0.55; // Aggressive for short words
    } else if (wordLength <= 8) {
      // Medium words (7-8 characters)
      charWidthFactor = 0.6; // Aggressive for medium words
    } else if (wordLength <= 12) {
      // Longer words (9-12 characters)
      charWidthFactor = 0.65; // Aggressive for longer words
    } else {
      // Very long words (13+ characters)
      charWidthFactor = 0.7; // Still aggressive for very long words
    }

    // Apply safety margin
    charWidthFactor = charWidthFactor / safetyMargin;

    const estimatedCharWidth = maxFontSize * charWidthFactor;

    // Calculate the font size that would make the word fit in the available width
    const calculatedFontSize = Math.min(
      maxFontSize,
      (availableWidth / (wordLength * estimatedCharWidth)) * maxFontSize
    );

    // Ensure font size is not smaller than minimum
    const newFontSize = Math.max(minFontSize, calculatedFontSize);

    setFontSize(newFontSize);
  }, [word, minFontSize, maxFontSize, safetyMargin]);

  return fontSize;
};

export default useWordSizing;
