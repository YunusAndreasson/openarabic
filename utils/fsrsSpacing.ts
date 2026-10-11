import { State } from 'ts-fsrs';

import { MIN_WORD_SPACING, SPACING_ITERATION_LIMIT } from '@/constants/fsrs';
import type { StudyWord } from '@/types/vocabulary.types';
import {
  MILLISECONDS_PER_DAY,
  MILLISECONDS_PER_HOUR,
  parseSupabaseTimestamp,
} from '@/utils/dateTimeUtils';
import { calculateRetrievability } from '@/utils/fsrsUtils';
import type { PriorityQueue } from '@/utils/priorityQueue';

export interface SpacingState {
  recentWords: Set<number>;
  recentWordsQueue: number[]; // FIFO queue for eviction order
  spacedWords: { word: StudyWord; remainingSpacing: number }[];
}

/** Squashes any real onto (0, 1), descending: a larger input sorts sooner. */
const sooner = (value: number): number => 0.5 - Math.atan(value) / Math.PI;

/**
 * Where a due word sits in the session. Lower = sooner (min-heap semantics).
 *
 * A pure read of FSRS state, in three bands:
 *
 *   0–1  Learning / Relearning, longest-due first. These are the minute-scale
 *        steps FSRS scheduled on purpose, so they are the time-critical ones.
 *   1–2  Review, lowest retrievability first: the words closest to being
 *        forgotten. This is what the reminders promise ("3 words are close to
 *        the forgetting point. One pass brings them back"), so a learner who
 *        opens one and does ten cards has to have met those three.
 *   2–3  New, longest-saved first. A new word loses nothing by waiting a few
 *        cards; a due review is decaying while it waits.
 *
 * Retrievability is the whole of a review's urgency. This used to be a
 * hand-weighted sum of hours overdue, stability, difficulty and lapses, with a
 * flat bonus that put every word with two lapses at the very front — ahead of
 * words that were actually slipping, and counting the hours since a new word
 * was SAVED as "overdue", so a month-old unpractised word outranked every
 * review. An hour overdue means nothing without the interval it is an hour
 * past; retrievability is that comparison, already made by the scheduler.
 *
 * The FSRS sort-order simulations favour the opposite order within the review
 * band (highest retrievability first) for clearing a large backlog. They
 * measure a queue that is never finished; here the session drains the backlog
 * and the median one is eight words, so the order only decides what an early
 * leaver saw — and that has to be what they were told they would see.
 */
export function calculateWordPriority(word: StudyWord, nowMs: number = Date.now()): number {
  if (word.fsrs_state === State.New) {
    const savedMs = parseSupabaseTimestamp(word.created_at)?.getTime() ?? nowMs;
    return 2 + sooner((nowMs - savedMs) / MILLISECONDS_PER_DAY);
  }

  if (word.fsrs_state === State.Learning || word.fsrs_state === State.Relearning) {
    const dueMs = parseSupabaseTimestamp(word.fsrs_due)?.getTime() ?? nowMs;
    return sooner((nowMs - dueMs) / MILLISECONDS_PER_HOUR);
  }

  return 1 + calculateRetrievability(word, new Date(nowMs));
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
