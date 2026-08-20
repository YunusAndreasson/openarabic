import type { JSX } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheetHeader, BottomSheetStateHandler, ListRow } from '@/components/common';
import { WordListRow } from '@/components/practice';
import { ThemedText } from '@/components/primitives/ThemedText';
import { Ionicons } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';
import { getPracticeWordRoute, ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useWordsToRevisit } from '@/hooks/vocabulary/useWordsToRevisit';
import type { StudyWord } from '@/types/vocabulary.types';
import { getHorizonAccessibilityLabel, getMemoryHorizonDays } from '@/utils/memoryHorizon';
import { dismissSheetThenNavigate } from '@/utils/sheetNavigation';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

function formatForgotCount(count: number): string {
  return STRINGS.FORGOT_N_TIMES.replace('{count}', String(count));
}

interface LeechRowProps {
  word: StudyWord;
  divider: boolean;
}

/**
 * One struggling word, in the SAME row the dictionary index uses.
 *
 * It used to be its own composition — Arabic stacked above the gloss, an error
 * `Badge`, an inline reset button — which made the same objects out of the same
 * cache look like a different kind of thing depending on which screen you
 * reached them from. On the shared one-line row the 0.6 detent also shows
 * meaningfully more of the twenty.
 *
 * **The forgot-count is plain text, not a red badge.** Every row here is a
 * leech, so colouring all twenty as errors says nothing that the sheet's own
 * title has not already said — the failure `MEMORY_STAGE_COLORS` refuses for the
 * same reason.
 *
 * **No inline reset.** It is destructive and rare, and it now sits one tap away
 * on the word screen this row opens (and one swipe away in the dictionary's
 * `struggling` scope). The sheet promises another pass at these words, not a
 * way to wipe them.
 */
function LeechRow({ word, divider }: LeechRowProps): JSX.Element {
  const letters = word.root?.letters ?? '';
  const meaning = capitalizeFirstLetter(word.root?.meaning ?? '');
  const lapses = word.fsrs_lapses ?? 0;

  return (
    <WordListRow
      accessibilityLabel={`${letters}, ${meaning}, ${formatForgotCount(lapses)}, ${getHorizonAccessibilityLabel(
        getMemoryHorizonDays(word),
      )}`}
      arabic={letters}
      divider={divider}
      gloss={meaning}
      trailing={
        <ThemedText type="caption" colorName="textTertiary">
          {formatForgotCount(lapses)}
        </ThemedText>
      }
      // Twenty rows about words the learner is being told to act on, leading
      // nowhere, was the defect. `dismissSheetThenNavigate` because nothing can
      // present from a sheet that is still dismissing.
      onPress={() => dismissSheetThenNavigate(getPracticeWordRoute(word.root_id))}
    />
  );
}

/**
 * The way out of a capped list.
 *
 * This sheet ranks and shows the hardest `LEECH_LIST_LIMIT` (20). The tile that
 * opens it counts every leech, uncapped — deliberately, because saying "20" to
 * someone with 47 is a lie — so the two disagree by design, and until now the
 * sheet was where that disagreement dead-ended: twenty rows, nothing saying more
 * existed, and no route to them.
 *
 * The dictionary already holds the answer. `struggling` is one of its four
 * picker scopes and it runs the SAME `isLeechWord` predicate this list ranks by,
 * so the two can never disagree about which words qualify — only about how many
 * of them are shown.
 *
 * Rendered only when the list actually truncated. Offering to "see all" the
 * twenty words already on screen would be a drill-down leading back to what you
 * just read.
 */
function SeeAllRow({ total, shown }: { total: number; shown: number }): JSX.Element {
  const colors = useColors();

  return (
    <ListRow
      density="compact"
      accessibilityLabel={STRINGS.WORDS_TO_REVISIT_SEE_ALL_A11Y.replace('{count}', String(total))}
      onPress={() =>
        dismissSheetThenNavigate({
          pathname: ROUTE_PATHS.PRACTICE_DICTIONARY,
          params: { scope: 'struggling' },
        })
      }
    >
      <View style={styles.wordColumn}>
        <ThemedText type="body">
          {STRINGS.WORDS_TO_REVISIT_SEE_ALL.replace('{count}', String(total))}
        </ThemedText>
        <ThemedText type="caption" colorName="textTertiary" numberOfLines={1}>
          {STRINGS.WORDS_TO_REVISIT_SEE_ALL_HINT.replace('{shown}', String(shown))}
        </ThemedText>
      </View>

      <Ionicons
        color={colors.textTertiary}
        name="chevron-forward"
        size={LAYOUT.BUTTON.ICON_SIZE.DISCLOSURE}
      />
    </ListRow>
  );
}

/**
 * The one sheet that genuinely scrolls — up to `LEECH_LIST_LIMIT` (20) rows
 * never fit a `fitToContents` detent, so this route uses a fixed one.
 *
 * Its layout is dictated by react-native-screens, not by taste. On iOS a form
 * sheet's scroll view is only sized correctly when it is a *direct* child of the
 * screen, at index 0, or at index 1 behind a single non-collapsable header view
 * (`RNSScreenContentWrapper.coerceChildScrollViewComponentSizeToSize`). Anything
 * deeper — e.g. the shared `SheetScreen` padding container in between — misses
 * that path, and the fallback force-sets the scroll view's frame to the *whole
 * screen view*: the rows jump to the sheet's top-left corner at full sheet size,
 * painting over the header and ignoring the container's padding. So:
 *
 * - no `SheetScreen` here; the header and the scroll view are the screen's own
 *   two children, and the sheet background comes from the route's `contentStyle`
 * - `collapsable={false}` on the header, or view flattening removes it from the
 *   native hierarchy and the scroll view silently becomes child 0
 * - padding lives on the header and on `contentContainerStyle`, never on a
 *   wrapper around the scroll view
 */
export default function WordsToRevisitScreen(): JSX.Element {
  const { leeches, totalCount, isLoading, isError } = useWordsToRevisit();
  const insets = useSafeAreaInsets();

  return (
    <>
      <View collapsable={false} style={styles.header}>
        <BottomSheetHeader
          title={STRINGS.WORDS_TO_REVISIT}
          subtitle={STRINGS.WORDS_TO_REVISIT_SUBTITLE}
        />
      </View>

      <BottomSheetStateHandler
        isLoading={isLoading}
        isError={isError}
        isEmpty={leeches.length === 0}
        loadingMessage={STRINGS.LOADING_WORDS_TO_REVISIT}
        errorMessage={STRINGS.FAILED_TO_LOAD_WORDS_TO_REVISIT}
        emptyMessage={STRINGS.WORDS_TO_REVISIT_EMPTY_STATE}
      >
        <ScrollView
          // `flex: 1` is what sizes this on Android and pre-empts the iOS
          // correction; the fixed detent gives the wrapper a definite height,
          // so there is nothing here for iOS to measure and lose.
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + LAYOUT.SPACING.MEDIUM },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {leeches.map((word, index) => (
            <LeechRow
              key={word.root_id}
              word={word}
              // No rule under the last row — unless the overflow row follows it,
              // in which case the rule separates them rather than trailing off
              // before content that isn't there.
              divider={index < leeches.length - 1 || totalCount > leeches.length}
            />
          ))}

          {totalCount > leeches.length && <SeeAllRow total={totalCount} shown={leeches.length} />}
        </ScrollView>
      </BottomSheetStateHandler>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    // Clears the OS grabber pill, which otherwise draws through the title.
    paddingTop: LAYOUT.SPACING.XLARGE,
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
  },
  wordColumn: {
    flex: 1,
    gap: LAYOUT.SPACING.TINY,
  },
});
