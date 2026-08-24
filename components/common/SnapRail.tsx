import { Children, memo, useMemo, type FC, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';

/**
 * Gap between cards, and the other half of every rail's snap interval.
 *
 * Not exported: it used to be three constants named `CARD_SPACING`, one per
 * rail, and the point of moving it here is that no caller needs to know it.
 */
const RAIL_ITEM_SPACING = LAYOUT.SPACING.SMALL;

interface SnapRailProps {
  /**
   * Width of one slot. Also half the snap interval, which is why it is a prop
   * rather than a style on the caller's wrapper: the two have to agree or the
   * rail snaps to the wrong place, and they used to be two constants a copy
   * apart.
   */
  itemWidth: number;
  /** Fixed slot height, for rails whose cards are not intrinsically sized. */
  itemHeight?: number;
  children: ReactNode;
}

/**
 * The app's one horizontal snap rail.
 *
 * Explore carries three of these — featured articles, the discovery rails, and
 * the hardest words — and until this existed they were three copies of the same
 * eight lines. Two of them said so in a comment: "matches how `ArticleRail`
 * snaps, so the two rails on Explore behave identically". A comment asking two
 * copies to stay in step is the argument for one component, so here it is.
 *
 * **Full-bleed by construction.** The horizontal inset lives on
 * `contentContainerStyle`, never on the container, so the first card rests on
 * the standard screen padding — flush with the `SectionLabel` above it — while
 * the rest scroll under both screen edges. Explore's own scroll view is
 * deliberately unpadded to allow exactly this; padding the container instead
 * clips every rail 12px early.
 *
 * **`flexGrow: 0, flexShrink: 0` is load-bearing.** A ScrollView carries RN's
 * `baseHorizontal` (`flexGrow: 1, flexShrink: 1`), and a rail that is a direct
 * child of its section rather than wrapped in a flex-inert View absorbs it: it
 * stretches past a fixed card height wherever there is spare vertical room and
 * is squeezed below it — clipping the cards — wherever there is not. Harmless
 * for rails whose cards size themselves, so it is applied to all of them rather
 * than left as a trap for the next one.
 *
 * The slot wrapper is supplied here too. Callers hand over bare cards and the
 * rail gives each one an equal-width slot; a horizontal content container
 * stretches its children to the tallest, so cards that fill their slot come out
 * the same height without anyone measuring anything.
 */
const SnapRailComponent: FC<SnapRailProps> = ({ itemWidth, itemHeight, children }) => {
  const slotStyle = useMemo(
    () => ({ width: itemWidth, ...(itemHeight === undefined ? null : { height: itemHeight }) }),
    [itemWidth, itemHeight],
  );

  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.content}
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      // Cards are uniform width, so one interval says what a per-render offsets
      // array said.
      snapToAlignment="start"
      snapToInterval={itemWidth + RAIL_ITEM_SPACING}
      style={styles.rail}
    >
      {/* `Children.map` keeps each child's key, so callers key their cards as
          they always did and recycling stays anchored. */}
      {Children.map(children, child =>
        child === null || child === undefined ? null : <View style={slotStyle}>{child}</View>,
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: RAIL_ITEM_SPACING,
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
  },
  rail: {
    flexGrow: 0,
    flexShrink: 0,
  },
});

export const SnapRail = memo(SnapRailComponent);
SnapRail.displayName = 'SnapRail';
