import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { MAX_PULSE_SCALE } from '@/components/ui/PulsatingLoader';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

// Siblings by direct path, never through `@/components/common` — going through
// the barrel closes an import cycle (see the note in ui/index.ts).
import { ErrorState } from './ErrorState';
import { LOADING_STATE_LOADER_SIZE, LoadingState } from './LoadingState';

/** One line of `type="body"` copy — the message under the loader. Mirrors
 *  ThemedText's own `body` line height, rather than guessing at it. */
const STATE_MESSAGE_LINE_HEIGHT = LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LINE_HEIGHT_MULTIPLIERS.NORMAL;

export interface BottomSheetStateHandlerProps {
  /**
   * Whether data is currently loading
   */
  isLoading?: boolean;

  /**
   * Whether an error occurred
   */
  isError?: boolean;

  /**
   * Whether data is empty (no content to show)
   */
  isEmpty?: boolean;

  /**
   * Custom loading message (defaults to STRINGS.LOADING_GENERIC)
   */
  loadingMessage?: string;

  /**
   * Custom error message (defaults to STRINGS.ERROR_LOADING_DATA)
   */
  errorMessage?: string;

  /**
   * Custom empty state message
   */
  emptyMessage?: string;

  /**
   * Content to render when data is successfully loaded
   */
  children: ReactNode;
}

/**
 * The floor all three states share, so a load that ends in an error does not
 * resize the sheet under the reader (see the height-swap rule these form sheets
 * were tuned against).
 *
 * DERIVED, not a magic number: it was written as a literal `148` "fits the 64pt
 * loader", and then the loader started reserving its full pulse (64 × 1.2 =
 * 76.8) and the stated derivation was 12.8pt stale with nothing to catch it.
 * Built from the same constants the content is, it cannot drift again.
 */
const STATE_MIN_HEIGHT = Math.ceil(
  LOADING_STATE_LOADER_SIZE * MAX_PULSE_SCALE + // the loader's reserved box
    LAYOUT.SPACING.LARGE + // LoadingState's message marginTop
    STATE_MESSAGE_LINE_HEIGHT + // one line of body copy
    LAYOUT.SPACING.XLARGE * 2, // the container's own paddingVertical
);

/**
 * Routes a bottom sheet's content through the app's shared loading, error and
 * empty states.
 *
 * It used to render all three itself, as three centred `ThemedText`s. The
 * error branch was a second copy of `ErrorState`, and the loading branch was
 * the word "Loading…" sitting still — the only surface in the app that
 * answered a wait with static text while every other one ran a
 * `PulsatingLoader`. Opening a sheet therefore looked like a sheet that had
 * finished loading and had nothing to say.
 *
 * The empty branch stays local: `EmptyState` is an icon, a title and a hint
 * built for a full screen, and these callers have only a sentence.
 *
 * All three states share one container, and it gives them a MINIMUM height plus
 * `flexGrow` rather than `flex: 1`. `LoadingState` and `ErrorState` are
 * flex-filled by design — they were written for full screens — and `flex: 1`'s
 * zero basis has to resolve against the parent's height, which a `fitToContents`
 * form sheet does not have: it is trying to derive its height from this content.
 * `study-streak` is exactly that sheet, so while its query was in flight the
 * sheet had nothing to measure. Growing from an `auto` basis keeps that sheet
 * measurable AND still fills a sheet that does have a height, so these states
 * stay centred in `words-to-revisit` instead of pinned to its top. See
 * STATE_MIN_HEIGHT for why the floor is shared.
 */
export function BottomSheetStateHandler({
  isLoading = false,
  isError = false,
  isEmpty = false,
  loadingMessage = STRINGS.LOADING_GENERIC,
  errorMessage = STRINGS.ERROR_LOADING_DATA,
  emptyMessage,
  children,
}: BottomSheetStateHandlerProps): ReactNode {
  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <LoadingState message={loadingMessage} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.stateContainer}>
        <ErrorState message={errorMessage} />
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View style={styles.stateContainer}>
        <ThemedText align="center" type="body" colorName="textTertiary">
          {emptyMessage}
        </ThemedText>
      </View>
    );
  }

  // Success state - render children
  return children;
}

const styles = StyleSheet.create({
  stateContainer: {
    paddingVertical: LAYOUT.SPACING.XLARGE,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: STATE_MIN_HEIGHT,
    // `flexGrow`, deliberately NOT `flex: 1`. The shorthand also sets
    // `flexBasis: 0`, which is what broke `study-streak`: a zero basis has to
    // resolve against a parent height, and a `fitToContents` sheet is trying to
    // derive its height from THIS. Grow with an `auto` basis is content-sized
    // when there is no height to fill — so that sheet still measures — and
    // fills when there is, which keeps these states centred in a full-height
    // sheet (`words-to-revisit`) instead of pinned to the top of one.
    flexGrow: 1,
  },
});
