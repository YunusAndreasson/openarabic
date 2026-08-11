import { useLocalSearchParams, useRouter } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListRow, LoadingState } from '@/components/common';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ArticleSentence } from '@/components/article/ArticleSentence';
import { IconButton, PulsatingLoader } from '@/components/ui';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useStudyWordMutations } from '@/hooks/articles/useStudyWordMutations';
import { useWordAudioPlayback } from '@/hooks/audio/useWordAudioPlayback';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useFSRSQueries, useResetWordProgress, useSentencesByWord } from '@/hooks/vocabulary';
import type { SolidColorName } from '@/constants/colors';
import type { RootId } from '@/types/branded.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { parseSupabaseTimestamp } from '@/utils/dateTimeUtils';
import { handleError } from '@/utils/errorHandling';
import { capitalizeFirstLetter } from '@/utils/stringUtils';
import {
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
  getDifficultyLevel,
  getStabilityProgressColor,
} from '@/utils/urgencyScore';

const SENTENCE_EXAMPLES_LIMIT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

const STRENGTH_LABELS = {
  error: STRINGS.WORD_STRENGTH_WEAK,
  warning: STRINGS.WORD_STRENGTH_MEDIUM,
  success: STRINGS.WORD_STRENGTH_STRONG,
} as const;

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

export function getNextReviewLabel(due: string | null): string {
  const dueDate = parseSupabaseTimestamp(due);
  if (!dueDate) return STRINGS.WORD_STATE_NEW;
  const now = new Date();
  if (dueDate.getTime() <= now.getTime()) return STRINGS.WORD_DUE_NOW;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const days = Math.round((startOfDueDay.getTime() - startOfToday.getTime()) / DAY_MS);
  // Same calendar day but still in the future (e.g. due at 6pm, now 10am) is
  // NOT "due now" — the due query (fsrs_due <= now) won't serve it yet, so
  // labelling it "Due now" contradicted a Practice screen already showing
  // "All caught up". Collapsing this into the days<=0 branch below reused the
  // "now" copy for anything from seconds to hours away.
  if (days <= 0) return STRINGS.WORD_DUE_LATER_TODAY;
  if (days === 1) return STRINGS.WORD_DUE_TOMORROW;
  return STRINGS.WORD_DUE_IN_DAYS.replace('{count}', String(days));
}

export default function PracticeWordScreen(): JSX.Element {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { rootId: rootIdParam } = useLocalSearchParams<{ rootId?: string }>();
  const rootId = Number(rootIdParam) as RootId;

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
  const strengthColorKey = getStabilityProgressColor(word.fsrs_stability);
  // Same level → same color as the dot on this word's dictionary row
  const difficultyLevel = getDifficultyLevel(word.fsrs_difficulty);

  return (
    <ThemedView style={styles.container}>
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
            every other surface in the app. No `weight` on Arabic: see ThemedText. */}
        <View style={styles.hero}>
          <View style={styles.heroText}>
            <ThemedText type="arabic" align="left" numberOfLines={1} style={styles.heroArabic}>
              {arabicText}
            </ThemedText>
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

        {/* FSRS stats — one hairline row each */}
        <View style={[styles.stats, { borderTopColor: colors.border }]}>
          <StatRow
            colorName={strengthColorKey}
            label={STRINGS.WORD_STAT_STRENGTH}
            value={STRENGTH_LABELS[strengthColorKey]}
          />
          <StatRow
            colorName={DIFFICULTY_COLORS[difficultyLevel]}
            label={STRINGS.WORD_STAT_DIFFICULTY}
            value={DIFFICULTY_LABELS[difficultyLevel]}
          />
          <StatRow
            label={STRINGS.WORD_STAT_NEXT_REVIEW}
            value={getNextReviewLabel(word.fsrs_due)}
          />
        </View>

        {/* Example sentences from articles */}
        <View style={styles.examplesSection}>
          <ThemedText type="overline" colorName="subtleLabelText" style={styles.examplesTitle}>
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
              <View
                key={sentence.id}
                style={[
                  styles.sentenceBlock,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth },
                  { borderTopColor: colors.border },
                ]}
              >
                {/* `english` is deliberately blanked so ArticleSentence renders
                    only the tappable Arabic words. The reader leads with the
                    translation; a screen about one Arabic word leads with the
                    Arabic, and the translation follows as support below. */}
                <ArticleSentence
                  sentence={{
                    id: sentence.id,
                    english: '',
                    arabic: sentence.arabic,
                    audio_url: sentence.audio_url,
                  }}
                  words={sentence.sentence_words}
                  colors={colors}
                  highlightRootId={word.root_id}
                  containerStyle={styles.sentenceContainer}
                />
                {sentence.english ? (
                  <ThemedText type="caption" colorName="captionText" style={styles.sentenceEnglish}>
                    {sentence.english}
                  </ThemedText>
                ) : null}
              </View>
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
    // header, which supplies its own separation.
    paddingTop: LAYOUT.SPACING.LARGE,
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
  heroArabic: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXHUGE, // 38 — hero word above body copy
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXHUGE * 1.58, // headroom for diacritics
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
  examplesSection: {
    marginTop: LAYOUT.SPACING.XLARGE,
  },
  examplesTitle: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  examplesFallback: {
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.XLARGE,
  },
  sentenceBlock: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  sentenceContainer: {
    marginVertical: 0,
  },
  sentenceEnglish: {
    // ArticleSentence insets its own words by MEDIUM; match it so the
    // translation lines up under the Arabic rather than under the block edge.
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  actions: {
    marginTop: LAYOUT.SPACING.XLARGE,
    borderTopWidth: LAYOUT.BORDER.WIDTH.HAIRLINE,
  },
});
