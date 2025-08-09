import { STRINGS } from '@/constants/strings';

export function difficultyLevelToLabel(level: number, strings = STRINGS): string {
  if (level <= 2) return strings.BEGINNER;
  if (level === 3) return strings.INTERMEDIATE;
  return strings.ADVANCED;
}
