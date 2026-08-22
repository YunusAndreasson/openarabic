import type { FC, ReactNode } from 'react';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ListRow } from '@/components/common/ListRow';
import { ThemedText } from '@/components/primitives/ThemedText';
import { Ionicons } from '@/components/ui/Icon';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface DisclosureRowProps {
  /** Section label, always visible. */
  title: string;
  /**
   * What the row says while closed, beside the title — a count, a preview line.
   * Hidden once open, where the content itself is on screen and repeating it is
   * noise.
   *
   * Give the row one of these wherever you can: a disclosure that does not say
   * what it opens reads as a dead end and does not get tapped.
   */
  summary?: ReactNode;
  /**
   * Spoken label, closed and open.
   *
   * `ListRow` puts the label on a `Pressable`, which makes the row a single
   * accessibility element and hides everything inside it from a screen reader —
   * `summary` included. So when the summary carries CONTENT rather than a
   * count, the closed label has to carry that content too, or the row is the
   * one place a screen-reader user hears less than a sighted one.
   */
  expandLabel: string;
  collapseLabel: string;
  /** Revealed when open. */
  children: ReactNode;
}

/**
 * A titled row that opens to reveal its content.
 *
 * Extracted because it was written twice in one change — the reader card's
 * grammar note and the root panel's family list — down to the same 160ms fade,
 * the same chevron size, the same compact density and the same selection
 * haptic. Two copies of a visual language invented on the same day is how the
 * two halves of it drift apart, and a third caller would have copied whichever
 * it found first.
 *
 * Owns its own open state: neither caller needs to drive it, and a controlled
 * version would push four props at both of them to say nothing.
 */
export const DisclosureRow: FC<DisclosureRowProps> = ({
  title,
  summary,
  expandLabel,
  collapseLabel,
  children,
}) => {
  const colors = useColors();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View>
      <ListRow
        accessibilityLabel={isExpanded ? collapseLabel : expandLabel}
        density="compact"
        hapticType="selection"
        onPress={() => setIsExpanded(open => !open)}
      >
        <View style={styles.summaryRow}>
          <ThemedText colorName="subtleLabelText" type="overline">
            {title}
          </ThemedText>
          {!isExpanded && summary}
        </View>
        <Ionicons
          color={colors.textTertiary}
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
        />
      </ListRow>
      {isExpanded && <Animated.View entering={FadeIn.duration(160)}>{children}</Animated.View>}
    </View>
  );
};

DisclosureRow.displayName = 'DisclosureRow';

const styles = StyleSheet.create({
  summaryRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
  },
});
