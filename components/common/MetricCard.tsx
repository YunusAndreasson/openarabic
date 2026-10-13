import { AnimatedCount } from '@/components/common/AnimatedCount';
import { BaseCard } from '@/components/common/BaseCard';
import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
// Direct path, not the `@/components/ui` barrel: `common` sits above `ui`, and
// pulling the barrel in from here closes the import cycle `eslint.config.mjs`
// bans. Precedent: `components/common/EmptyState.tsx`.
import { Ionicons } from '@/components/ui/Icon';
import { FONTS } from '@/constants/fonts';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { formatCount } from '@/utils/stringUtils';

interface MetricCardProps {
  style?: StyleProp<ViewStyle>;
  value: string | number;
  label: string;
  /**
   * Spoken in place of "label, value". Pass one wherever the tile leads
   * somewhere, so it can end with what tapping does — the way the hero and the
   * week-ahead card already do. A tile that only reads out its own two words
   * gives a screen-reader user no way to know it is a door.
   */
  accessibilityLabel?: string;
  /**
   * Inner padding. `compact` (default) is for a three-up row, where a tile is
   * ~88pt wide and every point goes to the label. `comfortable` matches a full
   * card's 16pt inset: use it in a two-up row sitting under full-width cards, so
   * the tiles' text and chevrons land on the same edges as the cards' own.
   */
  density?: 'compact' | 'comfortable';
  /**
   * Count to a new numeric value instead of swapping to it. For a tile whose
   * number changes while the learner is looking at it — the practice screen's
   * habit row after a session. Leave it off for a readout that is only ever
   * opened at its final value, and always pass `accessibilityLabel` with it:
   * the counting numeral is hidden from a screen reader, so the card's own
   * label is the only thing that speaks.
   */
  animated?: boolean;
  onPress?: () => void;
}

/**
 * Generic metric card component used for displaying stats.
 *
 * Stat-tile contract: label on top in subtle ink, value beneath, and a chevron
 * beside the value **exactly when the tile leads somewhere**. No icon — in a
 * three-up row on a 375pt iPhone the icon and its gap ate 22pt of a 88pt tile,
 * which is what pushed "Day streak" into an ellipsis. The label is the title;
 * a flame beside it was decoration competing for the space the title needed.
 *
 * The chevron rides on the VALUE row, not the label row, for that same reason:
 * the label is already shrinking to fit (see `adjustsFontSizeToFit` below) and
 * taking another 18pt from it would push "Reviews done" to its floor. Beside the
 * value it reads as the vertical form of `BreakdownRow`'s `label · count ·
 * chevron`, which is the one disclosure grammar this app uses.
 *
 * Rendering it only for a pressable tile matters in both directions. Half the
 * `MetricCard`s in the app are static readouts — the three in the review-depth
 * sheet, the three in the streak sheet — and they are the same `BaseCard` at the
 * same size as the pressable ones on the practice screen. Without the signifier
 * the pressable ones read as inert (reported, and fixed for the "Reviews done"
 * tile in a690def7); with it on all of them, the static ones would lie.
 */
export const MetricCard = memo<MetricCardProps>(
  ({ value, label, accessibilityLabel, density = 'compact', animated = false, onPress, style }) => {
    const colors = useColors();
    const displayValue = typeof value === 'number' ? formatCount(value) : value;

    return (
      <BaseCard
        style={[styles.card, style]}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
      >
        <View style={[styles.cardWrapper, density === 'comfortable' && styles.comfortable]}>
          <ThemedText
            type="caption"
            colorName="subtleLabelText"
            style={styles.label}
            numberOfLines={1}
            // Shrink slightly rather than truncate. Without this the tile silently
            // ellipses a title the moment the text gets wider than its share of
            // the row — a longer label, a translation, or the user turning up
            // Dynamic Type. Capping the scale instead would fix the layout by
            // ignoring an accessibility setting; shrinking the one short caption
            // keeps the title readable and whole.
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {label}
          </ThemedText>

          <View style={styles.valueRow}>
            {/* The same protection the label above already carries, and for the
                same reason now that a chevron shares this row: a four-digit
                review count at an accessibility Dynamic Type size is wider than
                its third of a 375pt screen, and RN text does not shrink on its
                own — it wraps, and the tile grows taller than the two beside it. */}
            {animated && typeof value === 'number' ? (
              <AnimatedCount
                value={value}
                type="heading2"
                style={styles.value}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                silent
              />
            ) : (
              <ThemedText
                type="heading2"
                style={styles.value}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {displayValue}
              </ThemedText>
            )}

            {/* Only tiles that lead somewhere claim to. */}
            {onPress && (
              <Ionicons
                color={colors.textTertiary}
                name="chevron-forward"
                size={LAYOUT.BUTTON.ICON_SIZE.DISCLOSURE}
              />
            )}
          </View>
        </View>
      </BaseCard>
    );
  },
);

MetricCard.displayName = 'MetricCard';

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  cardWrapper: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    gap: LAYOUT.SPACING.SMALL,
  },
  comfortable: {
    paddingVertical: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  // The chevron sits on the value's baseline row and is pushed to the tile's
  // right edge, so a one-digit and a four-digit value put it in the same place.
  valueRow: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.TINY,
    justifyContent: 'space-between',
  },
  value: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontFamily: FONTS.ENGLISH_SEMIBOLD,
    flexShrink: 1,
  },
  label: {
    alignSelf: 'stretch',
  },
});
