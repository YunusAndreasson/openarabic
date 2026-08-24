import { useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BottomSheetHeader,
  BottomSheetStateHandler,
  ListRow,
  RootExplanation,
} from '@/components/common';
// Direct paths, not the practice barrel: this sheet renders three of that
// folder's components and none of its swipeable dictionary rows, and the barrel
// would drag the lot into a route whose whole point is to open fast.
import { WordFsrsStats } from '@/components/practice/WordFsrsStats';
import { WordHeroText } from '@/components/practice/WordHeroText';
import { WordMemoryPanel } from '@/components/practice/WordMemoryPanel';
import { ThemedText } from '@/components/primitives/ThemedText';
import { Ionicons } from '@/components/ui';
import { LAYOUT, getArabicHeroFontSize, getArabicHeroTextStyle } from '@/constants/layout';
import { getPracticeWordRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useWordAudioPlayback } from '@/hooks/audio/useWordAudioPlayback';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useDebouncedArabicFontSize } from '@/hooks/theme/useDebouncedArabicFontSize';
import { useFSRSQueries, useRootEnrichment, useWordMemory } from '@/hooks/vocabulary';
import type { RootId } from '@/types/branded.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { toWordAudioData } from '@/utils/audioUtils';
import { getNextReviewLabel } from '@/utils/fsrsUtils';
import { dismissSheetThenNavigate } from '@/utils/sheetNavigation';
import { getRootLemma } from '@/utils/stringUtils';

/**
 * One saved word, as a sheet that can present over any tab.
 *
 * **Why this is a route and not a `<BottomSheet>` on the Explore screen.** The
 * app has exactly three gorhom sheet instances and they are all owned by a
 * screen that can host one; Explore cannot. Its container is a plain
 * `ScrollView`, and gorhom's sheet is `position: absolute; top: 0`, which
 * resolves against the nearest parent — inside a scroll view that is the top of
 * the *content*, so the sheet sizes to the full scroll height and scrolls away
 * with the page. Everything else in this app that looks like a sheet is a
 * `presentation: 'formSheet'` route, and so is this.
 *
 * **Why not `/(tabs)/practice/word`.** That screen answers the same question and
 * answers more of it, but it lives inside the practice stack by design, so
 * opening it from Explore means changing tabs before the learner has seen
 * anything. This sheet carries what a glance is for — how well the word is held,
 * when it comes back, where it comes from — and hands off to that screen for the
 * examples and the destructive actions.
 *
 * **Layout is dictated by react-native-screens, not taste.** On iOS a form
 * sheet's scroll view is sized correctly only when it is a direct child of the
 * screen at index 0, or at index 1 behind a single non-collapsable header view.
 * Anything deeper and the fallback force-sets the scroll view's frame to the
 * whole screen view — content jumps to the sheet's top-left corner at full sheet
 * size and paints over the header. So: two children, `collapsable={false}` on
 * the first (view flattening would otherwise remove it and make the scroll view
 * child 0), padding on the header and on `contentContainerStyle` and never on a
 * wrapper in between, and the background from the route's `contentStyle`. The
 * same rules `app/words-to-revisit.tsx` documents, for the same reason.
 *
 * The hero is that header — so the word stays on screen while its numbers
 * scroll, which is what makes the sheet readable at the 0.6 detent.
 */
export default function WordDetailSheet(): JSX.Element {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { rootId: rootIdParam } = useLocalSearchParams<{ rootId?: string }>();
  const rootId = Number(rootIdParam) as RootId;
  // The route is reachable by a real external deep link, unlike the practice
  // word screen (always pushed with a known-good id) — a missing or malformed
  // param needs a distinct message from "removed from another screen", not the
  // same WORD_NOT_FOUND claim about a link that never carried a valid id.
  const hasValidRootId = !Number.isNaN(rootId);

  const heroFontSize = getArabicHeroFontSize(useDebouncedArabicFontSize(100));
  const heroArabicStyle = getArabicHeroTextStyle(heroFontSize);

  // `useFSRSQueries` rather than `useStudyWordByRoot`: this screen has to tell
  // "still fetching" apart from "not in the practice list", and the narrower
  // hook returns only data. Opened from the Explore rail the cache is already
  // warm — the rail was rendered from it — so the loading state is really for a
  // cold deep link.
  const { allWords, isLoading, error } = useFSRSQueries({ userId: user?.id });

  // Hold the last seen word so the sheet stays rendered while it dismisses if
  // the shared FSRS cache loses this root under it — e.g. a remove-mutation on
  // this exact word firing from the dictionary or the practice word screen
  // while this sheet happens to be open. Same pattern as
  // app/(tabs)/practice/word.tsx, same reason: guarded set-state during render
  // is the sanctioned "storing information from previous renders" pattern.
  const found = allWords?.find(candidate => candidate.root_id === rootId);
  const [word, setWord] = useState<StudyWord | undefined>(found);
  if (found && found !== word) {
    setWord(found);
  }

  const memory = useWordMemory(word);
  // Keyed off the ROUTE param, not the resolved word: the id is known
  // synchronously on mount, so this is in flight alongside the study-word list
  // rather than behind it. The rail also prefetches it on press.
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
    // a controller that is still dismissing, so the push is queued until the
    // sheet has gone. This lands on the Practice tab — the row says so.
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
        // that keeps refetching underneath this sheet, and a background refresh
        // that fails still leaves the word on screen. Reporting the error over a
        // word we are holding would replace something correct with an apology.
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

          {/* Everything this sheet does not carry — the inflected forms, the
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
}

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
  // Layout itself lives in WordHeroText; this is the gap between the hero and
  // the ScrollView below it.
  hero: {
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  openRow: {
    justifyContent: 'space-between',
  },
});
