import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
// Gesture-handler's Pressable, NOT react-native's. The dictionary wraps this row
// in a `ReanimatedSwipeable`, and RN's Pressable runs on the JS responder
// system, which does not negotiate with the swipeable's native pan: a horizontal
// drag stays inside the row's press rect, so the press was never cancelled and
// every swipe also fired onPress — the word detail opened on top of the actions
// the swipe had just revealed. Kept here, not only in the swipeable caller, so
// both word lists take the same code path.
import { Pressable as GHPressable } from 'react-native-gesture-handler';

import { ListRow } from '@/components/common/ListRow';
import { ThemedText } from '@/components/primitives/ThemedText';
import { DisclosureChevron } from '@/components/ui';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { PressableLikeProps } from '@/types/ui/base.types';

interface WordListRowProps {
  /** The vocalised headword — `roots.letters`. */
  arabic: string;
  /** The English gloss, already capitalised by the caller. */
  gloss: string;
  /**
   * The row's single trailing magnitude — the sort meter in the dictionary, the
   * forgot-count in the revisit sheet.
   *
   * One slot on purpose. A row that reports two magnitudes has no way to say
   * which of them it is reporting, and nothing beside it is going to explain
   * the difference at 13pt.
   */
  trailing?: ReactNode;
  /**
   * Opens whatever the row leads to. **The chevron is drawn exactly when this
   * is set** — the app's disclosure rule lives here rather than in each caller,
   * because the two places that got it wrong before were both callers.
   */
  onPress?: () => void;
  accessibilityLabel: string;
  /**
   * Hairline under the row. For surfaces with no `ItemSeparatorComponent` —
   * i.e. the revisit sheet, which is a plain ScrollView.
   */
  divider?: boolean;
}

/**
 * One saved word, on one line: the meaning, then the Arabic trailing, then a
 * single magnitude. Arabic sits on the right so each language keeps its natural
 * text alignment — English ragged-right on the left, Arabic ragged-left on the
 * right, instead of both fighting their default direction.
 *
 * Deliberately flat: a list of hundreds of words should read as a list, not as a
 * stack of elevated cards. Measured at ~55dp against ~137dp for the cards this
 * replaced, and the density is the feature.
 *
 * Shared by the dictionary index and `/words-to-revisit`. Those two render the
 * same objects out of the same cache and used to look unrelated — Arabic above
 * the gloss in one, beside it in the other — which quietly implied they were
 * different kinds of thing.
 *
 * It is `components/common/ListRow` (`compact` density, its divider, its
 * pressed fill and its press lock) on gesture-handler's `Pressable`, which the
 * dictionary's `ReanimatedSwipeable` needs to negotiate with its native pan —
 * see the import note above for what RN's does instead. It used to be a copy of
 * ListRow for that one reason, and the copy skipped ListRow's press lock, so a
 * double-tap could push the word screen twice.
 *
 * A pressable row is announced as a button exactly when it is one: ListRow's
 * default. Lifting the composition out of ListRow once silently dropped it, and
 * both word lists read out their contents and then stopped, with no sign they
 * could be opened.
 */
const WordListRowComponent = ({
  arabic,
  gloss,
  trailing,
  onPress,
  accessibilityLabel,
  divider = false,
}: WordListRowProps) => (
  <ListRow
    density="compact"
    divider={divider}
    onPress={onPress}
    accessibilityLabel={accessibilityLabel}
    PressableComponent={WordRowPressable}
    style={styles.row}
  >
    <ThemedText
      type="caption"
      colorName="secondaryText"
      align="left"
      numberOfLines={1}
      style={styles.gloss}
    >
      {gloss}
    </ThemedText>
    <ThemedText type="arabicCompact" align="right" numberOfLines={1} style={styles.arabic}>
      {arabic}
    </ThemedText>
    {/* Trailing magnitude and chevron travel together on a tighter gap: they
          are one accessory, and a full gap between them would cost the meaning
          another 12dp of width. */}
    <View style={styles.trailing}>
      {trailing}
      {onPress ? <DisclosureChevron /> : null}
    </View>
  </ListRow>
);

/**
 * Gesture-handler's Pressable with this list's own ripple: the whole row, drawn
 * over its content. A flat row has no card press-scale, so the feedback comes
 * from the surface, and ListRow's default ripple is a touch-target-sized circle
 * (`createAndroidRipple`) rather than the edge-to-edge one these rows have
 * always had.
 */
function WordRowPressable(props: PressableLikeProps) {
  const colors = useColors();
  return (
    <GHPressable
      {...props}
      android_ripple={{ color: colors.navigationRipple, borderless: false, foreground: true }}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    // Floor for very small Arabic font settings — also stops the 44px swipe
    // action buttons from dictating the row height in the dictionary.
    minHeight: MIN_TOUCH_TARGET.LARGE,
  },
  arabic: {
    flexShrink: 1,
  },
  gloss: {
    flex: 1,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    flexShrink: 0,
  },
});

export const WordListRow = memo(WordListRowComponent);

WordListRow.displayName = 'WordListRow';
