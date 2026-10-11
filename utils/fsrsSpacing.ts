import {
  DEFAULT_FSRS_DIFFICULTY,
  MIN_WORD_SPACING,
  SPACING_ITERATION_LIMIT,
} from '@/constants/fsrs';
import type { StudyWord } from '@/types/vocabulary.types';
import type { PriorityQueue } from '@/utils/priorityQueue';
import { isHardWord } from '@/utils/wordClassification';

export interface SpacingState {
  recentWords: Set<number>;
  recentWordsQueue: number[]; // FIFO queue for eviction order
  spacedWords: { word: StudyWord; remainingSpacing: number }[];
}

export function calculateWordPriority(word: StudyWord, nowMs: number = Date.now()): number {
  const dueMs = word.fsrs_due ? new Date(word.fsrs_due).getTime() : nowMs;
  const hoursOverdue = (nowMs - dueMs) / (1000 * 60 * 60);
  const stability = word.fsrs_stability ?? 1;
  const difficulty = word.fsrs_difficulty ?? DEFAULT_FSRS_DIFFICULTY;
  const difficultyFactor = (difficulty - 5) * 0.01;
  const lapseFactor = (word.fsrs_lapses ?? 0) * 0.5;

  const basePriority = 10; // Start with a high base value
  const stabilityFactor = Math.max(0, 10 - stability) * 0.1; // Lower stability = more urgent (lower number)
  const hardWordFactor = isHardWord(word) ? -10.0 : 0; // Hard words get much higher priority (lower number)

  return (
    basePriority -
    hoursOverdue * 0.1 +
    stabilityFactor -
    lapseFactor + // More lapses = lower priority (more urgent)
    difficultyFactor +
    hardWordFactor
  );
}

/**
 * Split a due backlog into the next working set and everything still waiting.
 *
 * Lower calculateWordPriority = more urgent (min-heap semantics), so sort
 * ascending and take the first chunkSize. `rest` is the tail in the same
 * priority order, so a later call can partition it again without re-deciding
 * anything: the session refills straight from the front of what is left.
 *
 * Returning both halves matters. The session used to take a chunk and drop the
 * remainder on the floor (it was a hard cap, and the leftovers only ever became
 * a number on the completion screen). Now that the session drains the whole
 * backlog, the remainder has to survive — and recovering it by filtering the
 * original array against the served slice would be quadratic over a session and
 * would key on object identity, which nothing else here relies on.
 */
export function partitionSessionChunk(
  words: StudyWord[],
  chunkSize: number,
  nowMs: number = Date.now(),
): { chunk: StudyWord[]; rest: StudyWord[] } {
  if (words.length <= chunkSize) return { chunk: words, rest: [] };

  const ordered = words
    .map(word => ({ word, priority: calculateWordPriority(word, nowMs) }))
    .sort((a, b) => a.priority - b.priority)
    .map(entry => entry.word);

  return { chunk: ordered.slice(0, chunkSize), rest: ordered.slice(chunkSize) };
}

export function getNextWordWithSpacing(
  queue: PriorityQueue<StudyWord>,
  spacingState: SpacingState,
  minSpacing: number = MIN_WORD_SPACING,
): StudyWord | null {
  // A word whose spacing has elapsed is served before anything in the heap.
  //
  // It used to be pushed back into the heap and left to compete on priority,
  // and it always lost: a re-ask carries the due date its last grade just
  // wrote (minutes from now), which makes it the least urgent word in the
  // session. A missed word therefore came back only once the working set had
  // drained — 19 cards later in a 20-word chunk, and later still behind every
  // backlog refill — where the drill asks for DRILL_LAG_AFTER_MISS. The lag IS
  // the schedule for a spaced word; priority only orders words not yet shown.
  //
  // Longest-waiting first, and never one still inside the recent window.
  let readyIndex = -1;
  spacingState.spacedWords.forEach((item, index) => {
    if (item.remainingSpacing > 0 || spacingState.recentWords.has(item.word.root_id)) return;
    const best = spacingState.spacedWords[readyIndex];
    if (!best || item.remainingSpacing < best.remainingSpacing) readyIndex = index;
  });
  const ready = spacingState.spacedWords[readyIndex];
  if (ready) {
    spacingState.spacedWords.splice(readyIndex, 1);
    return ready.word;
  }

  let nextWord = queue.pop();
  const checked: StudyWord[] = [];

  while (nextWord && spacingState.recentWords.has(nextWord.root_id)) {
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
  minSpacing: number = MIN_WORD_SPACING,
) {
  // Add to Set and queue
  spacingState.recentWords.add(processedWordId);
  spacingState.recentWordsQueue.push(processedWordId);

  // Evict oldest if over capacity (one at a time, matching original behavior)
  if (spacingState.recentWordsQueue.length > minSpacing) {
    const oldest = spacingState.recentWordsQueue.shift();
    if (oldest !== undefined) {
      spacingState.recentWords.delete(oldest);
    }
  }

  spacingState.spacedWords.forEach(item => {
    item.remainingSpacing -= 1;
  });
}

export function createSpacingState(): SpacingState {
  return { recentWords: new Set(), recentWordsQueue: [], spacedWords: [] };
}
