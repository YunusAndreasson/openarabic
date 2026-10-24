import { Stack, useRouter } from 'expo-router';
import type { JSX } from 'react';
import { useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListRow, LoadingState, RootExplanation } from '@/components/common';
import { ThemedText } from '@/components/primitives/ThemedText';
import { ThemedView } from '@/components/primitives/ThemedView';
import { WordMemoryPanel } from '@/components/practice';
// Direct path, not the practice barrel: this component reaches the article
// renderer and therefore Skia, and the barrel is imported by surfaces (the
// revisit sheet) that render nothing but text rows.
import { WordExampleBlock } from '@/components/practice/WordExampleBlock';
// Direct path because the OTHER caller needs it to be: `StatRow` is shared with
// the root-level word sheet, which renders two components from this folder and
// none of its swipeable dictionary rows. Imported the same way here so the rule
// is visible from both ends.
import { WordFsrsStats } from '@/components/practice/WordFsrsStats';
import { WordHeroText } from '@/components/practice/WordHeroText';
import { SkiaColoredArabic } from '@/components/common/SkiaColoredArabic';
import { PulsatingLoader } from '@/components/ui';
import { LAYOUT, MIN_TOUCH_TARGET, getCompactArabicFontSize } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useStudyWordMutations } from '@/hooks/articles/useStudyWordMutations';
import { useColors } from '@/hooks/theme/useColors';
import { useResetWordProgress, useSentencesByWord } from '@/hooks/vocabulary';
import { useSavedWordDetail } from '@/hooks/vocabulary/useSavedWordDetail';
import type { SentenceArticle } from '@/services/sentences';
import type { RootId } from '@/types/branded.types';
import { getNextReviewLabel } from '@/utils/fsrsUtils';
import { getArticleRoute, getPracticeWordRoute } from '@/utils/routeBuilders';
import { useRootIdParam } from '@/utils/routeParams';
import { getWordUsage, type WordForm } from '@/utils/wordUsage';
import { dismissAllThenNavigate } from '@/utils/sheetNavigation';

const SENTENCE_EXAMPLES_LIMIT = 5;

/** Stands in for the word while there is none to show: a spinner, or why not. */
function WordPlaceholder({ message }: { readonly message?: string }): JSX.Element {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.loadingContainer}>
        {message === undefined ? (
          <LoadingState />
        ) : (
          <ThemedText align="center" colorName="secondaryText" type="body">
            {message}
          </ThemedText>
        )}
      </View>
    </ThemedView>
  );
}

export default function PracticeWordScreen(): JSX.Element {
  const rootId = useRootIdParam();

  // The app always pushes this screen with a real id, but a deep link can
  // carry anything. Without a usable one the screen says the link is broken,
  // rather than claiming a word is missing from the list after a lookup.
  if (rootId === undefined) {
    return <WordPlaceholder message={STRINGS.WORD_SHEET_INVALID_LINK} />;
  }

  return <PracticeWordDetail rootId={rootId} />;
}

function PracticeWordDetail({ rootId }: { readonly rootId: RootId }): JSX.Element {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // The word itself, its memory, enrichment, hero style and audio — shared with
  // the root-level word sheet (WordDetailContent), so the two cannot disagree.
  // The word is held after a remove so the screen stays rendered while it
  // dismisses (the optimistic cache update deletes the word first).
  const {
    word,
    isLoading,
    error,
    memory,
    enrichment,
    arabicText,
    englishText,
    readingFontSize,
    heroArabicStyle,
    canOpenFamilyMember,
    playAudio,
  } = useSavedWordDetail(rootId);
  // The "Seen as" forms use the dense-row cap, not the hero size: six of them
  // wrap across two lines, and at hero size two would fill the screen.
  const formFontSize = getCompactArabicFontSize(readingFontSize);

  const { handleRootPress } = useStudyWordMutations();
  const { confirmReset } = useResetWordProgress();

  const {
    sentences,
    isLoading: sentencesLoading,
    isEmpty: sentencesEmpty,
  } = useSentencesByWord({
    rootId: word?.root_id,
    limit: SENTENCE_EXAMPLES_LIMIT,
    enabled: !!word?.root_id,
  });

  const handleResetProgress = useCallback(() => {
    if (!word) return;
    confirmReset(word.root_id);
  }, [word, confirmReset]);

  const handleRemove = useCallback(() => {
    if (!word) return;
    const wordRootId = word.root_id;
    Alert.alert(STRINGS.REMOVE_WORD_TITLE, STRINGS.REMOVE_WORD_CONFIRM, [
      { text: STRINGS.CANCEL, style: 'cancel' },
      {
        text: STRINGS.REMOVE,
        style: 'destructive',
        onPress: () => {
          // Explicit intent, so a stale cache can never turn this into a
          // re-add. The optimistic cache update removes the word at once; a
          // failure reverts it and is reported once, by the mutation's own
          // onError (toast and Sentry).
          void handleRootPress(wordRootId, 'remove');
          router.back();
        },
      },
    ]);
  }, [word, handleRootPress, router]);

  // Distinguish "still fetching" from "not in the list" from "the fetch
  // failed" — all three used to render the same "not in your practice list"
  // text (or, before that, an indefinite spinner), so a genuine fetch failure
  // read as a correct answer about a word that was never there. Mirrors the
  // three-way gate `BottomSheetStateHandler` gives the root-level word sheet.
  if (!word) {
    if (isLoading) return <WordPlaceholder />;
    return <WordPlaceholder message={error ? STRINGS.WORD_SHEET_ERROR : STRINGS.WORD_NOT_FOUND} />;
  }

  const nextReviewLabel = getNextReviewLabel(word.fsrs_due);

  // Part of speech and the inflected forms, both read off the examples already
  // loaded above. `roots` has neither column; the corpus is the only source.
  const usage = getWordUsage({ rootId: word.root_id, lemma: arabicText, sentences });

  // A family member opens only when it is saved too: see `canOpenFamilyMember`.
  const handleOpenFamilyMember = (memberRootId: RootId) => {
    router.push(getPracticeWordRoute(memberRootId));
  };

  const handleOpenArticle = (article: SentenceArticle, sentenceId: number) => {
    // `disableAutoScroll`: the reader normally resumes at the learner's
    // last-read sentence, which is the wrong place to land when the article was
    // opened from one word somewhere inside it.
    //
    // `dismissAllThenNavigate`, not `push`: this screen sits inside the
    // dictionary's modal and the reader is itself a root-level modal, so the
    // stack has to be emptied before the reader can present.
    dismissAllThenNavigate(getArticleRoute(article.id, { disableAutoScroll: true, sentenceId }));
  };

  return (
    <ThemedView
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      {/* The header said the literal word "Word" above whichever word you had
          opened. Stack.Title sets the title alone, so the layout's CloseButton
          and the rest of its header options stay. */}
      <Stack.Title>{englishText || STRINGS.WORD_DETAIL_TITLE}</Stack.Title>
      <ScrollView
        testID="dictionary-word-content"
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + LAYOUT.SPACING.XLARGE },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Word hero — the word leads, audio sits with it rather than floating
            below. No `weight` on Arabic: see ThemedText.

            The headword is deliberately NOT grammar-coloured, unlike the same
            word in the reader's tooltip. This is a dictionary lemma: it carries
            no prefix and no case, so there is nothing true to paint. (The
            analyzer would mostly no-op anyway — it gates on the ENGLISH word
            count, and roots.meaning is usually one word — but on the multi-word
            glosses it would succeed and colour a form that does not exist.)

            `headwordTransliteration` is 100% populated on every enriched
            record and used to be fetched, mapped onto `RootEnrichment` and
            rendered nowhere — so the only answer the app gave to "how do I
            pronounce this" was the audio button. Correct HERE and not in the
            reader's word card: this hero is `roots.letters`, the lemma, which
            is exactly what the field transliterates. The card's hero is the
            INFLECTED form, so the same string there would be a reading of a
            different word. */}
        <WordHeroText
          arabicStyle={heroArabicStyle}
          arabicText={arabicText}
          audioUrl={word.root?.audio_url}
          englishText={englishText}
          partOfSpeech={usage.partOfSpeech}
          transliteration={enrichment?.headwordTransliteration}
          onPlayAudio={playAudio}
        />

        {/* The one thing on this screen that shows the model rather than a
            reading of it: the decay this word is on, and where the schedule sits
            on that decay. */}
        {memory && <WordMemoryPanel dueLabel={nextReviewLabel} memory={memory} />}

        <WordFsrsStats memory={memory} word={word} />

        {/* Where the word comes from.

            Below the stats, not under the hero. It was tried under the hero —
            lexical identity before scheduling — and on a device the section runs
            about two and a half screens, which pushed the memory panel and every
            stat onto the third. This screen is opened from a list of words the
            learner is practising, so what it says about their memory has to stay
            reachable at a glance; the derivation is what they scroll FOR.

            It also belongs here by the rule stated below: this is the async zone,
            so nothing above it moves when it lands.

            Absent for most words, and silently so — no empty state. Coverage is
            a small fraction of the dictionary, and a band explaining its own
            emptiness on nine words in ten is worse than no band. */}
        {enrichment && (
          <RootExplanation
            canOpenFamilyMember={canOpenFamilyMember}
            enrichment={enrichment}
            onOpenFamilyMember={handleOpenFamilyMember}
          />
        )}

        {/* The forms the corpus actually shows this word in.
            Sits between the stats and the examples so the two blocks that
            arrive with the sentence query are adjacent — nothing above them
            ever moves when they land.

            Diacritics are deliberately NOT normalised away: فَسَادُ against
            فَسَادِ differing only in the final harakah is the lesson, not noise
            to be folded out. */}
        {usage.forms.length > 0 && (
          <View style={styles.formsSection}>
            <ThemedText type="overline" colorName="subtleLabelText" style={styles.sectionTitle}>
              {STRINGS.WORD_FORMS_TITLE}
            </ThemedText>
            {/* row-reverse so the forms read right-to-left, the same order the
                sentences below them do. Gap only — no dots, no chips. */}
            <View style={styles.formsRow}>
              {usage.forms.map(({ form, segments }: WordForm) => (
                <SkiaColoredArabic
                  key={form}
                  text={form}
                  segments={segments}
                  fontSize={formFontSize}
                />
              ))}
            </View>
          </View>
        )}

        {/* Example sentences from articles */}
        <View style={styles.examplesSection}>
          <ThemedText type="overline" colorName="subtleLabelText" style={styles.sectionTitle}>
            {STRINGS.WORD_EXAMPLES_TITLE}
          </ThemedText>

          {sentencesLoading && (
            <View style={styles.examplesFallback}>
              {/* Inline, inside a section — not the screen-filling LoadingState. */}
              <PulsatingLoader size={MIN_TOUCH_TARGET.LARGE} />
            </View>
          )}

          {!sentencesLoading && sentencesEmpty && (
            <View style={styles.examplesFallback}>
              <ThemedText type="body" colorName="secondaryText">
                {STRINGS.NO_SENTENCE_EXAMPLES}
              </ThemedText>
            </View>
          )}

          {!sentencesLoading &&
            !sentencesEmpty &&
            sentences.map((sentence, index) => (
              <WordExampleBlock
                key={sentence.id}
                highlightRootId={word.root_id}
                sentence={sentence}
                showDivider={index > 0}
                onOpenArticle={handleOpenArticle}
              />
            ))}
        </View>

        {/* Management actions — last in the scroll, low emphasis. Rare and
            destructive, so they get the end of the page rather than pinned
            space, and both are still one swipe away on the dictionary row. */}
        {/* Rows, not buttons: they sit in the same left-aligned scan column as
            the stat rows above and read as a continuation of them. A ghost
            ThemedButton needed `alignItems: 'flex-start'` and zeroed padding to
            fake this, which is the component telling you it is the wrong one. */}
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          <ListRow divider hapticType="selection" onPress={handleResetProgress}>
            <ThemedText type="body">{STRINGS.RESET_PROGRESS_ACTION}</ThemedText>
          </ListRow>
          <ListRow hapticType="selection" onPress={handleRemove}>
            <ThemedText colorName="error" type="body">
              {STRINGS.REMOVE_FROM_PRACTICE_ACTION}
            </ThemedText>
          </ListRow>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    // Was XLARGE to clear a sheet grabber; the screen now pushes under a real
    // header, which supplies its own separation — and the hero's meta band adds
    // its own lead above the word, so this drops another step.
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  formsSection: {
    marginTop: LAYOUT.SPACING.XLARGE,
  },
  formsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  examplesSection: {
    marginTop: LAYOUT.SPACING.XLARGE,
  },
  sectionTitle: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  examplesFallback: {
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.XLARGE,
  },
  actions: {
    marginTop: LAYOUT.SPACING.XLARGE,
    borderTopWidth: LAYOUT.BORDER.WIDTH.HAIRLINE,
  },
});
