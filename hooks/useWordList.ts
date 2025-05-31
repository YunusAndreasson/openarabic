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
  const stability = word.fsrs_stability ?? 0;
  const difficulty = word.fsrs_difficulty ?? 5; // FSRS difficulty is typically 1-10 scale
  const lapses = word.fsrs_lapses ?? 0;
  const reps = word.fsrs_reps ?? 0;

  // Base score starts at 30 to give learning words a fair chance
  let score = 30;

  // Stability bonus - logarithmic scale since stability can vary widely
  const stabilityBonus = Math.min(Math.log10(stability + 1) * 25, 50);
  score += stabilityBonus;

  // Difficulty adjustment - normalize from 1-10 scale, but be more forgiving
  const difficultyPenalty = Math.max(0, (difficulty - 3) / 7) * 15; // Start penalty at difficulty 3
  score -= difficultyPenalty;

  // Reps bonus - reward words that have been practiced
  const repsBonus = Math.min(reps * 2, 15);
  score += repsBonus;

  // Lapses penalty - each lapse reduces score moderately
  const lapsesPenalty = lapses * 3;
  score -= lapsesPenalty;

  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
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
              const difficulty = word.fsrs_difficulty ?? 6.5; // Default to medium difficulty in 5-10 range
              const lapses = word.fsrs_lapses ?? 0;
              const stability = word.fsrs_stability ?? 0;
              const state = word.fsrs_state;

              const isHighDifficultyWithLapses = difficulty >= 8.0 && lapses > 0; // Hard difficulty with lapses
              const isStrugglingInLearning = (state === 1 || state === 2) && lapses > 1;
              const isUnstableAndDifficult = stability < 7 && difficulty >= 7.0 && lapses > 0; // Above medium difficulty

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
            const aWord = a.root?.meaning?.toLowerCase() || '';
            const bWord = b.root?.meaning?.toLowerCase() || '';
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
          const aWord = a.root?.meaning?.toLowerCase() || '';
          const bWord = b.root?.meaning?.toLowerCase() || '';
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
