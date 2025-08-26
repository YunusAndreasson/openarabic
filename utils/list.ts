import type { ViewabilityConfig } from 'react-native';

export function createViewabilityConfig(): ViewabilityConfig {
  return {
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 100,
  };
}

export function overrideFixedHeight(itemHeight: number) {
  return (layout: { span?: number; size?: number }) => {
    layout.size = itemHeight;
  };
}

/**
 * Shuffles an array using the Fisher-Yates algorithm
 * @param array - The array to shuffle
 * @returns A new shuffled array (original array is not modified)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const temp = shuffled[i]!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const other = shuffled[j]!;
    shuffled[i] = other;
    shuffled[j] = temp;
  }
  return shuffled;
}
