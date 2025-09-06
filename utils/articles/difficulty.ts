import { ContentDifficulty } from '@/types/enums';

export function difficultyLevelToLabel(level: number): string {
  if (level <= 2) return ContentDifficulty.BEGINNER;
  if (level === 3) return ContentDifficulty.INTERMEDIATE;
  return ContentDifficulty.ADVANCED;
}
