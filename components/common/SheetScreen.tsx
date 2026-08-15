import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LAYOUT } from '@/constants/layout';

/**
 * Clearance for the OS sheet grabber (`sheetGrabberVisible: true`). iOS draws a
 * pill a few points below the sheet's top edge; at the previous `MEDIUM` (12)
 * the grabber landed on the first line of the header, which read as garbled
 * text. Android never draws one for this classic `Stack.Screen
 * presentation:'formSheet'` path — react-native-screens only reads
 * `sheetGrabberVisible` on its newer standalone `<FormSheet>` component — so
 * reserving the same space here was just dead space above the header.
 */
const GRABBER_CLEARANCE = Platform.OS === 'android' ? LAYOUT.SPACING.MEDIUM : LAYOUT.SPACING.XLARGE;

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
 * **The route owns the sheet background, via `contentStyle`, not this view.**
 * With `fitToContents` and `headerShown: false` iOS leaves a bottom safe-area
 * inset below the content wrapper (react-native-screens#3203) — the sheet is
 * taller than what this container paints. No padding here can reach it: the
 * band sits *outside* the wrapper. react-native-screens handles it by lifting
 * `backgroundColor` out of the route's `contentStyle` onto the Screen itself
 * ("we need to extract background color and apply it to Screen due to the safe
 * area inset at the bottom of ScreenContentWrapper" — `ScreenStackItem`), which
 * paints the whole sheet including the band. Expo Router already injects the
 * theme `background` there, so a sheet that painted `elevation1` on this view
 * instead left the band a visibly different colour — the "gap at the bottom".
 *
 * Bottom padding is a fixed `MEDIUM` on iOS — NOT `insets.bottom`. A native form
 * sheet clears the home indicator on its own, and with `fitToContents` the inset
 * described above already supplies that room; adding it there only makes the
 * sheet taller.
 *
 * Android is the other half of that same fact: it has neither the extra inset
 * nor any clearance of its own, so the sheet ends exactly at the screen edge and
 * the system gesture pill is drawn straight over the last line of content.
 * Measured on device — the memory sheet's closing sentence and the due-words
 * caption both had the pill through them. Whichever platform supplies the room,
 * this container makes up the difference.
 */
export function SheetScreen({ children }: SheetScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        Platform.OS === 'android' && { paddingBottom: insets.bottom + LAYOUT.SPACING.MEDIUM },
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
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
});
