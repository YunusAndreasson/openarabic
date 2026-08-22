import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useMemo, useState } from 'react';
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
import { SkiaColoredArabic } from '@/components/common/SkiaColoredArabic';
import { IconButton, PulsatingLoader } from '@/components/ui';
import {
  LAYOUT,
  MIN_TOUCH_TARGET,
  getArabicHeroFontSize,
  getCompactArabicFontSize,
} from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useStudyWordMutations } from '@/hooks/articles/useStudyWordMutations';
import { useWordAudioPlayback } from '@/hooks/audio/useWordAudioPlayback';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useDebouncedArabicFontSize } from '@/hooks/theme/useDebouncedArabicFontSize';
import {
  useFSRSQueries,
  useResetWordProgress,
  useRootEnrichment,
  useSentencesByWord,
  useWordMemory,
} from '@/hooks/vocabulary';
import type { SentenceArticle } from '@/services/sentences';
import type { SolidColorName } from '@/constants/colors';
import type { RootId } from '@/types/branded.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import { getNextReviewLabel } from '@/utils/fsrsUtils';
import { getArticleRoute, getPracticeWordRoute } from '@/utils/routeBuilders';
import { getWordUsage, type WordForm } from '@/utils/wordUsage';
import { dismissAllThenNavigate } from '@/utils/sheetNavigation';
import { capitalizeFirstLetter } from '@/utils/stringUtils';
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS, getWordDifficultyLevel } from '@/utils/urgencyScore';

const SENTENCE_EXAMPLES_LIMIT = 5;

interface StatRowProps {
  label: string;
  value: string;
  /** Omit for values that carry no judgement (a due date isn't good or bad) */
  colorName?: SolidColorName;
}

/**
 * One label/value pair as a hairline row.
 *
 * Replaces a three-column stat block: equal-width columns gave Strength,
 * Difficulty and Next review identical weight, and with two of the three
 * colored red a perfectly normal word read as an error state. Rows also put
 * this screen on the same left-aligned scan axis as the dictionary list.
 */
function StatRow({ label, value, colorName }: StatRowProps): JSX.Element {
  return (
    <ListRow divider style={styles.statRow}>
      <ThemedText colorName="secondaryText" type="body">
        {label}
      </ThemedText>
      <ThemedText colorName={colorName} type="bodyBold">
        {value}
      </ThemedText>
    </ListRow>
  );
}

export default function PracticeWordScreen(): JSX.Element {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { rootId: rootIdParam } = useLocalSearchParams<{ rootId?: string }>();
  const rootId = Number(rootIdParam) as RootId;

  // Debounced like every other Arabic surface, so dragging the size slider does
  // not re-render the headword on every tick.
  const readingFontSize = useDebouncedArabicFontSize(100);
  const heroFontSize = getArabicHeroFontSize(readingFontSize);
  // The "Seen as" forms use the dense-row cap, not the hero size: six of them
  // wrap across two lines, and at hero size two would fill the screen.
  const formFontSize = getCompactArabicFontSize(readingFontSize);
  const heroArabicStyle = useMemo(
    () => ({
      fontSize: heroFontSize,
      lineHeight: Math.round(heroFontSize * 1.58), // headroom for diacritics
    }),
    [heroFontSize],
  );

  const { allWords, isLoading } = useFSRSQueries({ userId: user?.id });
  const { toggleRootMutation } = useStudyWordMutations();
  const toggleRoot = toggleRootMutation.mutateAsync;
  const { confirmReset } = useResetWordProgress();

  // Hold the last seen word so the sheet stays rendered while it dismisses
  // after a remove (the optimistic cache update deletes the word first).
  // Guarded set-state during render is the sanctioned "storing information
  // from previous renders" pattern.
  const found = useMemo(
    () => allWords?.find(candidate => candidate.root_id === rootId),
    [allWords, rootId],
  );
  const [word, setWord] = useState<StudyWord | undefined>(found);
  if (found && found !== word) {
    setWord(found);
  }

  const memory = useWordMemory(word);

  // Keyed off the ROUTE param, not the resolved word: the id is known
  // synchronously on mount, so this is already in flight while the study-word
  // list is still loading rather than starting a round trip behind it.
  const enrichment = useRootEnrichment(rootId);

  const {
    sentences,
    isLoading: sentencesLoading,
    isEmpty: sentencesEmpty,
  } = useSentencesByWord({
    rootId: word?.root_id,
    limit: SENTENCE_EXAMPLES_LIMIT,
    enabled: !!word?.root_id,
  });

  const playWordAudio = useWordAudioPlayback({ showErrorToast: true });

  const handlePlayAudio = useCallback(async () => {
    if (!word?.root) return;
    await playWordAudio({
      id: word.root_id,
      audio_url: word.root.audio_url,
      audio_url_en: word.root.audio_url_en,
      letters: word.root.letters,
      meaning: word.root.meaning,
    });
  }, [word, playWordAudio]);

  const handleResetProgress = useCallback(() => {
    if (!word) return;
    confirmReset(word.root_id);
  }, [word, confirmReset]);

  const handleRemove = useCallback(() => {
    if (!user?.id || !word) return;
    const userId = user.id;
    const wordRootId = word.root_id;
    Alert.alert(STRINGS.REMOVE_WORD_TITLE, STRINGS.REMOVE_WORD_CONFIRM, [
      { text: STRINGS.CANCEL, style: 'cancel' },
      {
        text: STRINGS.REMOVE,
        style: 'destructive',
        onPress: () => {
          // Optimistic cache update removes the word immediately; failures
          // revert the cache and surface a toast.
          toggleRoot({ userId, rootId: wordRootId, intent: 'remove' }).catch(error =>
            handleError(error, {
              showToast: true,
              toastMessage: STRINGS.FAILED_TO_DELETE_WORD,
              captureSentry: !__DEV__,
            }),
          );
          router.back();
        },
      },
    ]);
  }, [user, word, toggleRoot, router]);

  // Distinguish "still fetching" from "not in the list". Both used to render an
  // indefinite spinner, so a word that genuinely wasn't there (removed from
  // another screen, stale deep link) looked like a screen that never loaded.
  if (!word) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          {isLoading ? (
            <LoadingState />
          ) : (
            <ThemedText align="center" colorName="secondaryText" type="body">
              {STRINGS.WORD_NOT_FOUND}
            </ThemedText>
          )}
        </View>
      </ThemedView>
    );
  }

  const arabicText = word.root?.letters ?? '';
  const englishText = capitalizeFirstLetter(word.root?.meaning ?? '');
  // Same level → same color as the dot on this word's dictionary row
  const difficultyLevel = getWordDifficultyLevel(word);
  const nextReviewLabel = getNextReviewLabel(word.fsrs_due);

  // Part of speech and the inflected forms, both read off the examples already
  // loaded above. `roots` has neither column; the corpus is the only source.
  const usage = getWordUsage({ rootId: word.root_id, lemma: arabicText, sentences });

  // A family member is tappable only when the learner has that word saved: this
  // screen renders WORD_NOT_FOUND for anything outside the practice list, so a
  // link to an unsaved word is a dead end. The check is handed to the component
  // PER MEMBER — it used to be an all-or-nothing prop, which meant one saved
  // member made all five look pressable.
  const savedRootIds = new Set((allWords ?? []).map(saved => saved.root_id));
  const canOpenFamilyMember = (memberRootId: RootId) => savedRootIds.has(memberRootId);
  const handleOpenFamilyMember = (memberRootId: RootId) => {
    router.push(getPracticeWordRoute(memberRootId));
  };

  const handleOpenArticle = (article: SentenceArticle) => {
    // `disableAutoScroll`: the reader normally resumes at the learner's
    // last-read sentence, which is the wrong place to land when the article was
    // opened from one word somewhere inside it.
    //
    // `dismissAllThenNavigate`, not `push`: this screen sits inside the
    // dictionary's modal and the reader is itself a root-level modal, so the
    // stack has to be emptied before the reader can present.
    dismissAllThenNavigate(getArticleRoute(article.id, article.title, true));
  };

  return (
    <ThemedView style={styles.container}>
      {/* The header said the literal word "Word" above whichever word you had
          opened. `setOptions` merges, so the layout's CloseButton and its
          fallback title both stay. */}
      <Stack.Screen options={{ title: englishText || STRINGS.WORD_DETAIL_TITLE }} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + LAYOUT.SPACING.XLARGE },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Word hero — the word leads, audio sits with it rather than floating
            below. Left-aligned to match the header title directly above it and
            every other surface in the app. No `weight` on Arabic: see ThemedText.

            The headword is deliberately NOT grammar-coloured, unlike the same
            word in the reader's tooltip. This is a dictionary lemma: it carries
            no prefix and no case, so there is nothing true to paint. (The
            analyzer would mostly no-op anyway — it gates on the ENGLISH word
            count, and roots.meaning is usually one word — but on the multi-word
            glosses it would succeed and colour a form that does not exist.) */}
        <View style={styles.hero}>
          <View style={styles.heroText}>
            {/* Fixed height, like the review card's meta row: the class comes
                from the example rows, which land a beat after the word, and a
                band that grew on arrival would drop the hero mid-read. */}
            <View style={styles.heroMeta}>
              {usage.partOfSpeech ? (
                <ThemedText type="overline" colorName="tint">
                  {usage.partOfSpeech}
                </ThemedText>
              ) : null}
            </View>
            <ThemedText type="arabic" align="left" numberOfLines={1} style={heroArabicStyle}>
              {arabicText}
            </ThemedText>
            {/* How to say it. `headwordTransliteration` is 100% populated on
                every enriched record and was being fetched, mapped onto
                `RootEnrichment` and rendered nowhere — so the only answer the
                app gave to "how do I pronounce this" was the audio button.

                Correct HERE and not in the reader's word card: this hero is
                `roots.letters`, the lemma, which is exactly what the field
                transliterates. The card's hero is the INFLECTED form, so the
                same string there would be a reading of a different word.

                Height-reserved, like the class band above it: this comes from
                the enrichment query, so it lands a beat after the word and
                without the reserve it would push the gloss, the memory panel
                and every stat down mid-read — the one thing the rest of this
                screen is arranged to avoid. The reserve costs an empty line on
                the ~15% of words with no record, which is the cheaper failure.
                `minHeight` for the same reason `heroMeta` uses it: a fixed
                height clips the line once the OS text scale climbs. */}
            <View style={styles.heroReading}>
              {enrichment?.headwordTransliteration ? (
                <ThemedText type="body" colorName="textTertiary">
                  {enrichment.headwordTransliteration}
                </ThemedText>
              ) : null}
            </View>
            <ThemedText type="body" colorName="secondaryText">
              {englishText}
            </ThemedText>
          </View>
          {word.root?.audio_url && (
            <IconButton
              icon="volume-high"
              onPress={handlePlayAudio}
              backgroundColor={colors.elevation2}
              iconColor={colors.text}
              hapticType="light"
              accessibilityLabel={STRINGS.PLAY_AUDIO}
            />
          )}
        </View>

        {/* The one thing on this screen that shows the model rather than a
            reading of it: the decay this word is on, and where the schedule sits
            on that decay. */}
        {memory && <WordMemoryPanel dueLabel={nextReviewLabel} memory={memory} />}

        {/* FSRS stats — one hairline row each */}
        <View style={[styles.stats, { borderTopColor: colors.border }]}>
          <StatRow
            colorName={DIFFICULTY_COLORS[difficultyLevel]}
            label={STRINGS.WORD_STAT_DIFFICULTY}
            value={DIFFICULTY_LABELS[difficultyLevel]}
          />
          <StatRow label={STRINGS.WORD_STAT_NEXT_REVIEW} value={nextReviewLabel} />
          {/* Feedforward: what recalling it would buy, stated before the learner
              spends the effort. The figure comes from the same ts-fsrs call the
              review screen's grade bar previews with, so it cannot promise an
              interval that grading would not give. */}
          {memory?.nextHorizonLabel && (
            <StatRow
              label={STRINGS.WORD_STAT_NEXT_GAIN}
              value={STRINGS.WORD_STAT_NEXT_GAIN_VALUE.replace(
                '{horizon}',
                memory.nextHorizonLabel,
              )}
            />
          )}
          {memory && memory.reps > 0 && (
            <StatRow
              label={STRINGS.WORD_STAT_REVIEWS}
              value={
                memory.lapses > 0
                  ? STRINGS.WORD_REVIEWS_WITH_LAPSES.replace(
                      '{count}',
                      String(memory.reps),
                    ).replace('{lapses}', String(memory.lapses))
                  : STRINGS.WORD_REVIEWS_VALUE.replace('{count}', String(memory.reps))
              }
            />
          )}
        </View>

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
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  heroText: {
    flexShrink: 1,
  },
  // Reserves the band whether or not the class arrives, so a part of speech
  // landing a beat after the word cannot drop the hero mid-read — the review
  // card's meta row does the same.
  //
  // `minHeight`, not `height`: `overline` is 13pt at a 1.4 line height and
  // nothing in this app disables font scaling, so a fixed 24dp ceiling clips
  // the label once the OS text scale passes ~1.3 (Android's "Largest"; iOS goes
  // far past it). Growing is the correct failure — at every ordinary scale the
  // text fits inside the reserve and nothing moves.
  heroMeta: {
    minHeight: LAYOUT.SPACING.XLARGE,
    justifyContent: 'center',
  },
  // Reserves the transliteration line whether or not the enrichment record
  // arrives — see the comment at the render site.
  heroReading: {
    minHeight: LAYOUT.SPACING.LARGE,
    justifyContent: 'center',
  },
  stats: {
    marginTop: LAYOUT.SPACING.XLARGE,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  // ListRow supplies the row layout and the rule; this only spreads the
  // label and value to opposite edges.
  statRow: {
    justifyContent: 'space-between',
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
