import { useCallback, useEffect, useRef, useState } from 'react';

import { clearAllPreloadedSources, preload } from 'expo-audio';

import { audioCache } from '@/services/audioCache';
import type { StudyWord } from '@/types/vocabulary.types';
import { mark as diagMark, span as diagSpan } from '@/utils/reviewDiagnostics';
import { generateStorageUrl } from '@/utils/storageUtils';

/**
 * Hard cap on how long the FIRST CARD's audio may block the review UI
 * (app/review.tsx holds the session behind the "Loading audio…" screen while
 * isPreloading). Only two files gate this, so the deadline is tight — if the
 * network is bad enough to blow through it, the session starts anyway and the
 * play-time quick path handles the miss.
 */
const FIRST_CARD_DEADLINE_MS = 10000;

/**
 * Hard cap on the whole background preload. Bounds the work rather than the
 * user's wait — nothing is blocked on it — but a stalled download shouldn't
 * keep a batch loop alive for the rest of the session.
 */
const PRELOAD_DEADLINE_MS = 45000;

/** Files fetched at once by the background loop. */
const BATCH_SIZE = 5;
/** Breather between batches, so downloads leave headroom for live playback. */
const BATCH_DELAY = 100;

interface UseAudioPreloaderReturn {
  /** True only while the first card's audio is being fetched. Blocks the UI. */
  isPreloading: boolean;
  /** Percentage across ALL session files, including the background ones. */
  progress: number;
  /**
   * The session may start: the first card's audio is cached (or gave up).
   * The remaining files keep downloading in the background, so this is NOT
   * "everything is done" — it's "nothing is waiting on us any more".
   */
  isReady: boolean;
  /**
   * The local file this session already downloaded for `url`, or undefined.
   *
   * Synchronous on purpose. Every play used to re-ask audioCache for a path
   * this hook had resolved minutes earlier: three async hops for a Map lookup,
   * and — once past the cache's five-minute memory TTL, which a real session
   * outlives — two synchronous filesystem stats per file as well. Nothing
   * deletes these files while the session that downloaded them is running, so
   * the answer cannot change; the only path that can invalidate one is the
   * caller's own self-heal, which calls `forget`.
   */
  resolveCached: (url: string) => string | undefined;
  /** Drop a resolved path after its file failed to play, so the next attempt
   *  goes back through the cache (and its re-download). */
  forgetCached: (url: string) => void;
}

/** Both audio files for one word, in play order (prompt first, meaning second). */
function audioUrlsForWord(word: StudyWord): string[] {
  const urls: string[] = [];
  if (word.root?.audio_url) {
    const arabic = generateStorageUrl('audio', word.root.audio_url);
    if (arabic) urls.push(arabic);
  }
  if (word.root?.audio_url_en) {
    const english = generateStorageUrl('audio', word.root.audio_url_en);
    if (english) urls.push(english);
  }
  return urls;
}

/**
 * Preloads every word's audio for a practice session so playback mid-session is
 * a local read — that smoothness is the whole point and is preserved here.
 *
 * What changed is the *gating*: only the first card's audio blocks the session
 * from starting. Preloading all of it up front made the user wait for the
 * entire queue before seeing a single card (measured 18s cold on 12 words),
 * even though downloads comfortably outrun a human reading and grading cards.
 * The rest now streams into the cache behind the live session, which keeps the
 * original guarantee — every word cached before it is reached — without the
 * wait. audioCache writes to a temp file and moves it into place, so a download
 * landing mid-session is safe, and useReview's play-time quick mode covers the
 * rare case where the user outruns the downloader.
 *
 * @param wordQueue - Array of words in the current session
 * @param isSessionComplete - Whether the practice session is complete
 * @returns Preloading state and progress
 */
export const useAudioPreloader = (
  wordQueue: StudyWord[],
  isSessionComplete: boolean,
): UseAudioPreloaderReturn => {
  const [isPreloading, setIsPreloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Track if audio has been preloaded to prevent infinite loops
  const hasPreloadedRef = useRef(false);
  // Track the actual word content to prevent unnecessary preloading
  const lastPreloadedWordsRef = useRef<string>('');
  // Every word this session has already handed to a preload pass. The queue
  // grows as the session refills its working set from the backlog, so "have we
  // fetched this word yet" can no longer be answered by comparing whole queues.
  const preloadedIdsRef = useRef(new Set<number>());
  // Bumped whenever a session ends or the hook unmounts, so a background batch
  // loop from the previous session stops instead of writing state into the next.
  const runIdRef = useRef(0);
  // Remote url → the local file this session downloaded for it. See
  // `resolveCached`: this is the answer the play path used to go and ask
  // audioCache for all over again, on every single card.
  const resolvedPathsRef = useRef(new Map<string, string>());

  /**
   * Fetch one URL into the disk cache and buffer it natively. Never throws —
   * a failure here must not stop the rest of the queue from preloading.
   */
  const cacheOne = useCallback(async (url: string): Promise<void> => {
    try {
      const localPath = await audioCache.getAudio(url);
      // A failed download resolves to the remote url itself, which is not a
      // cached file and must not be recorded as one — the play path's self-heal
      // is gated on the two differing.
      if (localPath !== url) resolvedPathsRef.current.set(url, localPath);
      try {
        // Buffer in native memory for near-instant playback
        await preload(localPath);
      } catch {
        // preload is an enhancement - disk cache is sufficient
      }
    } catch {
      // Download failed — the play-time quick path retries on demand
    }
  }, []);

  const resolveCached = useCallback(
    (url: string): string | undefined => resolvedPathsRef.current.get(url),
    [],
  );

  const forgetCached = useCallback((url: string): void => {
    resolvedPathsRef.current.delete(url);
  }, []);

  /**
   * Fetch a list of URLs a few at a time, behind whatever is on screen.
   *
   * Shared by the session's own background pass and by the top-up that follows
   * a queue refill, because they want identical behaviour: bounded concurrency,
   * a breather between batches, a deadline on the whole loop, and an abort as
   * soon as the run they belong to is superseded.
   */
  const cacheInBatches = useCallback(
    async (
      urls: string[],
      isStale: () => boolean,
      deadlineMs: number,
      /** Progress tick. Omitted by the top-up, which nothing is waiting on. */
      onOne?: () => void,
    ): Promise<{ batched: number; abandoned: boolean; deadlineHit: boolean }> => {
      let deadlineHit = false;
      const deadline = setTimeout(() => {
        deadlineHit = true;
      }, deadlineMs);

      let batched = 0;
      try {
        for (let i = 0; i < urls.length; i += BATCH_SIZE) {
          if (deadlineHit || isStale()) {
            return { batched, abandoned: true, deadlineHit };
          }
          batched += Math.min(BATCH_SIZE, urls.length - i);

          const batch = urls.slice(i, i + BATCH_SIZE);
          await Promise.all(batch.map(url => cacheOne(url).then(() => onOne?.())));

          if (!deadlineHit && i + BATCH_SIZE < urls.length) {
            await new Promise<void>(resolve => setTimeout(resolve, BATCH_DELAY));
          }
        }
        return { batched, abandoned: false, deadlineHit };
      } finally {
        clearTimeout(deadline);
      }
    },
    [cacheOne],
  );

  const preloadSessionAudio = useCallback(
    async (words: StudyWord[]) => {
      if (!words.length) return;

      const runId = ++runIdRef.current;
      const isStale = (): boolean => runId !== runIdRef.current;

      setIsPreloading(true);
      setIsReady(false);
      setProgress(0);

      // Collect all unique audio URLs, first word first — the priority slice
      // below relies on that ordering. A Set does the de-duplication: the
      // previous `includes` scan re-walked the whole list for every file, and
      // the two partitioning filters below did it twice more.
      const audioUrls = [...new Set(words.flatMap(audioUrlsForWord))];

      if (audioUrls.length === 0) {
        setIsPreloading(false);
        setIsReady(true);
        return;
      }

      const totalUrls = audioUrls.length;
      let completedUrls = 0;
      const trackProgress = (): void => {
        completedUrls++;
        if (!isStale()) setProgress((completedUrls / totalUrls) * 100);
      };

      // The first card's own files — the only ones the user is actually waiting
      // on. Everything else is prefetch for cards they haven't reached yet.
      const firstWord = words[0];
      const priorityUrls = firstWord ? audioUrlsForWord(firstWord) : [];
      const priority = new Set(priorityUrls);
      const backgroundUrls = audioUrls.filter(url => !priority.has(url));

      diagMark('preload.start', {
        words: words.length,
        files: totalUrls,
        priority: priorityUrls.length,
        background: backgroundUrls.length,
      });
      const endFirstCard = diagSpan('preload.first-card');
      const endAll = diagSpan('preload.background');

      // Block on the first card only, under a tight deadline. In-flight work
      // keeps running after the deadline — it just stops being waited on.
      if (priorityUrls.length > 0) {
        let deadlineTimer: ReturnType<typeof setTimeout> | null = null;
        const deadline = new Promise<void>(resolve => {
          deadlineTimer = setTimeout(resolve, FIRST_CARD_DEADLINE_MS);
        });
        try {
          await Promise.race([
            Promise.all(priorityUrls.map(url => cacheOne(url).then(trackProgress))),
            deadline,
          ]);
        } finally {
          if (deadlineTimer) clearTimeout(deadlineTimer);
        }
      }

      endFirstCard({ files: priorityUrls.length });
      if (isStale()) return;

      // Session starts here. Everything below runs behind the live session.
      setIsPreloading(false);
      setIsReady(true);

      if (backgroundUrls.length === 0) {
        endAll({ files: 0 });
        return;
      }

      const { batched, abandoned, deadlineHit } = await cacheInBatches(
        backgroundUrls,
        isStale,
        PRELOAD_DEADLINE_MS,
        trackProgress,
      );
      endAll({ files: batched, of: backgroundUrls.length, abandoned, deadlineHit });
    },
    [cacheInBatches],
  );

  /**
   * Cache the audio for words that joined the queue after the session started.
   *
   * The session drains the whole due backlog now, refilling its working set a
   * chunk at a time (see useFSRS), so `wordQueue` grows mid-session. The initial
   * pass is gated on `!isReady` and re-arms only on completion, which used to be
   * correct — the queue only ever shrank. It no longer is: without this, every
   * word past the first chunk would reach the screen with nothing cached and
   * fall back to the play-time network path.
   *
   * Deliberately does NOT bump `runIdRef` or touch `isPreloading` / `isReady` /
   * `progress`. It shares the session's run id so it dies with the session, and
   * nothing is waiting on it — the loading gate belongs to the first card alone
   * and must not reappear because the queue topped itself up.
   */
  const topUpSessionAudio = useCallback(
    async (words: StudyWord[]) => {
      if (!words.length) return;

      const runId = runIdRef.current;
      const isStale = (): boolean => runId !== runIdRef.current;

      const urls = [...new Set(words.flatMap(audioUrlsForWord))].filter(
        url => !resolvedPathsRef.current.has(url),
      );
      if (urls.length === 0) return;

      diagMark('preload.topup', { words: words.length, files: urls.length });
      const endTopUp = diagSpan('preload.topup');
      const { batched, abandoned, deadlineHit } = await cacheInBatches(
        urls,
        isStale,
        PRELOAD_DEADLINE_MS,
      );
      endTopUp({ files: batched, of: urls.length, abandoned, deadlineHit });
    },
    [cacheInBatches],
  );

  // Effect: Preload audio when session starts
  useEffect(() => {
    const shouldPreload =
      wordQueue && wordQueue.length > 0 && !isPreloading && !isSessionComplete && !isReady;

    if (!shouldPreload) return;

    // Generate unique key for current word queue to detect changes
    const currentWords = wordQueue.map(w => w.root_id).join(',');

    // Skip if we've already preloaded this exact set of words
    if (hasPreloadedRef.current && lastPreloadedWordsRef.current === currentWords) {
      return;
    }

    hasPreloadedRef.current = true;
    lastPreloadedWordsRef.current = currentWords;
    wordQueue.forEach(word => preloadedIdsRef.current.add(word.root_id));

    preloadSessionAudio(wordQueue);
  }, [wordQueue, isPreloading, isSessionComplete, isReady, preloadSessionAudio]);

  // Effect: cache words that joined the queue after the session started.
  //
  // Runs on every advance (the queue is republished each grade), so it filters
  // by id rather than re-fetching a set it has already seen. Gated on isReady so
  // it can never race the opening pass — before that, the pass above owns the
  // whole queue.
  useEffect(() => {
    if (!isReady || isSessionComplete || wordQueue.length === 0) return;

    const fresh = wordQueue.filter(word => !preloadedIdsRef.current.has(word.root_id));
    if (fresh.length === 0) return;

    fresh.forEach(word => preloadedIdsRef.current.add(word.root_id));
    void topUpSessionAudio(fresh);
  }, [wordQueue, isReady, isSessionComplete, topUpSessionAudio]);

  // Reset preload flag and clear native preloaded sources when session completes
  useEffect(() => {
    if (isSessionComplete) {
      hasPreloadedRef.current = false;
      lastPreloadedWordsRef.current = '';
      preloadedIdsRef.current.clear();
      // Stop any background batch loop still running for the finished session,
      // including a top-up — they share this id precisely so one bump kills all
      // of them.
      runIdRef.current++;
      // Resolved paths belong to the session that downloaded them. The files
      // survive on disk, but the next chunk re-preloads its own set and this
      // map should not accumulate across them.
      resolvedPathsRef.current.clear();
      // Resets local readiness so the next session can re-arm preloading.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsReady(false);
      // Free native memory used by preloaded audio
      try {
        clearAllPreloadedSources().catch(() => {
          // Non-critical cleanup
        });
      } catch {
        // Non-critical cleanup
      }
    }
  }, [isSessionComplete]);

  // Unmount: stop the background loop so it can't outlive the review screen.
  useEffect(() => {
    return () => {
      runIdRef.current++;
    };
  }, []);

  return {
    isPreloading,
    progress,
    isReady,
    resolveCached,
    forgetCached,
  };
};
