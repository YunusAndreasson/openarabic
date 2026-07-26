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
  // Bumped whenever a session ends or the hook unmounts, so a background batch
  // loop from the previous session stops instead of writing state into the next.
  const runIdRef = useRef(0);

  /**
   * Fetch one URL into the disk cache and buffer it natively. Never throws —
   * a failure here must not stop the rest of the queue from preloading.
   */
  const cacheOne = useCallback(async (url: string): Promise<void> => {
    try {
      const localPath = await audioCache.getAudio(url);
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

  const preloadSessionAudio = useCallback(
    async (words: StudyWord[]) => {
      if (!words.length) return;

      const runId = ++runIdRef.current;
      const isStale = (): boolean => runId !== runIdRef.current;

      setIsPreloading(true);
      setIsReady(false);
      setProgress(0);

      // Collect all unique audio URLs, first word first — the priority slice
      // below relies on that ordering.
      const audioUrls: string[] = [];
      words.forEach(word => {
        audioUrlsForWord(word).forEach(url => {
          if (!audioUrls.includes(url)) audioUrls.push(url);
        });
      });

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
      const priorityUrls = firstWord
        ? audioUrlsForWord(firstWord).filter(url => audioUrls.includes(url))
        : [];
      const backgroundUrls = audioUrls.filter(url => !priorityUrls.includes(url));

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

      const BATCH_SIZE = 5; // Process 5 audio files at a time
      const BATCH_DELAY = 100; // 100ms delay between batches

      let deadlineHit = false;
      const overallDeadline = setTimeout(() => {
        deadlineHit = true;
      }, PRELOAD_DEADLINE_MS);

      let batched = 0;
      try {
        for (let i = 0; i < backgroundUrls.length; i += BATCH_SIZE) {
          if (deadlineHit || isStale()) {
            endAll({ files: batched, of: backgroundUrls.length, abandoned: true, deadlineHit });
            return;
          }
          batched += Math.min(BATCH_SIZE, backgroundUrls.length - i);

          const batch = backgroundUrls.slice(i, i + BATCH_SIZE);
          await Promise.all(batch.map(url => cacheOne(url).then(trackProgress)));

          // Small delay between batches to prevent resource exhaustion — and to
          // leave headroom for whatever the live session is playing right now.
          if (!deadlineHit && i + BATCH_SIZE < backgroundUrls.length) {
            await new Promise<void>(resolve => setTimeout(resolve, BATCH_DELAY));
          }
        }
        endAll({ files: batched, of: backgroundUrls.length, abandoned: false });
      } finally {
        clearTimeout(overallDeadline);
      }
    },
    [cacheOne],
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

    preloadSessionAudio(wordQueue);
  }, [wordQueue, isPreloading, isSessionComplete, isReady, preloadSessionAudio]);

  // Reset preload flag and clear native preloaded sources when session completes
  useEffect(() => {
    if (isSessionComplete) {
      hasPreloadedRef.current = false;
      lastPreloadedWordsRef.current = '';
      // Stop any background batch loop still running for the finished session.
      runIdRef.current++;
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
  };
};
