import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BottomSheetHeader,
  BottomSheetStateHandler,
  ListRow,
  RootExplanation,
} from '@/components/common';
import { ThemedText } from '@/components/primitives/ThemedText';
import { DisclosureChevron, TransparentHeaderButton } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useSavedWordDetail } from '@/hooks/vocabulary/useSavedWordDetail';
import type { RootId } from '@/types/branded.types';
import { getNextReviewLabel } from '@/utils/fsrsUtils';
import { getPracticeWordRoute } from '@/utils/routeBuilders';
import { dismissSheetThenNavigate } from '@/utils/sheetNavigation';

import { WordFsrsStats } from './WordFsrsStats';
import { WordHeroText } from './WordHeroText';
import { WordMemoryPanel } from './WordMemoryPanel';

interface WordDetailContentProps {
  rootId: RootId;
  /** False only for a malformed `/word-detail` deep-link param — see that route. Every other caller always has a real id. */
  hasValidRootId?: boolean;
  /**
   * Renders a back control in the header that calls this instead of the
   * content relying on the sheet's own dismissal. Pass this when embedding
   * the content inside another sheet's own view state (`words-to-revisit`)
   * rather than presenting it as the standalone `/word-detail` route.
   */
  onBack?: () => void;
}

/**
 * One saved word — hero, memory panel, FSRS stats, root family. Shared
 * between the root-level `/word-detail` sheet and the inline detail view
 * `words-to-revisit` swaps in over its own list, so opening a word from that
 * list no longer needs a second navigation (dismiss the list sheet, wait for
 * iOS to finish closing it, present a new screen — see `sheetNavigation.ts`
 * for why that round trip costs the better part of a second on iOS).
 *
 * `handleOpenInDictionary` and `handleOpenFamilyMember` still go through
 * `dismissSheetThenNavigate`: their destination is the practice tab's own
 * word screen, which is a different navigation context no matter which sheet
 * this content is rendered inside, so that hop is unavoidable there.
 */
export const WordDetailContent = ({
  rootId,
  hasValidRootId = true,
  onBack,
}: WordDetailContentProps) => {
  const insets = useSafeAreaInsets();

  // Shared with the practice tab's word screen, so the two surfaces cannot
  // disagree about the word, its memory or which family rows are dead ends.
  // The rail also prefetches the enrichment on press.
  const {
    word,
    isLoading,
    error,
    memory,
    enrichment,
    arabicText,
    englishText,
    heroArabicStyle,
    canOpenFamilyMember,
    playAudio,
  } = useSavedWordDetail(rootId);

  const handleOpenInDictionary = () => {
    // Two navigations that iOS refuses to overlap: UIKit will not present from
    // a controller that is still dismissing, so the push is queued until this
    // content's own sheet has gone. This lands on the Practice tab — the row
    // says so.
    dismissSheetThenNavigate(getPracticeWordRoute(rootId));
  };

  const handleOpenFamilyMember = (memberRootId: RootId) => {
    // Same two-step as `handleOpenInDictionary`, and for the same reason: this
    // sheet has to be gone before the practice tab's own word screen can
    // present over it.
    dismissSheetThenNavigate(getPracticeWordRoute(memberRootId));
  };

  return (
    <>
      <View collapsable={false} style={styles.header}>
        {onBack ? (
          <View style={styles.backRow}>
            <TransparentHeaderButton
              accessibilityLabel={STRINGS.WORDS_TO_REVISIT_BACK_A11Y}
              icon="chevron-back"
              size="small"
              onPress={onBack}
            />
          </View>
        ) : null}

        {word ? (
          // The lemma, and deliberately uncoloured: `roots.letters` carries no
          // prefix and no case, so grammar colouring would have nothing true
          // to paint. One line, so the reading-size setting cannot push the
          // numbers below the fold.
          <WordHeroText
            arabicStyle={heroArabicStyle}
            arabicText={arabicText}
            audioUrl={word.root?.audio_url}
            englishText={englishText}
            style={styles.hero}
            transliteration={enrichment?.headwordTransliteration}
            onPlayAudio={playAudio}
          />
        ) : (
          <BottomSheetHeader title={STRINGS.WORD_DETAIL_TITLE} />
        )}
      </View>

      <BottomSheetStateHandler
        emptyMessage={hasValidRootId ? STRINGS.WORD_NOT_FOUND : STRINGS.WORD_SHEET_INVALID_LINK}
        errorMessage={STRINGS.WORD_SHEET_ERROR}
        // All three gates are `&& !word`: the study-word list is a shared cache
        // that keeps refetching underneath this content, and a background
        // refresh that fails still leaves the word on screen. Reporting the
        // error over a word we are holding would replace something correct
        // with an apology.
        isEmpty={!word}
        isError={Boolean(error) && !word}
        isLoading={isLoading && !word}
        loadingMessage={STRINGS.WORD_SHEET_LOADING}
      >
        <ScrollView
          testID="word-detail-body"
          // `flex: 1` is what sizes this on Android and pre-empts the iOS
          // correction; the fixed detent gives the wrapper a definite height, so
          // there is nothing here for iOS to measure and lose.
          style={styles.body}
          contentContainerStyle={[
            styles.bodyContent,
            { paddingBottom: insets.bottom + LAYOUT.SPACING.MEDIUM },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* The only thing here that shows the model rather than a reading of
              it: the decay this word is on, and where the schedule sits on it. */}
          {memory && word ? (
            <WordMemoryPanel dueLabel={getNextReviewLabel(word.fsrs_due)} memory={memory} />
          ) : null}

          {word ? <WordFsrsStats memory={memory} variant="sheet" word={word} /> : null}

          {/* Absent for most words, and silently so — coverage is a small
              fraction of the dictionary, and a band explaining its own emptiness
              on nine words in ten is worse than no band. */}
          {enrichment ? (
            <RootExplanation
              canOpenFamilyMember={canOpenFamilyMember}
              enrichment={enrichment}
              variant="sheet"
              onOpenFamilyMember={handleOpenFamilyMember}
            />
          ) : null}

          {/* Everything this content does not carry — the inflected forms, the
              example sentences, reset and remove — lives on the word screen,
              which is inside the practice stack. Named for where it lands
              because it lands on another tab. */}
          <ListRow
            accessibilityLabel={STRINGS.WORD_SHEET_OPEN_IN_DICTIONARY_A11Y.replace(
              '{word}',
              englishText,
            )}
            style={styles.openRow}
            onPress={handleOpenInDictionary}
          >
            <ThemedText style={styles.openLabel} type="body">
              {STRINGS.WORD_SHEET_OPEN_IN_DICTIONARY}
            </ThemedText>
            <DisclosureChevron />
          </ListRow>
        </ScrollView>
      </BottomSheetStateHandler>
    </>
  );
};

WordDetailContent.displayName = 'WordDetailContent';

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
  },
  header: {
    // Clears the OS grabber pill, which otherwise draws through the hero.
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    paddingTop: LAYOUT.SPACING.XLARGE,
  },
  backRow: {
    alignSelf: 'flex-start',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  // Layout itself lives in WordHeroText; this is the gap between the hero and
  // the ScrollView below it.
  hero: {
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  openRow: {
    justifyContent: 'space-between',
  },
  openLabel: {
    flex: 1,
  },
});
