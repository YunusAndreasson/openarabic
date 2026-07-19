import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BaseCard } from '@/components/common/BaseCard';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@/components/ui/Icon';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { formatNextDue } from '@/utils/fsrsUtils';

interface TodayCardProps {
  dueCount: number;
  reviewedToday: number;
  nextDueDate: Date | null;
  /** Due count clips at the query limit — show "100+" instead of an exact number */
  dueCountCapped?: boolean;
  /** Opens the "This week" due-words forecast sheet */
  onPress?: () => void;
}

/**
 * Slim status strip: what today asks of you, in one line. The single
 * start-review CTA lives at the bottom of the screen — this strip only
 * informs and links to the weekly forecast sheet.
 */
export const TodayCard = memo<TodayCardProps>(
  ({ dueCount, reviewedToday, nextDueDate, dueCountCapped = false, onPress }) => {
    const colors = useColors();
    const hasDue = dueCount > 0;

    const displayCount = dueCountCapped ? `${dueCount}+` : `${dueCount}`;
    const primary = hasDue
      ? `${displayCount} ${STRINGS.TODAY_TO_REVIEW}`
      : STRINGS.TODAY_ALL_CAUGHT_UP;

    const secondaryParts: string[] = [];
    if (reviewedToday > 0) {
      secondaryParts.push(`${reviewedToday} ${STRINGS.TODAY_REVIEWED_TODAY}`);
    }
    if (!hasDue && nextDueDate) {
      secondaryParts.push(`${STRINGS.TODAY_NEXT_REVIEW} ${formatNextDue(nextDueDate)}`);
    }
    const secondary = secondaryParts.join(' · ');

    return (
      <BaseCard shadowSize="small" onPress={onPress}>
        <View style={styles.row}>
          <View style={styles.textColumn}>
            <ThemedText type="bodyBold">{primary}</ThemedText>
            {secondary.length > 0 && (
              <ThemedText type="caption" variant="secondary">
                {secondary}
              </ThemedText>
            )}
          </View>
          <Ionicons
            name="chevron-forward"
            size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
            color={colors.textTertiary}
          />
        </View>
      </BaseCard>
    );
  },
);

TodayCard.displayName = 'TodayCard';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  textColumn: {
    flex: 1,
    gap: LAYOUT.SPACING.HALF_TINY,
  },
});
