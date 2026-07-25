import { useLocalSearchParams, useRouter } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ArticleSentence } from '@/components/article/ArticleSentence';
import { BaseCard } from '@/components/common';
import { IconButton } from '@/components/ui';
import { UNSTABLE_DIFFICULTY_THRESHOLD } from '@/constants/fsrs';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useStudyWordMutations } from '@/hooks/articles/useStudyWordMutations';
import { useWordAudioPlayback } from '@/hooks/audio/useWordAudioPlayback';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useFSRSQueries, useResetWordProgress, useSentencesByWord } from '@/hooks/vocabulary';
import type { RootId } from '@/types/branded.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { parseSupabaseTimestamp } from '@/utils/dateTimeUtils';
import { handleError } from '@/utils/errorHandling';
import { capitalizeFirstLetter } from '@/utils/stringUtils';
import { getStabilityProgressColor } from '@/utils/urgencyScore';

const SENTENCE_EXAMPLES_LIMIT = 5;
const EASY_DIFFICULTY_THRESHOLD = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

const STRENGTH_LABELS = {
  error: STRINGS.WORD_STRENGTH_WEAK,
  warning: STRINGS.WORD_STRENGTH_MEDIUM,
  success: STRINGS.WORD_STRENGTH_STRONG,
} as const;

function getDifficultyLabel(difficulty: number | null): string {
  if (difficulty == null) return STRINGS.WORD_STATE_NEW;
  if (difficulty >= UNSTABLE_DIFFICULTY_THRESHOLD) return STRINGS.WORD_DIFFICULTY_HARD;
  if (difficulty >= EASY_DIFFICULTY_THRESHOLD) return STRINGS.WORD_DIFFICULTY_MODERATE;
  return STRINGS.WORD_DIFFICULTY_EASY;
}

function getNextReviewLabel(due: string | null): string {
  const dueDate = parseSupabaseTimestamp(due);
  if (!dueDate) return STRINGS.WORD_STATE_NEW;
  const now = new Date();
  if (dueDate.getTime() <= now.getTime()) return STRINGS.WORD_DUE_NOW;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const days = Math.round((startOfDueDay.getTime() - startOfToday.getTime()) / DAY_MS);
  if (days <= 0) return STRINGS.WORD_DUE_NOW;
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

  const { allWords } = useFSRSQueries({ userId: user?.id });
  const { toggleRootMutation } = useStudyWordMutations();
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
          toggleRootMutation
            .mutateAsync({ userId, rootId: wordRootId, intent: 'remove' })
            .catch(error =>
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
  }, [user?.id, word, toggleRootMutation.mutateAsync, router]);

  if (!word) {
    return (
      <View style={[styles.container, { backgroundColor: colors.elevation1 }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.tint} />
        </View>
      </View>
    );
  }

  const arabicText = word.root?.letters ?? '';
  const englishText = capitalizeFirstLetter(word.root?.meaning ?? '');
  const strengthColorKey = getStabilityProgressColor(word.fsrs_stability);

  return (
    <View style={[styles.container, { backgroundColor: colors.elevation1 }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Word hero — Arabic, meaning, audio */}
        <View style={styles.hero}>
          <ThemedText
            type="arabic"
            weight="semibold"
            align="center"
            numberOfLines={1}
            style={styles.heroArabic}
          >
            {arabicText}
          </ThemedText>
          <ThemedText type="body" variant="secondary" align="center">
            {englishText}
          </ThemedText>
          {word.root?.audio_url && (
            <View style={styles.audioButton}>
              <IconButton
                icon="volume-high"
                onPress={handlePlayAudio}
                backgroundColor={colors.elevation2}
                iconColor={colors.text}
                hapticType="light"
              />
            </View>
          )}
        </View>

        {/* FSRS stats — strength, difficulty, next review */}
        <View style={[styles.statsRow, { borderColor: colors.border }]}>
          <View style={styles.stat}>
            <ThemedText type="overline" colorName="subtleLabelText">
              {STRINGS.WORD_STAT_STRENGTH}
            </ThemedText>
            <ThemedText type="body" weight="semibold" colorName={strengthColorKey}>
              {STRENGTH_LABELS[strengthColorKey]}
            </ThemedText>
          </View>
          <View style={styles.stat}>
            <ThemedText type="overline" colorName="subtleLabelText">
              {STRINGS.WORD_STAT_DIFFICULTY}
            </ThemedText>
            <ThemedText type="body" weight="semibold">
              {getDifficultyLabel(word.fsrs_difficulty)}
            </ThemedText>
          </View>
          <View style={styles.stat}>
            <ThemedText type="overline" colorName="subtleLabelText">
              {STRINGS.WORD_STAT_NEXT_REVIEW}
            </ThemedText>
            <ThemedText type="body" weight="semibold">
              {getNextReviewLabel(word.fsrs_due)}
            </ThemedText>
          </View>
        </View>

        {/* Example sentences from articles */}
        <View style={styles.examplesSection}>
          <ThemedText type="overline" colorName="subtleLabelText" style={styles.examplesTitle}>
            {STRINGS.WORD_EXAMPLES_TITLE}
          </ThemedText>

          {sentencesLoading && (
            <View style={styles.examplesFallback}>
              <ActivityIndicator size="small" color={colors.tint} />
            </View>
          )}

          {!sentencesLoading && sentencesEmpty && (
            <View style={styles.examplesFallback}>
              <ThemedText type="body" variant="secondary" align="center">
                {STRINGS.NO_SENTENCE_EXAMPLES}
              </ThemedText>
            </View>
          )}

          {!sentencesLoading &&
            !sentencesEmpty &&
            sentences.map(sentence => (
              <BaseCard key={sentence.id} style={styles.sentenceCard} shadowSize="small">
                <ArticleSentence
                  sentence={{
                    id: sentence.id,
                    english: sentence.english,
                    arabic: sentence.arabic,
                    audio_url: sentence.audio_url,
                  }}
                  words={sentence.sentence_words}
                  colors={colors}
                  highlightRootId={word.root_id}
                  containerStyle={styles.sentenceContainer}
                />
              </BaseCard>
            ))}
        </View>
      </ScrollView>

      {/* Management actions — pinned below the scroll area */}
      <View
        style={[
          styles.actions,
          { borderTopColor: colors.border, paddingBottom: insets.bottom + LAYOUT.SPACING.SMALL },
        ]}
      >
        <Pressable style={styles.actionRow} onPress={handleResetProgress}>
          <ThemedText type="body" weight="semibold" align="center">
            {STRINGS.RESET_PROGRESS_ACTION}
          </ThemedText>
        </Pressable>
        <Pressable style={styles.actionRow} onPress={handleRemove}>
          <ThemedText type="body" weight="semibold" variant="error" align="center">
            {STRINGS.REMOVE_FROM_PRACTICE_ACTION}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

export const options = {
  headerShown: false,
} as const;

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
    paddingTop: LAYOUT.SPACING.XLARGE,
    paddingBottom: LAYOUT.SPACING.LARGE,
  },
  hero: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
  },
  heroArabic: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXHUGE, // 38 — hero word above body copy
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXHUGE * 1.58, // headroom for diacritics
  },
  audioButton: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: LAYOUT.SPACING.XLARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
  },
  examplesSection: {
    marginTop: LAYOUT.SPACING.XLARGE,
  },
  examplesTitle: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  examplesFallback: {
    paddingVertical: LAYOUT.SPACING.XLARGE,
    alignItems: 'center',
  },
  sentenceCard: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  sentenceContainer: {
    marginVertical: 0,
  },
  actions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
  },
  actionRow: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
});
