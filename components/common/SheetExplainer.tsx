import type { JSX } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT } from '@/constants/layout';

/**
 * The closing sentence under a sheet's content.
 *
 * One line, caption ink, left-aligned on the sheet's own edge — the same place
 * and the same weight in every practice sheet, so it reads as the sheet
 * finishing its sentence rather than as a fifth kind of text block.
 *
 * It started life inside `BreakdownRow` as `BreakdownExplainer`, private to the
 * two sheets that draw a distribution. It moved here when the streak sheet
 * needed the same thing and the due-words sheet turned out to already have one —
 * centred, which was the only centred body text in the tab.
 */
export function SheetExplainer({ text }: { text: string }): JSX.Element {
  return (
    <ThemedText type="caption" colorName="captionText" style={styles.explainer}>
      {text}
    </ThemedText>
  );
}

SheetExplainer.displayName = 'SheetExplainer';

const styles = StyleSheet.create({
  explainer: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
});
