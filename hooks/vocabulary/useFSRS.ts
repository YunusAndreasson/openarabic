import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Card } from 'ts-fsrs';
import { show_diff_message, State } from 'ts-fsrs';

import {
  CONFIDENCE_TO_RATING,
  DEFAULT_SESSION_COOLDOWN_HOURS,
  MISS_CONFIDENCE,
  REVIEW_REFILL_LOW_WATER,
  REVIEW_SESSION_CHUNK_SIZE,
} from '@/constants/fsrs';
import { fsrsQueries } from '@/constants/queries';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { RootId } from '@/types/branded.types';
import { ToastType } from '@/types/enums';
import type {
  FSRSStateTracking,
  FSRSWordUpdate,
  UseFSRSOptions,
  UseFSRSResult,
} from '@/types/fsrs.types';
import type { WordConfidence } from '@/types/review.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import { convertToFSRSCard } from '@/utils/fsrsCard';
import {
  calculateWordPriority,
  createSpacingState,
  getNextWordWithSpacing as getNextFromSpacingQueue,
  partitionSessionChunk,
  updateSpacingCounters as updateSpacingState,
  type SpacingState,
} from '@/utils/fsrsSpacing';
import { FSRS_INSTANCE } from '@/utils/fsrsUtils';
import { PriorityQueue } from '@/utils/priorityQueue';
import { decideDrill, type DrillProgress } from '@/utils/review/drillPolicy';
import { getSessionProgress } from '@/utils/review/sessionProgress';

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

interface GradeWriteVariables {
  userId: string;
  rootId: RootId;
  update: FSRSWordUpdate;
}

// Enhanced state tracking with more fields
interface EnhancedFSRSStateTracking extends FSRSStateTracking {
  completionTriggered: boolean;
  isProcessingUpdate: boolean;
  queueInitialized: boolean;
}

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
  // Bumped by resetQueue so the init effect re-runs even when the due data's
  // identity hasn't changed (React Query structural sharing).
  const [sessionEpoch, setSessionEpoch] = useState<number>(0);

  // Consolidated counters in a single ref
  const countersRef = useRef<FSRSCounters>({
    totalWords: 0,
    processedWords: 0,
    finishedWords: 0,
    uniqueWords: new Set<RootId>(),
  });

  // Priority queue for efficient reordering — the session's WORKING SET, not
  // the session. It holds REVIEW_SESSION_CHUNK_SIZE words at a time and is
  // refilled from backlogRef as it drains.
  const queueRef = useRef<PriorityQueue<StudyWord>>(new PriorityQueue<StudyWord>());

  // Due words captured at session start that have not yet entered the heap, in
  // priority order. The session is finished when this, the heap and the spacing
  // buffer are all empty — never before.
  //
  // Captured ONCE, at init. Words that fall due while the session is running are
  // deliberately not added: a session that grew as you worked through it would
  // have no defined end, and the learner agreed to review what was due when they
  // started. They are picked up by the next session.
  const backlogRef = useRef<StudyWord[]>([]);

  // Spacing queue to enforce minimum spacing between repeats
  const spacingQueueRef = useRef<SpacingState>(createSpacingState());

  // Per-word in-session drill progress (successive relearning to criterion).
  const drillRef = useRef<Map<RootId, DrillProgress>>(new Map());

  // FSRS writes still in flight. updateWord persists OFF the critical path (see
  // there), so the only thing that must wait for them is a read of the server's
  // view — flushPendingWrites is how callers do that.
  const pendingWritesRef = useRef<Set<Promise<unknown>>>(new Set());

  // Enhanced state tracking
  const stateTrackingRef = useRef<EnhancedFSRSStateTracking>({
    isProcessingUpdate: false,
    completionTriggered: false,
    queueInitialized: false,
  });

  const queryClient = useQueryClient();

  // Persists a single grade. Routed through useMutation (rather than calling
  // the service directly) so this write — the whole point of a review session
  // — inherits the app's mutation defaults (app/_layout.tsx): retry on
  // transient failures, and networkMode 'online' pausing the write instead of
  // dropping it when the device is offline, then auto-firing it the moment
  // onlineManager sees the connection return. Still fire-and-forget: the
  // caller below chains .catch()/.finally() on mutateAsync exactly as it did
  // on the raw service call, so the card advance is never held up by it.
  const gradeMutation = useMutation({
    mutationKey: ['fsrs-words', 'grade'],
    mutationFn: ({ userId: mutationUserId, rootId, update }: GradeWriteVariables) =>
      studyWordsFSRSService.updateWordAndReview(mutationUserId, rootId, update),
  });

  // The factory owns the due queryFn (conditional cooldown included) — the key
  // encodes the cooldown, so this never collides with differently-parameterized
  // due consumers. Only the skipToken guard for a missing userId is added here.
  const dueConfig = fsrsQueries.due(userId ?? '', _sessionCooldownHours);
  const { data: dueWords, isLoading } = useQuery({
    ...dueConfig,
    queryFn: userId ? dueConfig.queryFn : skipToken,
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

  /**
   * Move the next chunk of the backlog into the working heap.
   *
   * Called twice per advance: speculatively once the heap runs low (so audio for
   * the incoming words is downloading well before they are shown), and as a last
   * resort when no next card could be produced at all. Both callers want the
   * same thing and the second is the one that guarantees correctness, so the
   * low-water call is an optimisation that can safely do nothing.
   *
   * Returns whether anything was added.
   */
  const refillWorkingSet = useCallback((): boolean => {
    if (backlogRef.current.length === 0) return false;

    const nowMs = Date.now();
    const { chunk, rest } = partitionSessionChunk(
      backlogRef.current,
      REVIEW_SESSION_CHUNK_SIZE,
      nowMs,
    );
    backlogRef.current = rest;

    chunk.forEach(word => {
      countersRef.current.uniqueWords.add(word.root_id);
      queueRef.current.push(word, calculateWordPriority(word, nowMs));
    });

    return chunk.length > 0;
  }, []);

  // Initialize the session queue from due words exactly once per session.
  useEffect(() => {
    if (isLoading || !dueWords) return;

    const effectiveDueWords: StudyWord[] = Array.isArray(dueWords) ? dueWords : [];

    // A completed session must NOT be restarted by a background refetch: the
    // post-completion refetch would otherwise re-init the queue underneath the
    // completion screen. An explicit resetQueue() re-arms initialization.
    if (stateTrackingRef.current.completionTriggered) {
      return;
    }

    // Freeze the live session: once initialized, new dueWords from background
    // refetches (reconnect, invalidation) NEVER re-init and wipe the session.
    // Re-initialization happens only via the explicit re-arm paths
    // (resetQueue/invalidateQueries), which clear queueInitialized — with
    // resetQueue also bumping sessionEpoch so this effect re-runs even when the
    // due data's identity is unchanged.
    if (stateTrackingRef.current.queueInitialized) {
      return;
    }

    stateTrackingRef.current.queueInitialized = true;

    // Initialize queue synchronously (no setTimeout wrapper)
    if (effectiveDueWords.length > 0) {
      const nowMs = Date.now(); // Single timestamp for entire batch

      // The chunk is a working set, not a session cap. The heap holds the
      // top-priority slice and `rest` waits its turn; the session runs until
      // every one of them is done. Keeping the heap small is what the chunk is
      // for — the spacing and drill machinery reasons over what is IN the heap,
      // and handing it a 300-word backlog at once makes "space repeats at least
      // MIN_WORD_SPACING apart" a much weaker constraint than it should be.
      const { chunk: sessionWords, rest } = partitionSessionChunk(
        effectiveDueWords,
        REVIEW_SESSION_CHUNK_SIZE,
        nowMs,
      );
      backlogRef.current = rest;

      // The whole backlog, not the chunk: this is the denominator of the
      // progress bar and the definition of "everything is done" in the rescue
      // path below. When it counted only the chunk, the bar reached 100% and the
      // session declared itself complete with words still waiting.
      countersRef.current.totalWords = effectiveDueWords.length;
      countersRef.current.uniqueWords = new Set(sessionWords.map(word => word.root_id));
      countersRef.current.processedWords = 0;
      countersRef.current.finishedWords = 0;

      // Reset spacing + drill state for the new session
      spacingQueueRef.current = createSpacingState();
      drillRef.current = new Map();

      // Set all state in a predictable order. setState is intentional here —
      // queue initialization is gated by the one-shot queueInitialized flag so
      // it only fires on genuine (re-armed) session starts, not on every render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProgress(0);
      setIsComplete(false);
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
      backlogRef.current = [];
      if (onComplete && !stateTrackingRef.current.completionTriggered) {
        stateTrackingRef.current.completionTriggered = true;
        onComplete();
      }
    }
  }, [dueWords, isLoading, onComplete, getNextWordWithSpacing, sessionEpoch]);

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

        const result = FSRS_INSTANCE.next(card, now, rating);
        newCard = result.card;
      } catch (error) {
        // Track analytics
        handleError(error, {
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

      // Top the working set up BEFORE choosing the next card, so the incoming
      // words can compete for this pick and — more importantly — so their audio
      // starts downloading while there are still cards in hand to cover it.
      if (queueRef.current.size() <= REVIEW_REFILL_LOW_WATER) {
        refillWorkingSet();
      }

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

      // FIXED: Use totalWords instead of uniqueWords for progress calculation
      // Progress should always be available, so no need to check if totalWords exists
      // But we need to ensure counters are properly initialized first
      if (!stateTrackingRef.current.queueInitialized) {
        setProgress(0); // Default to 0 when queue isn't initialized yet
        stateTrackingRef.current.isProcessingUpdate = false;
        return;
      }

      // Only FINISHED words move the bar — see `getSessionProgress`, which owns
      // both that rule and the choice of denominator.
      const newProgress = getSessionProgress(
        countersRef.current.finishedWords,
        countersRef.current.totalWords,
      );
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

        // Then refill from the backlog. Together with the low-water top-up
        // above, this is what makes the session drain everything the learner
        // started with instead of stopping at the first chunk and calling it
        // "Session complete".
        //
        // Its position matters twice. It runs AFTER the ready-spaced flush,
        // because a word whose spacing has elapsed has waited its turn and
        // should come back before an unseen one. It runs BEFORE the forced
        // release below, which breaks the spacing rule to escape a deadlock —
        // and there is no deadlock to escape while unseen words are still
        // waiting. That ordering also fixes a live bug: with a backlog present,
        // a drilled word could be force-repeated a card or two after its miss.
        if (!nextItem && refillWorkingSet()) {
          nextItem = getNextWordWithSpacing();
        }

        // If still none, but the session isn't fully known yet, requeue the smallest spacing candidate
        if (!nextItem) {
          const { finishedWords, totalWords } = countersRef.current;
          const allFinished = totalWords > 0 && finishedWords >= totalWords;

          if (!allFinished && spacingQueueRef.current.spacedWords.length > 0) {
            const candidate = spacingQueueRef.current.spacedWords.reduce<
              (typeof spacingQueueRef.current.spacedWords)[number] | undefined
            >(
              (min, curr) => (!min || curr.remainingSpacing < min.remainingSpacing ? curr : min),
              undefined,
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

          // If we still have no next item, complete immediately. Reachable only
          // once the heap, the spacing buffer AND the backlog are all empty —
          // which is now the only thing "Session complete" is allowed to mean.
          if (!nextItem && !stateTrackingRef.current.completionTriggered) {
            stateTrackingRef.current.completionTriggered = true;
            setIsComplete(true);
            if (onComplete) onComplete();
          }
        }
      }

      setCurrentWord(nextItem || null);
      // Read the heap AFTER the rescue and refill above, both of which push into
      // it. Snapshotting before them published a queue that was missing the
      // words just added — and useAudioPreloader watches this array to decide
      // what to cache, so a stale snapshot silently left a refilled chunk with
      // no audio.
      setWordQueue(queueRef.current.toArray());

      // ALWAYS persist word updates to the database — but OFF the critical path.
      // The next card is already committed to state above, so awaiting the write
      // here bought nothing and cost everything: useReview.processFeedback awaits
      // this function before calling fadeIn() and clearing isUpdating, so the
      // card sat at opacity 0 with grading disabled for the whole round trip
      // (measured ~0.8s on a fast connection, scaling 1:1 with RTT — seconds on
      // mobile data). Firing it in the background makes the advance local-only.
      //
      // A failure still surfaces its toast; the session just isn't held hostage
      // to the response. Registered in pendingWritesRef so flushPendingWrites
      // can order a post-session refetch behind it.
      const write = gradeMutation
        .mutateAsync({ userId, rootId, update: wordUpdateData })
        .catch(error => {
          // handleError normalises via toError — never JSON.stringify a thrown
          // value into the message, that is how a whole payload ends up as a
          // Sentry issue title.
          handleError(error, { toastType: ToastType.IMPORTANT });
        })
        .finally(() => {
          pendingWritesRef.current.delete(write);
        });
      pendingWritesRef.current.add(write);

      stateTrackingRef.current.isProcessingUpdate = false;

      // Return the new stability value for metrics tracking
      return newCard.stability;
    },
    [
      userId,
      currentWord,
      isComplete,
      onComplete,
      getNextWordWithSpacing,
      updateSpacingCounters,
      refillWorkingSet,
      gradeMutation,
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
      const preview = FSRS_INSTANCE.repeat(card, now);
      const out: Partial<Record<WordConfidence, string>> = {};
      (Object.keys(CONFIDENCE_TO_RATING) as WordConfidence[]).forEach(confidence => {
        const rating = CONFIDENCE_TO_RATING[confidence];
        out[confidence] = show_diff_message(preview[rating].card.due, now, true, PREVIEW_UNITS);
      });
      return out;
    },
    [],
  );

  const resetQueue = useCallback(() => {
    stateTrackingRef.current.queueInitialized = false;
    setWordQueue([]);
    setCurrentWord(null);
    setProgress(0);
    setIsComplete(false);
    // Force the init effect to re-run even when the due data hasn't changed
    // identity since the last refetch.
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
    backlogRef.current = [];
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      resetQueue();
    };
  }, [resetQueue]);

  /**
   * Settle every backgrounded FSRS write. Callers that are about to re-read the
   * server's view (invalidate → refetch) must await this, or the refetch can
   * overtake a write still in flight and repopulate the cache with pre-grade
   * data. Individual writes never reject (each carries its own catch).
   */
  const flushPendingWrites = useCallback(async () => {
    while (pendingWritesRef.current.size > 0) {
      await Promise.allSettled([...pendingWritesRef.current]);
    }
  }, []);

  const invalidateQueries = useCallback(() => {
    if (!userId) return;

    // Invalidate all FSRS-related queries to ensure cache consistency
    fsrsQueries.invalidateAll(queryClient, userId);

    stateTrackingRef.current.queueInitialized = false;
    queueRef.current = new PriorityQueue<StudyWord>();
    spacingQueueRef.current = createSpacingState();
    backlogRef.current = [];
  }, [queryClient, userId]);

  return {
    currentWord,
    wordQueue,
    isLoading,
    isComplete,
    progress,
    updateWord,
    previewIntervals,
    invalidateQueries,
    resetQueue,
    flushPendingWrites,
  };
}
