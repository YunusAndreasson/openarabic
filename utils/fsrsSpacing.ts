import {
  DEFAULT_FSRS_DIFFICULTY,
  MIN_WORD_SPACING,
  SPACING_ITERATION_LIMIT,
} from '@/constants/fsrs';

import type { StudyWord } from '../types/vocabulary.types';

import type { PriorityQueue } from './priorityQueue';
import { isStrugglingWord } from './wordClassification';

export interface SpacingState {
  recentWords: number[];
  spacedWords: { word: StudyWord; remainingSpacing: number }[];
}

export function calculateWordPriority(word: StudyWord): number {
  const now = new Date();
  const dueDate = word.fsrs_due ? new Date(word.fsrs_due) : now;
  const hoursOverdue = Math.max(0, (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60));
  const stability = word.fsrs_stability ?? 1;
  const difficulty = word.fsrs_difficulty ?? DEFAULT_FSRS_DIFFICULTY;
  const difficultyFactor = (difficulty - 5) * 0.01;
  const lapseFactor = (word.fsrs_lapses ?? 0) * 0.5;

  // Priority calculation:
  // - More overdue = lower priority number (more urgent)
  // - Higher stability = higher priority number (less urgent)
  // - Lower stability = lower priority number (more urgent)
  // - More lapses = lower priority number (more urgent)
  // - Struggling words = lower priority number (more urgent)
  const basePriority = 10; // Start with a high base value
  const stabilityFactor = stability * 0.1; // Higher stability = less urgent (higher number)
  const strugglingFactor = isStrugglingWord(word) ? -10.0 : 0; // Struggling words get much higher priority (lower number)

  return (
    basePriority -
    hoursOverdue * 0.1 +
    stabilityFactor -
    lapseFactor + // More lapses = lower priority (more urgent)
    difficultyFactor +
    strugglingFactor
  );
}

export function getNextWordWithSpacing(
  queue: PriorityQueue<StudyWord>,
  spacingState: SpacingState,
  minSpacing: number = MIN_WORD_SPACING
): StudyWord | null {
  const readySpaced = spacingState.spacedWords.filter(item => item.remainingSpacing <= 0);
  if (readySpaced.length > 0) {
    spacingState.spacedWords = spacingState.spacedWords.filter(item => item.remainingSpacing > 0);
    readySpaced.forEach(item => {
      const priority = calculateWordPriority(item.word);
      queue.push(item.word, priority);
    });
  }

  let nextWord = queue.pop();
  const checked: StudyWord[] = [];

  while (nextWord && spacingState.recentWords.includes(nextWord.root_id)) {
    spacingState.spacedWords.push({ word: nextWord, remainingSpacing: minSpacing });
    checked.push(nextWord);
    nextWord = queue.pop();
    if (checked.length > SPACING_ITERATION_LIMIT || queue.size() === 0) {
      break;
    }
  }

  return nextWord || null;
}

export function updateSpacingCounters(
  spacingState: SpacingState,
  processedWordId: number,
  minSpacing: number = MIN_WORD_SPACING
) {
  spacingState.recentWords.push(processedWordId);
  if (spacingState.recentWords.length > minSpacing) {
    spacingState.recentWords.shift();
  }
  spacingState.spacedWords.forEach(item => {
    item.remainingSpacing -= 1;
  });
}

export function createSpacingState(): SpacingState {
  return { recentWords: [], spacedWords: [] };
}
