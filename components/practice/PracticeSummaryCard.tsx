import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { DisclosureChevron } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';

/**
 * The two halves the practice screen's summary cards share — `WeekAheadCard`
 * and `MemoryHorizonCard`, stacked one over the other. They used to copy each
 * other's padding, footer row and chevron by hand, with a comment asking the
 * next editor to keep them in step; these are what keeps the two cards on one
 * left edge, one label line and one chevron column.
 *
 * Between the two sits whatever the card draws. A chart that must run
 * full-bleed (the memory constellation) goes there, outside the body's
 * padding.
 */

/** The card's label and headline, inset from its edges. */
export function PracticeCardBody({ children }: { children: ReactNode }) {
  return <View style={styles.body}>{children}</View>;
}

interface PracticeCardFooterProps {
  /** One caption line saying what the card's figure means; it wraps as it grows. */
  text: string;
  /**
   * Draw the chevron. Pass `onPress != null`: a card that does not navigate
   * must not advertise a destination it does not have.
   */
  showDisclosure: boolean;
}

/** The caption the card closes on, and its disclosure chevron. */
export function PracticeCardFooter({ text, showDisclosure }: PracticeCardFooterProps) {
  return (
    <View style={styles.footer}>
      <ThemedText type="caption" colorName="captionText" style={styles.footerText}>
        {text}
      </ThemedText>
      {showDisclosure && <DisclosureChevron />}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.SMALL,
  },
  footerText: {
    flex: 1,
  },
});
