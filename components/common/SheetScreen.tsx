import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

/**
 * Clearance for the OS sheet grabber (`sheetGrabberVisible: true`). iOS draws a
 * pill a few points below the sheet's top edge; at the previous `MEDIUM` (12)
 * the grabber landed on the first line of the header, which read as garbled
 * text. Android draws its own and needs the same room.
 */
const GRABBER_CLEARANCE = LAYOUT.SPACING.XLARGE;

interface SheetScreenProps {
  children: ReactNode;
  /**
   * Fill the sheet instead of hugging its children. Every sheet route now uses
   * a fixed detent, so this is the normal choice — pair it with a scrollable so
   * content shorter than the detent can't leave a band and content taller than
   * it can't be clipped.
   */
  fill?: boolean;
}

/**
 * Container for routes presented via `presentation: 'formSheet'`.
 *
 * **Use fixed detents, never `sheetAllowedDetents: 'fitToContents'`.** iOS
 * measures a fitToContents detent as *content height + bottom safe area* and
 * top-aligns the content inside it, so the safe-area surplus shows up as an
 * empty band below the content. Padding cannot close that band — adding
 * `insets.bottom` to the content grows the measured height by the same amount,
 * so the band survives. (An earlier pass saw the band, blamed the padding,
 * removed it, and was left with the band *and* content colliding with the home
 * indicator.) A fixed detent removes the measurement, which is also what
 * `words-to-revisit` concluded after fitToContents mismeasured its async list.
 *
 * With the measurement gone the content owns its bottom clearance, so
 * `insets.bottom` is applied here and is correct for every sheet.
 */
export function SheetScreen({ children, fill = false }: SheetScreenProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        fill && styles.fill,
        {
          backgroundColor: colors.elevation1,
          paddingBottom: insets.bottom + LAYOUT.SPACING.MEDIUM,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    paddingTop: GRABBER_CLEARANCE,
  },
  fill: {
    flex: 1,
  },
});
