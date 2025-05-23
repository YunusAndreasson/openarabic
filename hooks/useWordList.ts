import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { State } from 'ts-fsrs';

import { studyWordsFSRSService } from '../services/studyWordsFSRS';
import type { StudyWord } from '../types/vocabulary.types';

// Enhanced study word with retention score
export interface EnhancedStudyWord extends StudyWord {
  retentionScore: number;
}

type WordListCategory = 'total' | 'mastered' | 'learning' | 'due' | 'needsAttention';

// Add type for sort options
export type WordListSort = 'retention' | 'due' | 'alphabetical' | 'streak';

/**
 * Calculate a retention score based on FSRS parameters
 * This directly uses the key metrics from FSRS algorithm
 */
const calculateRetentionScore = (word: StudyWord): number => {
  const stabilityScore = Math.min((word.fsrs_stability ?? 0) / 100, 1) * 70;
  const difficultyFactor = 1 - (word.fsrs_difficulty ?? 0.3);
  const difficultyScore = difficultyFactor * 20;
  const lapsesPenalty = Math.min((word.fsrs_lapses ?? 0) / 10, 1) * 10;
  return Math.max(0, Math.min(100, Math.round(stabilityScore + difficultyScore - lapsesPenalty)));
};

export function useWordList(
  userId: string | undefined,
  category: WordListCategory,
  sortBy: WordListSort = 'retention',
  sortDirection: 'asc' | 'desc' = 'desc'
): UseQueryResult<EnhancedStudyWord[]> {
  const queryClient = useQueryClient();

  return useQuery<EnhancedStudyWord[]>({
    queryKey: ['vocabulary-words', userId, category, sortBy, sortDirection],
    queryFn: async () => {
      if (!userId) throw new Error('User not authenticated');

      try {
        const serviceOptions: Parameters<typeof studyWordsFSRSService.getFSRSWords>[1] = {};

        if (category === 'due') {
          serviceOptions.onlyDue = true;
        } else if (category === 'mastered') {
          serviceOptions.category = 'mastered';
        } else if (category === 'learning') {
          serviceOptions.category = 'learning';
        }

        const allWords = await studyWordsFSRSService.getFSRSWords(userId, serviceOptions);

        // Filter out invalid words with type guard
        const filteredWords = allWords.filter(
          (
            word
          ): word is StudyWord & {
            root: NonNullable<typeof word.root> & {
              letters: string;
              meaning: string | null;
            };
          } => {
            return Boolean(
              word && word.root && word.root.letters && typeof word.root.letters === 'string'
            );
          }
        );

        // Filter words based on category using FSRS states
        let result: StudyWord[] = [];
        const now = new Date().toISOString();

        switch (category) {
          case 'total':
            result = filteredWords;
            break;
          case 'mastered':
            result = filteredWords.filter(
              word => word.fsrs_state === State.Review && (word.fsrs_stability ?? 0) >= 5
            );
            break;
          case 'learning':
            result = filteredWords.filter(
              word =>
                word.fsrs_state === State.New ||
                word.fsrs_state === State.Learning ||
                word.fsrs_state === State.Relearning ||
                (word.fsrs_state === State.Review && (word.fsrs_stability ?? 0) < 5)
            );
            break;
          case 'due':
            result = filteredWords.filter(word => word.fsrs_due && word.fsrs_due <= now);
            break;
          case 'needsAttention':
            result = filteredWords.filter(word => {
              const difficulty = word.fsrs_difficulty ?? 0.3;
              const lapses = word.fsrs_lapses ?? 0;
              const stability = word.fsrs_stability ?? 0;
              const state = word.fsrs_state;

              const isHighDifficultyWithLapses = difficulty > 0.6 && lapses > 0;
              const isStrugglingInLearning = (state === 1 || state === 2) && lapses > 1;
              const isUnstableAndDifficult = stability < 7 && difficulty > 0.5 && lapses > 0;

              return isHighDifficultyWithLapses || isStrugglingInLearning || isUnstableAndDifficult;
            });
            break;
          default:
            result = filteredWords;
        }

        // Calculate retention score
        const enhanced = result.map(word => ({
          ...word,
          retentionScore: calculateRetentionScore(word),
        }));

        // Sorting logic
        let sorted: EnhancedStudyWord[] = enhanced;
        if (sortBy === 'retention') {
          sorted = enhanced.sort((a, b) => b.retentionScore - a.retentionScore);
        } else if (sortBy === 'due') {
          sorted = enhanced.sort((a, b) => {
            if (!a.fsrs_due && !b.fsrs_due) return 0;
            if (!a.fsrs_due) return 1;
            if (!b.fsrs_due) return -1;
            return new Date(a.fsrs_due).getTime() - new Date(b.fsrs_due).getTime();
          });
        } else if (sortBy === 'alphabetical') {
          sorted = enhanced.sort((a, b) => {
            const aWord = a.root?.letters?.toLowerCase() || '';
            const bWord = b.root?.letters?.toLowerCase() || '';
            return aWord.localeCompare(bWord);
          });
        } else if (sortBy === 'streak') {
          sorted = enhanced.sort((a, b) => (b.success_streak ?? 0) - (a.success_streak ?? 0));
        }
        if (sortDirection === 'asc') {
          sorted = [...sorted].reverse();
        }
        return sorted;
      } catch (error) {
        throw error instanceof Error ? error : new Error('Failed to fetch vocabulary words');
      }
    },
    enabled: !!userId,
    placeholderData: () => {
      const studyWords = queryClient.getQueryData<StudyWord[]>(['studyWords', userId]);
      if (!studyWords?.length) return undefined;

      const validStudyWords = studyWords.filter(
        (
          word
        ): word is NonNullable<typeof word> & {
          root: NonNullable<StudyWord['root']> & { letters: string };
        } => Boolean(word?.root?.letters && typeof word.root.letters === 'string')
      );

      let filteredWords = validStudyWords;
      switch (category) {
        case 'mastered':
          filteredWords = validStudyWords.filter(
            word => word.fsrs_state === State.Review && (word.fsrs_stability ?? 0) >= 5
          );
          break;
        case 'learning':
          filteredWords = validStudyWords.filter(
            word =>
              word.fsrs_state === State.New ||
              word.fsrs_state === State.Learning ||
              word.fsrs_state === State.Relearning ||
              (word.fsrs_state === State.Review && (word.fsrs_stability ?? 0) < 5)
          );
          break;
      }

      const enhanced = filteredWords.map(word => ({
        ...word,
        retentionScore: calculateRetentionScore(word),
      }));
      let sorted: EnhancedStudyWord[] = enhanced;
      if (sortBy === 'retention') {
        sorted = enhanced.sort((a, b) => b.retentionScore - a.retentionScore);
      } else if (sortBy === 'due') {
        sorted = enhanced.sort((a, b) => {
          if (!a.fsrs_due && !b.fsrs_due) return 0;
          if (!a.fsrs_due) return 1;
          if (!b.fsrs_due) return -1;
          return new Date(a.fsrs_due).getTime() - new Date(b.fsrs_due).getTime();
        });
      } else if (sortBy === 'alphabetical') {
        sorted = enhanced.sort((a, b) => {
          const aWord = a.root?.letters?.toLowerCase() || '';
          const bWord = b.root?.letters?.toLowerCase() || '';
          return aWord.localeCompare(bWord);
        });
      } else if (sortBy === 'streak') {
        sorted = enhanced.sort((a, b) => (b.success_streak ?? 0) - (a.success_streak ?? 0));
      }
      if (sortDirection === 'asc') {
        sorted = [...sorted].reverse();
      }
      return sorted;
    },
  });
}
