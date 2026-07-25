import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface SheetScreenProps {
  children: ReactNode;
  /**
   * Fill the sheet instead of hugging its children. Use ONLY with a fixed
   * detent (`sheetAllowedDetents: [n]`), never with `fitToContents` — the
   * whole point of hugging is to give iOS a measurable content height, and
   * `flex: 1` has no intrinsic height to measure.
   */
  fill?: boolean;
}

/**
 * Container for routes presented via `presentation: 'formSheet'` with
 * `sheetAllowedDetents: 'fitToContents'`. Hugs its children — no `flex: 1`,
 * or the iOS sheet would have no measurable content height to fit to.
 *
 * Bottom padding is a fixed `MEDIUM` — NOT `insets.bottom + LARGE`. A native
 * form sheet sits above the home indicator on its own (the system handles
 * that clearance), so adding the device safe-area inset here renders as a
 * visible empty band below the content. Sleep-timer can include `insets.bottom`
 * because at a fixed detent the space reads as breathing room around its
 * bottom button; with `fitToContents` the same padding becomes a gap.
 */
export function SheetScreen({ children, fill = false }: SheetScreenProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, fill && styles.fill, { backgroundColor: colors.elevation1 }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  fill: {
    flex: 1,
  },
});
