import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

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
}

/**
 * Container for routes presented via `presentation: 'formSheet'` with
 * `sheetAllowedDetents: 'fitToContents'`. Hugs its children — no `flex: 1`,
 * or the iOS sheet would have no measurable content height to fit to.
 *
 * **Never put a `ScrollView` inside this.** react-native-screens only supports
 * a scroll view that is a *direct* child of the screen (optionally preceded by
 * one non-collapsable header view); it looks for one down the first-subview
 * path and, when it finds a nested one it cannot size properly, falls back to
 * `[scrollView setFrame:screenView.frame]` — the scroll view is yanked to the
 * sheet's top-left corner at full sheet size, so its rows paint over the header
 * and ignore this container's padding. That is what broke every sheet here; see
 * `app/words-to-revisit.tsx` for the shape to use when scrolling is genuinely
 * needed.
 *
 * Bottom padding is a fixed `MEDIUM` — NOT `insets.bottom + LARGE`. A native
 * form sheet sits above the home indicator on its own (the system handles that
 * clearance), so adding the device safe-area inset here renders as a visible
 * empty band below the content. Sleep-timer can include `insets.bottom` because
 * at a fixed detent the space reads as breathing room around its bottom button;
 * with `fitToContents` the same padding becomes a gap.
 */
export function SheetScreen({ children }: SheetScreenProps) {
  const colors = useColors();

  return <View style={[styles.container, { backgroundColor: colors.elevation1 }]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    paddingTop: GRABBER_CLEARANCE,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
});
