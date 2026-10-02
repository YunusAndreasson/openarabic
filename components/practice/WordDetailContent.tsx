import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BottomSheetHeader,
  BottomSheetStateHandler,
  ListRow,
  RootExplanation,
} from '@/components/common';
import { ThemedText } from '@/components/primitives/ThemedText';
import { Ionicons, TransparentHeaderButton } from '@/components/ui';
import { LAYOUT, getArabicHeroFontSize, getArabicHeroTextStyle } from '@/constants/layout';
import { getPracticeWordRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useWordAudioPlayback } from '@/hooks/audio/useWordAudioPlayback';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useDebouncedArabicFontSize } from '@/hooks/theme/useDebouncedArabicFontSize';
import { useRootEnrichment, useWordMemory } from '@/hooks/vocabulary';
import { useQuery } from '@tanstack/react-query';
import { fsrsQueries, gated } from '@/constants/queries';
import type { RootId } from '@/types/branded.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { toWordAudioData } from '@/utils/audioUtils';
import { getNextReviewLabel } from '@/utils/fsrsUtils';
import { dismissSheetThenNavigate } from '@/utils/sheetNavigation';
import { getRootLemma } from '@/utils/stringUtils';

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
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const heroFontSize = getArabicHeroFontSize(useDebouncedArabicFontSize(100));
  const heroArabicStyle = getArabicHeroTextStyle(heroFontSize);

  // Only the saved-word query belongs to this sheet. Subscribing to the due
  // queue also filtered the entire cache on mount and let unrelated queue
  // loading/errors hide an already available word.
  const { data: allWords, isLoading, error } = useQuery(gated(fsrsQueries.all, user?.id));

  // Hold the last seen word so the content stays rendered while its host
  // dismisses if the shared FSRS cache loses this root under it — e.g. a
  // remove-mutation on this exact word firing from the dictionary or the
  // practice word screen while this is open. Same pattern as
  // app/(tabs)/practice/word.tsx, same reason: guarded set-state during
  // render is the sanctioned "storing information from previous renders"
  // pattern.
  const found = allWords?.find(candidate => candidate.root_id === rootId);
  const [word, setWord] = useState<StudyWord | undefined>(found);
  if (found && found !== word) {
    setWord(found);
  }

  const memory = useWordMemory(word);
  // Keyed off the passed-in id, not the resolved word: the id is known
  // synchronously on mount, so this is in flight alongside the study-word
  // list rather than behind it. The rail also prefetches it on press.
  const enrichment = useRootEnrichment(rootId);

  const playWordAudio = useWordAudioPlayback({ showErrorToast: true });
  // Sync, with the promise explicitly discarded: `playWordAudio` catches its
  // own failures and toasts them (`showErrorToast`), so there is nothing here
  // to await and nothing to handle. Handing an async function straight to
  // `onPress` is what the rest of the app does and what the lint ratchet counts.
  const handlePlayAudio = () => {
    const audio = word && toWordAudioData(word);
    if (!audio) return;
    void playWordAudio(audio);
  };

  const { arabicText, englishText } = getRootLemma(word);

  const handleOpenInDictionary = () => {
    // Two navigations that iOS refuses to overlap: UIKit will not present from
    // a controller that is still dismissing, so the push is queued until this
    // content's own sheet has gone. This lands on the Practice tab — the row
    // says so.
    dismissSheetThenNavigate(getPracticeWordRoute(rootId));
  };

  // A family member is tappable only when the learner has that word saved —
  // see the identical note on the practice word screen, which this mirrors so
  // the two surfaces can't disagree about which rows are dead ends.
  const savedRootIds = new Set((allWords ?? []).map(saved => saved.root_id));
  const canOpenFamilyMember = (memberRootId: RootId) => savedRootIds.has(memberRootId);
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
            onPlayAudio={handlePlayAudio}
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
            <ThemedText type="body">{STRINGS.WORD_SHEET_OPEN_IN_DICTIONARY}</ThemedText>
            <Ionicons
              color={colors.textTertiary}
              name="chevron-forward"
              size={LAYOUT.BUTTON.ICON_SIZE.DISCLOSURE}
            />
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
});
