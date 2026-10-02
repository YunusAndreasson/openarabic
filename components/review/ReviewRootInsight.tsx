import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/primitives/ThemedText';
import { Ionicons } from '@/components/ui';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { withOpacity } from '@/utils/colorUtils';

interface Props {
  explanation: string;
}

/**
 * The recovery lesson after “Forgot”. This is intentionally not the app's full
 * root reference panel: review needs one memorable paragraph, not senses,
 * citations and a family list competing for attention before the next card.
 */
export const ReviewRootInsight = memo(({ explanation }: Props) => {
  const colors = useColors();
  const accessibilityLabel = `${STRINGS.REVIEW_ROOT_INSIGHT_TITLE}. ${explanation}`;

  return (
    <Animated.View
      accessible
      accessibilityLabel={accessibilityLabel}
      entering={FadeIn.duration(TIMING_CONFIG.MEDIUM.duration)}
      style={[styles.container, { backgroundColor: withOpacity(colors.tint, 0.08) }]}
      testID="review-root-insight"
    >
      <View style={styles.heading}>
        <Ionicons
          name="sparkles-outline"
          size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
          color={colors.tint}
        />
        <ThemedText colorName="tint" type="overline">
          {STRINGS.REVIEW_ROOT_INSIGHT_TITLE}
        </ThemedText>
      </View>
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
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    gap: LAYOUT.SPACING.SMALL,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
  },
  explanation: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.55,
  },
});
