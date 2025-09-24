import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import { handleError } from '@/utils/errorHandling';

export interface DifficultyLevel {
  id: number;
  name: string;
  count: number;
  level: number;
}

const DIFFICULTY_NAMES = {
  1: 'Beginner',
  2: 'Elementary',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
} as const;

export const difficultyService = {
  async getDifficultyLevels(): Promise<DifficultyLevel[]> {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('difficulty_level')
        .not('difficulty_level', 'is', null);

      if (error) {
        await handleError(new Error(error.message), {
          toastMessage: STRINGS.FAILED_TO_LOAD_DIFFICULTY_LEVELS,
        });
        throw error;
      }

      // Count articles by difficulty level
      const counts = (data ?? []).reduce<Record<number, number>>((acc, article) => {
        const level = article?.difficulty_level;
        if (level && level >= 1 && level <= 5) {
          acc[level] = (acc[level] || 0) + 1;
        }
        return acc;
      }, {});

      // Convert to array format expected by FilterSection
      const difficultyLevels: DifficultyLevel[] = Object.entries(counts)
        .map(([level, count]) => {
          const levelNum = parseInt(level, 10);
          return {
            id: levelNum,
            name: DIFFICULTY_NAMES[levelNum as keyof typeof DIFFICULTY_NAMES],
            count,
            level: levelNum,
          };
        })
        .sort((a, b) => a.level - b.level); // Sort by difficulty level (1-5)

      return difficultyLevels;
    } catch (err) {
      await handleError(
        err instanceof Error ? err : new Error('Unknown error loading difficulty levels'),
        {
          toastMessage: STRINGS.FAILED_TO_LOAD_DIFFICULTY_LEVELS,
        }
      );
      throw err;
    }
  },

  getDifficultyName(level: number): string {
    return DIFFICULTY_NAMES[level as keyof typeof DIFFICULTY_NAMES] || 'Unknown';
  },
};
