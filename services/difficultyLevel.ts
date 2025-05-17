export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface DifficultyLevelInfo {
  level: DifficultyLevel;
  label: string;
}

export const DIFFICULTY_LEVELS: Record<DifficultyLevel, DifficultyLevelInfo> = {
  1: {
    level: 1,
    label: 'Beginner',
  },
  2: {
    level: 2,
    label: 'Elementary',
  },
  3: {
    level: 3,
    label: 'Intermediate',
  },
  4: {
    level: 4,
    label: 'Proficient',
  },
  5: {
    level: 5,
    label: 'Advanced',
  },
};

const getDifficultyInfo = (level: number): DifficultyLevelInfo => {
  // Ensure level is between 1 and 5
  const normalizedLevel = Math.max(1, Math.min(5, Math.round(level))) as DifficultyLevel;
  return DIFFICULTY_LEVELS[normalizedLevel];
};

export const formatDifficultyLevel = (level: number): string => {
  const info = getDifficultyInfo(level);
  return info.label;

};
