import { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/primitives/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

interface Props {
  explanation: string;
}

/**
 * The recovery lesson after “Forgot”. This is intentionally not the app's full
 * root reference panel: review needs one memorable paragraph, not senses,
 * citations and a family list competing for attention before the next card.
 *
 * A plain caption and the paragraph, on the card's own surface. It used to sit
 * in a tint box at 8% alpha behind a sparkles glyph and a tint eyebrow: the
 * glyph said nothing the caption did not, and an alpha fill composites against
 * whatever is behind it, which on the dark card collapses to a grey smudge.
 */
export const ReviewRootInsight = memo(({ explanation }: Props) => {
  const accessibilityLabel = `${STRINGS.REVIEW_ROOT_INSIGHT_TITLE}. ${explanation}`;

  return (
    <Animated.View
      accessible
      accessibilityLabel={accessibilityLabel}
      entering={FadeIn.duration(TIMING_CONFIG.MEDIUM.duration)}
      style={styles.container}
      testID="review-root-insight"
    >
      <ThemedText colorName="secondaryText" type="caption">
        {STRINGS.REVIEW_ROOT_INSIGHT_TITLE}
      </ThemedText>
      <ThemedText colorName="secondaryText" type="body" style={styles.explanation}>
        {explanation}
      </ThemedText>
    </Animated.View>
  );
});

ReviewRootInsight.displayName = 'ReviewRootInsight';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: LAYOUT.SPACING.XLARGE,
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
  },
  explanation: {
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LINE_HEIGHT_MULTIPLIERS.LOOSE,
  },
});
