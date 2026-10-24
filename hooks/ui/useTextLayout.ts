import { useWindowDimensions } from 'react-native';

import { INLINE_VALUE_MIN_WIDTH } from '@/constants/layout';

/**
 * How much room text has, in TEXT points rather than screen points.
 *
 * `width / fontScale` is the width a line of text can actually use once the
 * learner's text-size setting is applied: at the largest accessibility sizes a
 * phone behaves like a screen a third as wide. Seven components computed this
 * ratio against `INLINE_VALUE_MIN_WIDTH` by hand to decide whether a label and
 * its value still fit side by side; `crowded` is that decision, made once.
 */
export function useTextLayout(): { fontScale: number; crowded: boolean } {
  const { width, fontScale } = useWindowDimensions();
  return { fontScale, crowded: width / fontScale < INLINE_VALUE_MIN_WIDTH };
}
