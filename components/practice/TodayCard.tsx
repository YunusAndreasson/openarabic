import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BaseCard } from '@/components/common/BaseCard';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@/components/ui/Icon';
import { FONTS } from '@/constants/fonts';
import { LAYOUT, LETTER_SPACING } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { formatNextDue } from '@/utils/fsrsUtils';

interface TodayCardProps {
  dueCount: number;
  reviewedToday: number;
  nextDueDate: Date | null;
  /** Due count clips at the query limit — show "100+" instead of an exact number */
  dueCountCapped?: boolean;
  onStartReview: () => void;
  /** Opens the "This week" due-words forecast sheet */
  onPress?: () => void;
}

/**
 * Hero card for the practice tab: what to do today, in plain numbers.
 * Due state leads with the review count and a start CTA; caught-up state
 * confirms today's work and says when the next review lands.
 * Tapping the card opens the weekly forecast sheet.
 */
export const TodayCard = memo<TodayCardProps>(
  ({ dueCount, reviewedToday, nextDueDate, dueCountCapped = false, onStartReview, onPress }) => {
    const colors = useColors();
    const hasDue = dueCount > 0;

    const displayCount = dueCountCapped ? `${dueCount}+` : `${dueCount}`;

    const subParts: string[] = [];
    if (reviewedToday > 0) {
      subParts.push(`${reviewedToday} ${STRINGS.TODAY_REVIEWED_TODAY}`);
    }
    if (!hasDue && nextDueDate) {
      subParts.push(`${STRINGS.TODAY_NEXT_REVIEW} ${formatNextDue(nextDueDate)}`);
    }
    const subLine = subParts.join(' · ');

    return (
      <BaseCard shadowSize="small" onPress={onPress}>
        <View style={styles.content}>
          <View style={styles.mainRow}>
            {hasDue ? (
              <View>
                <ThemedText style={styles.dueValue}>{displayCount}</ThemedText>
                <ThemedText type="caption" colorName="subtleLabelText">
                  {STRINGS.TODAY_TO_REVIEW}
                </ThemedText>
              </View>
            ) : (
              <View style={styles.caughtUpRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                  color={colors.success}
                />
                <ThemedText type="heading2" weight="bold">
                  {STRINGS.TODAY_ALL_CAUGHT_UP}
                </ThemedText>
              </View>
            )}

            {hasDue && (
              <ThemedButton
                title={STRINGS.START_REVIEW}
                onPress={onStartReview}
                variant="filled"
                size="small"
              />
            )}
          </View>

          {subLine.length > 0 && (
            <ThemedText type="caption" variant="secondary" style={styles.subLine}>
              {subLine}
            </ThemedText>
          )}
        </View>
      </BaseCard>
    );
  },
);

TodayCard.displayName = 'TodayCard';

const styles = StyleSheet.create({
  content: {
    paddingVertical: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  caughtUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
  dueValue: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 1.15,
    fontFamily: FONTS.ENGLISH_BOLD,
    letterSpacing: LETTER_SPACING.TIGHT,
    includeFontPadding: false,
  },
  subLine: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
});
