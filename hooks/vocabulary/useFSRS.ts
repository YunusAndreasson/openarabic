import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Card } from 'ts-fsrs';
import { createEmptyCard, fsrs, generatorParameters, show_diff_message, State } from 'ts-fsrs';

import {
  CONFIDENCE_TO_RATING,
  DEFAULT_SESSION_COOLDOWN_HOURS,
  MISS_CONFIDENCE,
  OPTIMIZED_FSRS_CONFIG,
  REVIEW_SESSION_CHUNK_SIZE,
} from '@/constants/fsrs';
import { fsrsQueries } from '@/constants/queries';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { RootId } from '@/types/branded.types';
import { ToastType } from '@/types/enums';
import type { FSRSStateTracking, UseFSRSOptions, UseFSRSResult } from '@/types/fsrs.types';
import type { WordConfidence } from '@/types/review.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import {
  calculateWordPriority,
  createSpacingState,
  getNextWordWithSpacing as getNextFromSpacingQueue,
  selectSessionChunk,
  updateSpacingCounters as updateSpacingState,
  type SpacingState,
} from '@/utils/fsrsSpacing';
import { PriorityQueue } from '@/utils/priorityQueue';
import { decideDrill, type DrillProgress } from '@/utils/review/drillPolicy';

// Consolidated counters and tracking data
interface FSRSCounters {
  totalWords: number;
  processedWords: number;
  /**
   * Words that have LEFT the session (graduated to criterion or hit the drill
   * cap). Drives progress/completion — a first correct recall of a still-drilling
   * word must NOT finish it, so this is distinct from a raw "known" count.
   */
  finishedWords: number;
  uniqueWords: Set<RootId>;
}

// Enhanced state tracking with more fields
interface EnhancedFSRSStateTracking extends FSRSStateTracking {
  completionTriggered: boolean;
  isProcessingUpdate: boolean;
  queueInitialized: boolean;
}

// Module-level constants — pure functions of stable config, no need to recompute per render
const FSRS_PARAMS = generatorParameters(OPTIMIZED_FSRS_CONFIG);
const FSRS_INSTANCE = fsrs(FSRS_PARAMS);

// Compact units for ts-fsrs show_diff_message so interval labels stay terse ("10m"/"4d").
const PREVIEW_UNITS = ['s', 'm', 'h', 'd', 'mo', 'y'];

export function useFSRS({
  userId,
  onComplete,
  sessionCooldownHours: _sessionCooldownHours = DEFAULT_SESSION_COOLDOWN_HOURS,
}: UseFSRSOptions): UseFSRSResult {
  const [wordQueue, setWordQueue] = useState<StudyWord[]>([]);
  const [currentWord, setCurrentWord] = useState<StudyWord | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  // Due words beyond the current session chunk ("Review N more" on completion).
  const [remainingDueCount, setRemainingDueCount] = useState<number>(0);
  // Bumped by resetQueue so the init effect re-runs even when the due data's
  // identity hasn't changed (React Query structural sharing) — required for
  // starting the next chunk after a completed session.
  const [sessionEpoch, setSessionEpoch] = useState<number>(0);

  // Consolidated counters in a single ref
  const countersRef = useRef<FSRSCounters>({
    totalWords: 0,
    processedWords: 0,
    finishedWords: 0,
    uniqueWords: new Set<RootId>(),
  });

  // Priority queue for efficient reordering
  const queueRef = useRef<PriorityQueue<StudyWord>>(new PriorityQueue<StudyWord>());

  // Spacing queue to enforce minimum spacing between repeats
  const spacingQueueRef = useRef<SpacingState>(createSpacingState());

  // Per-word in-session drill progress (successive relearning to criterion).
  const drillRef = useRef<Map<RootId, DrillProgress>>(new Map());

  // Enhanced state tracking
  const stateTrackingRef = useRef<EnhancedFSRSStateTracking>({
    isProcessingUpdate: false,
    completionTriggered: false,
    queueInitialized: false,
  });

  // Track the last initialized set of due words (by root_id signature)
  const lastQueueSignatureRef = useRef<string | null>(null);

  // Timeout for completion callback (Phase 2.2: removed initTimeoutRef - now synchronous)
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryClient = useQueryClient();

  const fsrsInstance = FSRS_INSTANCE;

  const { data: dueWords, isLoading } = useQuery({
    ...fsrsQueries.due(userId || ''),
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];

      // If the last session was recently completed, temporarily apply cooldown
      const lastCompletedAt = queryClient.getQueryData<number>(
        fsrsQueries.lastCompletedAtKey(userId),
      );
      const recentlyCompleted =
        typeof lastCompletedAt === 'number' &&
        Date.now() - lastCompletedAt < _sessionCooldownHours * 60 * 60 * 1000;

      const words = await studyWordsFSRSService.getFSRSWords(userId, {
        onlyDue: true,
        forStats: false,
        ...(recentlyCompleted ? { sessionCooldownHours: _sessionCooldownHours } : {}),
      });

      return words;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Mobile-only: no window focus concept
    refetchOnReconnect: true,
  });

  // Helper function to get next available word with proper spacing
  const getNextWordWithSpacing = useCallback((): StudyWord | null => {
    return getNextFromSpacingQueue(queueRef.current, spacingQueueRef.current);
  }, []);

  // Helper function to update spacing counters
  const updateSpacingCounters = useCallback((processedWordId: number) => {
    updateSpacingState(spacingQueueRef.current, processedWordId);
  }, []);

  // Phase 2.2: Initialize queue synchronously (removed setTimeout wrapper)
  useEffect(() => {
    if (isLoading || !dueWords) return;

    const effectiveDueWords: StudyWord[] = Array.isArray(dueWords) ? dueWords : [];

    // A completed session must NOT be restarted by a background refetch: the
    // post-completion refetch returns the remaining backlog (a new signature),
    // which would otherwise re-init the queue underneath the completion screen.
    // Record the fresh backlog for the "Review more" affordance instead; an
    // explicit resetQueue() re-arms initialization.
    if (stateTrackingRef.current.completionTriggered) {
      setRemainingDueCount(effectiveDueWords.length);
      return;
    }

    // Build a stable signature of the current due words
    const signature = effectiveDueWords
      .map(w => w.root_id)
      .filter((id): id is RootId => id != null)
      .sort((a, b) => a - b)
      .join(',');

    // If we've already initialized with the same set, skip re-initialization
    if (stateTrackingRef.current.queueInitialized && lastQueueSignatureRef.current === signature) {
      return;
    }

    // Mark as initialized for this signature
    stateTrackingRef.current.queueInitialized = true;
    lastQueueSignatureRef.current = signature;

    // Clear completion timeout if exists
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }

    // Initialize queue synchronously (no setTimeout wrapper)
    if (effectiveDueWords.length > 0) {
      const nowMs = Date.now(); // Single timestamp for entire batch

      // Serve a large backlog in digestible chunks: the session holds the
      // top-priority slice; the rest is offered as "Review N more" afterwards.
      const sessionWords = selectSessionChunk(effectiveDueWords, REVIEW_SESSION_CHUNK_SIZE, nowMs);

      countersRef.current.totalWords = sessionWords.length;
      countersRef.current.uniqueWords = new Set(sessionWords.map(word => word.root_id));
      countersRef.current.processedWords = 0;
      countersRef.current.finishedWords = 0;

      // Reset spacing + drill state for the new session
      spacingQueueRef.current = createSpacingState();
      drillRef.current = new Map();

      // Set all state in a predictable order. setState is intentional here —
      // queue initialization is gated by signature change so it only fires when
      // dueWords actually shifts, not on every render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProgress(0);
      setIsComplete(false);
      setRemainingDueCount(effectiveDueWords.length - sessionWords.length);
      stateTrackingRef.current.completionTriggered = false;
      stateTrackingRef.current.isProcessingUpdate = false;

      queueRef.current = new PriorityQueue<StudyWord>();

      // Prioritize words by due date and FSRS metrics using heapify
      const priorities = sessionWords.map(w => calculateWordPriority(w, nowMs));
      queueRef.current.heapify(sessionWords, priorities);
      const ordered = queueRef.current.toArray();
      setWordQueue(ordered);

      const first = getNextWordWithSpacing();

      if (first) {
        // We have available words, start session
        setCurrentWord(first);
      } else {
        setIsComplete(true);
        if (onComplete && !stateTrackingRef.current.completionTriggered) {
          stateTrackingRef.current.completionTriggered = true;
          onComplete();
        }
      }
    } else {
      // No words available - complete immediately
      setIsComplete(true);
      setRemainingDueCount(0);
      if (onComplete && !stateTrackingRef.current.completionTriggered) {
        stateTrackingRef.current.completionTriggered = true;
        onComplete();
      }
    }

    return () => {
      // Cleanup completion timeout on unmount
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
    };
  }, [dueWords, isLoading, onComplete, getNextWordWithSpacing, sessionEpoch]);

  const convertToFSRSCard = useCallback((word: StudyWord): Card => {
    // Phase 1.3: Use explicit null checks instead of truthy checks
    // fsrs_reps: 0 and fsrs_stability: 0 are valid but falsy
    if (
      word.fsrs_state === State.New ||
      (word.fsrs_reps == null && word.fsrs_stability == null && !word.fsrs_last_review)
    ) {
      const emptyCard = createEmptyCard(new Date());
      return {
        ...emptyCard,
        due: word.fsrs_due ? new Date(word.fsrs_due) : new Date(),
      };
    }

    const lastReview = word.fsrs_last_review ? new Date(word.fsrs_last_review) : undefined;

    return {
      due: word.fsrs_due ? new Date(word.fsrs_due) : new Date(),
      stability: word.fsrs_stability ?? 0,
      difficulty: word.fsrs_difficulty ?? 6.5,
      // elapsed_days is recomputed by fsrs.next() from last_review + now (and is
      // deprecated for removal in ts-fsrs v6); the value we pass is overwritten.
      elapsed_days: 0,
      scheduled_days: word.fsrs_scheduled_days ?? 0,
      learning_steps: word.fsrs_learning_steps ?? 0,
      reps: word.fsrs_reps ?? 0,
      lapses: word.fsrs_lapses ?? 0,
      state: word.fsrs_state ?? State.New,
      last_review: lastReview,
    };
  }, []);

  const updateWord = useCallback(
    async (rootId: RootId, confidence: WordConfidence) => {
      if (!userId || !currentWord) {
        return;
      }

      if (
        isComplete ||
        stateTrackingRef.current.completionTriggered ||
        stateTrackingRef.current.isProcessingUpdate
      ) {
        return;
      }

      stateTrackingRef.current.isProcessingUpdate = true;

      // Phase 1.4: Add error handling around FSRS algorithm
      let newCard: Card;
      try {
        const card = convertToFSRSCard(currentWord);
        const now = new Date();

        const rating = CONFIDENCE_TO_RATING[confidence];

        const result = fsrsInstance.next(card, now, rating);
        newCard = result.card;
      } catch (error) {
        // Track analytics
        handleError(error instanceof Error ? error : new Error(String(error)), {
          toastType: ToastType.ERROR,
          analyticsEventName: 'FSRS_Algorithm_Error',
          analyticsProperties: {
            rootId: currentWord.root_id,
            confidence,
          },
        });

        // Graceful fallback: Simple increment without FSRS
        const fallbackCard: Card = {
          due: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          stability: currentWord.fsrs_stability ?? 0.4,
          difficulty: currentWord.fsrs_difficulty ?? 6.5,
          elapsed_days: 0,
          scheduled_days: 0,
          learning_steps: currentWord.fsrs_learning_steps ?? 0,
          reps: (currentWord.fsrs_reps ?? 0) + 1,
          lapses: currentWord.fsrs_lapses ?? 0,
          state: currentWord.fsrs_state ?? State.New,
          last_review: new Date(),
        };

        newCard = fallbackCard;
      }

      const now = new Date();

      // Phase 1.2: Use FSRS-calculated due date (trust learning_steps: ['1m', '10m'])
      // No need to override - FSRS handles this correctly
      const wordUpdateData = {
        fsrs_due: newCard.due.toISOString(),
        fsrs_stability: newCard.stability,
        fsrs_difficulty: newCard.difficulty,
        fsrs_scheduled_days: newCard.scheduled_days,
        fsrs_reps: newCard.reps,
        fsrs_learning_steps: newCard.learning_steps,
        fsrs_lapses: newCard.lapses,
        fsrs_state: newCard.state,
        fsrs_last_review: now.toISOString(),
      };

      // Track session counters immediately
      countersRef.current.processedWords += 1;
      countersRef.current.uniqueWords.add(rootId);

      // In-session drilling decision (successive relearning to criterion).
      // Replaces the old flat-spacing requeue: a missed word is re-asked at an
      // expanding lag until recalled correctly twice, capped at DRILL_MAX_REASKS.
      // Only an outright "Forgot" (unknown) re-drills — "Guessed" (vague→Hard) is
      // a PASS and graduates like "Knew it", penalized only at the FSRS interval scale.
      const missed = MISS_CONFIDENCE.has(confidence);
      const priorDrill = drillRef.current.get(rootId) ?? null;
      const decision = decideDrill(priorDrill, missed);

      if (decision.requeue) {
        // Re-ask within this session. The FSRS-advanced copy continues from the
        // new (Relearning/Review) state; `decision.lag` rides the existing
        // spacing-counter decrement, so no change to fsrsSpacing is needed.
        const updatedWord: StudyWord = {
          ...currentWord,
          fsrs_stability: newCard.stability,
          fsrs_difficulty: newCard.difficulty,
          fsrs_scheduled_days: newCard.scheduled_days,
          fsrs_reps: newCard.reps,
          fsrs_learning_steps: newCard.learning_steps,
          fsrs_lapses: newCard.lapses,
          fsrs_state: newCard.state,
          fsrs_last_review: now.toISOString(),
          fsrs_due: newCard.due.toISOString(),
        };
        spacingQueueRef.current.spacedWords.push({
          word: updatedWord,
          remainingSpacing: decision.lag,
        });
        drillRef.current.set(rootId, decision.next ?? { correctStreak: 0, reasks: 0 });
      } else {
        // Word leaves the session: graduated to criterion OR hit the re-ask cap
        // (the latter departs with its FSRS Relearning state for next session).
        drillRef.current.delete(rootId);
        countersRef.current.finishedWords += 1;
      }

      // Update spacing counters before selecting next word
      updateSpacingCounters(rootId);

      // Select the next word optimistically
      let nextItem = getNextWordWithSpacing();
      // Safety: never immediately return the same word again
      // If the next item matches the just-processed root, keep popping
      // until we find a different word or the queue is exhausted.
      let guardIterations = 0;
      while (nextItem?.root_id === rootId && guardIterations < 5) {
        nextItem = getNextWordWithSpacing();
        guardIterations += 1;
      }
      const remaining = queueRef.current.toArray();

      // FIXED: Use totalWords instead of uniqueWords for progress calculation
      // Progress should always be available, so no need to check if totalWords exists
      // But we need to ensure counters are properly initialized first
      if (!stateTrackingRef.current.queueInitialized) {
        setProgress(0); // Default to 0 when queue isn't initialized yet
        stateTrackingRef.current.isProcessingUpdate = false;
        return;
      }

      const totalWordsInSession = countersRef.current.totalWords;

      // Progress calculation: ONLY count words that have FINISHED (graduated to
      // criterion or capped out). Words still being drilled in the spacing queue
      // should NOT increase progress.
      const newProgress =
        totalWordsInSession > 0
          ? Math.min(
              Math.round((countersRef.current.finishedWords / totalWordsInSession) * 100),
              100,
            )
          : 0;
      setProgress(newProgress);

      // FIXED: Ensure forward progress when only spaced words remain (avoid deadlock)
      // If there's no next item, try to move any ready or nearly-ready spaced words back to the queue.
      if (!nextItem) {
        // First, move any fully ready spaced words
        const readySpacedWords = spacingQueueRef.current.spacedWords.filter(
          item => item.remainingSpacing <= 0,
        );

        if (readySpacedWords.length > 0) {
          const batchNowMs = Date.now(); // Single timestamp for batch
          readySpacedWords.forEach(item => {
            const priority = calculateWordPriority(item.word, batchNowMs);
            queueRef.current.push(item.word, priority);
          });

          spacingQueueRef.current.spacedWords = spacingQueueRef.current.spacedWords.filter(
            item => item.remainingSpacing > 0,
          );

          nextItem = getNextWordWithSpacing();
        }

        // If still none, but the session isn't fully known yet, requeue the smallest spacing candidate
        if (!nextItem) {
          const { finishedWords, totalWords } = countersRef.current;
          const allFinished = totalWords > 0 && finishedWords >= totalWords;

          if (!allFinished && spacingQueueRef.current.spacedWords.length > 0) {
            const candidate = spacingQueueRef.current.spacedWords.reduce(
              (min, curr) => (!min || curr.remainingSpacing < min.remainingSpacing ? curr : min),
              undefined as (typeof spacingQueueRef.current.spacedWords)[number] | undefined,
            );

            if (candidate) {
              // FORCE OVERRIDE: allow immediate repeat of the smallest-spacing candidate
              // Remove from spaced list and from recent guard to avoid skip
              spacingQueueRef.current.spacedWords = spacingQueueRef.current.spacedWords.filter(
                w => w.word.root_id !== candidate.word.root_id,
              );
              spacingQueueRef.current.recentWords.delete(candidate.word.root_id);
              spacingQueueRef.current.recentWordsQueue =
                spacingQueueRef.current.recentWordsQueue.filter(
                  id => id !== candidate.word.root_id,
                );
              nextItem = candidate.word;
            }
          }

          // If we still have no next item, complete immediately
          if (!nextItem && !stateTrackingRef.current.completionTriggered) {
            stateTrackingRef.current.completionTriggered = true;
            setIsComplete(true);
            if (onComplete) onComplete();
          }
        }
      }

      setCurrentWord(nextItem || null);
      setWordQueue(remaining);

      // Phase 1.1: ALWAYS persist word updates to database for FSRS algorithm
      // Note: Rating is now calculated in wordUpdateData by convertToFSRSCard
      try {
        await studyWordsFSRSService.updateWordAndReview(userId, rootId, wordUpdateData);
      } catch (error) {
        const errObj =
          error instanceof Error
            ? error
            : new Error((error as { message?: string })?.message ?? JSON.stringify(error));
        handleError(errObj, { toastType: ToastType.IMPORTANT });
      }

      stateTrackingRef.current.isProcessingUpdate = false;

      // Return the new stability value for metrics tracking
      return newCard.stability;
    },
    [
      userId,
      currentWord,
      isComplete,
      convertToFSRSCard,
      fsrsInstance,
      onComplete,
      getNextWordWithSpacing,
      updateSpacingCounters,
    ],
  );

  /**
   * Per-grade interval preview for a card. Reuses the SAME ts-fsrs scheduler as
   * updateWord (so the label IS the schedule the grade would produce) and
   * ts-fsrs's own `show_diff_message` humanizer for terse labels ("10m"/"4d").
   * Keyed by WordConfidence so the grade bar can render a sub-label per button.
   * NB: enable_fuzz is on, so the previewed due is "what grading now would give";
   * the committed due is a separate fuzz draw and may differ slightly — fine for
   * a terse label.
   */
  const previewIntervals = useCallback(
    (word: StudyWord): Partial<Record<WordConfidence, string>> => {
      const now = new Date();
      const card = convertToFSRSCard(word);
      const preview = fsrsInstance.repeat(card, now);
      const out: Partial<Record<WordConfidence, string>> = {};
      (Object.keys(CONFIDENCE_TO_RATING) as WordConfidence[]).forEach(confidence => {
        const rating = CONFIDENCE_TO_RATING[confidence];
        out[confidence] = show_diff_message(preview[rating].card.due, now, true, PREVIEW_UNITS);
      });
      return out;
    },
    [convertToFSRSCard, fsrsInstance],
  );

  const resetQueue = useCallback(() => {
    stateTrackingRef.current.queueInitialized = false;
    setWordQueue([]);
    setCurrentWord(null);
    setProgress(0);
    setIsComplete(false);
    setRemainingDueCount(0);
    // Force the init effect to re-run even when the due data hasn't changed
    // identity since the completion-time refetch (next-chunk start).
    setSessionEpoch(epoch => epoch + 1);
    stateTrackingRef.current.completionTriggered = false;
    stateTrackingRef.current.isProcessingUpdate = false;
    countersRef.current = {
      totalWords: 0,
      processedWords: 0,
      finishedWords: 0,
      uniqueWords: new Set<RootId>(),
    };
    queueRef.current = new PriorityQueue<StudyWord>();
    spacingQueueRef.current = createSpacingState();
    drillRef.current = new Map();
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clean up completion timer (Phase 2.2: initTimeoutRef removed)
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }

      // Reset state
      resetQueue();
    };
  }, [resetQueue]);

  const invalidateQueries = useCallback(() => {
    if (!userId) return;

    // Invalidate all FSRS-related queries to ensure cache consistency
    fsrsQueries.invalidateAll(queryClient, userId);

    stateTrackingRef.current.queueInitialized = false;
    queueRef.current = new PriorityQueue<StudyWord>();
    spacingQueueRef.current = createSpacingState();
  }, [queryClient, userId]);

  return {
    currentWord,
    wordQueue,
    isLoading,
    isComplete,
    progress,
    remainingDueCount,
    updateWord,
    previewIntervals,
    invalidateQueries,
    resetQueue,
  };
}
