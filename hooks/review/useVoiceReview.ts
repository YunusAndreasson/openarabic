/**
 * Wires the voice-grading pipeline into a Practice review session. Auto-arms
 * the mic on each new card once the Arabic word audio has finished playing (so
 * the prompt is never cut off), then on stop transcribes via Parakeet and runs
 * `matchSingleWord` against the card's English meaning.
 *
 * Three outcomes, mirroring the edenmind reference flow:
 * - Match (similarity ≥ 0.70)             → `onKnownAuto()`   — auto-Known
 * - Clean miss (real word, sim < ~0.50)   → `onUnknownAuto()` — auto-Unknown
 * - Ambiguous / hallucination / silence   → `onRevealAnswer()` + wait
 *
 * Auto-Unknown is reserved for transcripts the recognizer is *confident* about
 * but that aren't the expected word ("date" when the answer is "bee"). The
 * ambiguous band (sim 0.50–0.70) and any hallucination / empty transcript fall
 * back to the reveal-and-wait path so a transcription error can't burn an
 * FSRS attempt on a card the learner actually knew.
 */
import * as Sentry from '@sentry/react-native';
import { useEffect, useRef, useState } from 'react';

import { useToast, useVoiceGrading } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { STRINGS } from '@/constants/strings';
import { analytics } from '@/services/analytics';
import { simpleAudioService, type AudioStatus } from '@/services/audioPlayer';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import { setVoiceEnabled } from '@/store/settingsSlice';
import { matchSingleWord } from '@/utils/voiceMatching';

export type VoicePhase = 'idle' | 'listening' | 'checking' | 'revealed' | 'disabled';

/** Last-recording diagnostics surfaced to the on-screen voice HUD. */
export interface VoiceDebug {
  /** Trimmed Parakeet output for the most recent recording, '' if none. */
  transcript: string;
  /** Outcome of matchSingleWord on the most recent recording. */
  match: {
    matched: boolean;
    method: string;
    similarity: number;
    spoken: string;
    expected: string;
  } | null;
  /** Raw recorder stats from the most recent stop. */
  recorder: {
    durationMs: number;
    bufferCount: number;
    stopReason: string;
    heardSpeech: boolean;
    peakRms: number;
    firstBufferMs: number | null;
    stopDecidedAtMs: number;
  } | null;
  /** Last terminal arm() outcome (permission / busy / error / etc.). */
  armError: string | null;
}

interface UseVoiceReviewArgs {
  /** The English meaning expected from the user. Empty if no current card. */
  expected: string | null | undefined;
  /** Key that changes when a new card is shown. */
  currentWordKey: string;
  /** Is the review session ready (not loading, no audio preload in flight). */
  ready: boolean;
  /** Called after a match — caller should advance the card as Known. */
  onKnownAuto: () => void;
  /** Called after a clean miss (recognized real word that's clearly different
   *  from the expected) — caller should advance the card as Unknown. */
  onUnknownAuto: () => void;
  /** Called after an ambiguous miss / hallucination / silence — caller should
   *  reveal the English meaning and let the user pick Known or Unknown. */
  onRevealAnswer: () => void;
}

/** If the Arabic word audio hasn't begun within this window after the card
 *  settles, assume there's nothing to play (cache miss / no audio_url) and
 *  open the mic anyway rather than waiting indefinitely. */
const AUDIO_START_TIMEOUT_MS = 1500;

/** Small pause after the Arabic audio finishes before opening the mic, so the
 *  tail isn't clipped and the playback audio session fully releases first. */
const POST_AUDIO_GRACE_MS = 200;

/** Absolute cap on how long we'll wait for audio before arming regardless —
 *  guards against a status stream that never reports completion. */
const MAX_AUDIO_WAIT_MS = 8000;

/**
 * Resolves once the current card's Arabic word audio has finished playing, so
 * the mic doesn't open mid-prompt. Replaces the old fixed pre-arm delay, which
 * cut longer / late-starting words short.
 *
 * `simpleAudioService.subscribe` doesn't replay the current status and only
 * fires on change (~every 500 ms while playing, then once on completion), so a
 * light poll drives the start-timeout / max-wait deadlines. Resolution rules:
 * - audio played then stopped         → finished, wait POST_AUDIO_GRACE_MS
 * - audio never started in the window  → nothing to wait for, resolve now
 * - MAX_AUDIO_WAIT_MS elapsed          → safety bail, resolve now
 * - caller cancelled                   → resolve now
 */
function waitForCardAudioToFinish(isCancelled: () => boolean): Promise<void> {
  return new Promise<void>(resolve => {
    const startedAt = Date.now();
    let sawPlayback = simpleAudioService.getStatus().playing;
    let settled = false;

    const finish = (graceMs: number) => {
      if (settled) return;
      settled = true;
      clearInterval(poll);
      unsubscribe();
      if (graceMs > 0 && !isCancelled()) {
        setTimeout(resolve, graceMs);
      } else {
        resolve();
      }
    };

    const evaluate = (status: AudioStatus) => {
      if (isCancelled()) return finish(0);
      const elapsed = Date.now() - startedAt;
      if (status.playing) sawPlayback = true;
      // Played and has now stopped → the prompt finished.
      if (sawPlayback && !status.playing) return finish(POST_AUDIO_GRACE_MS);
      // Never started → nothing to wait for.
      if (!sawPlayback && elapsed >= AUDIO_START_TIMEOUT_MS) return finish(0);
      // Absolute safety cap.
      if (elapsed >= MAX_AUDIO_WAIT_MS) return finish(0);
    };

    const unsubscribe = simpleAudioService.subscribe(evaluate);
    const poll = setInterval(() => evaluate(simpleAudioService.getStatus()), 100);
    evaluate(simpleAudioService.getStatus());
  });
}

/** Similarity below this counts as a "clean miss" — a clearly recognized but
 *  wrong word. Anything between this and FUZZY_MIN_SIMILARITY (0.70) is
 *  ambiguous: surface the answer and let the user judge. Picked so that
 *  "date" vs "bee" (sim ~0.25) auto-Unknowns while a 5-char word with two
 *  edits ("growth" vs "groth", sim ~0.83) goes to the match path. */
const CLEAN_MISS_MAX_SIMILARITY = 0.5;

/** Minimum transcript length for an auto-Unknown. A single-character emit
 *  ("a", "i") is almost always Parakeet hedging on near-silence — treat as
 *  ambiguous instead of penalising the card. */
const CLEAN_MISS_MIN_TRANSCRIPT_CHARS = 2;

export function useVoiceReview({
  expected,
  currentWordKey,
  ready,
  onKnownAuto,
  onUnknownAuto,
  onRevealAnswer,
}: UseVoiceReviewArgs): { phase: VoicePhase; debug: VoiceDebug } {
  const voiceEnabled = useAppSelectorShallow(state => state.settings.voiceEnabled);
  const voice = useVoiceGrading();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [debug, setDebug] = useState<VoiceDebug>({
    transcript: '',
    match: null,
    recorder: null,
    armError: null,
  });

  // Stable refs for callback identity.
  const onKnownAutoRef = useRef(onKnownAuto);
  const onUnknownAutoRef = useRef(onUnknownAuto);
  const onRevealAnswerRef = useRef(onRevealAnswer);
  useEffect(() => {
    onKnownAutoRef.current = onKnownAuto;
    onUnknownAutoRef.current = onUnknownAuto;
    onRevealAnswerRef.current = onRevealAnswer;
  });

  // The card key we've already armed for, to avoid re-arming on incidental
  // re-renders while the mic is in flight.
  const armedForKeyRef = useRef<string | null>(null);

  // Reset on every new card. Latched state tied to currentWordKey transitions —
  // a ref alone wouldn't re-render the indicator overlay. Debug is also reset
  // so the HUD never shows last card's transcript / stats during this card's
  // listening window.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase('idle');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDebug({ transcript: '', match: null, recorder: null, armError: null });
    armedForKeyRef.current = null;
  }, [currentWordKey]);

  // Surface a passive "disabled" indicator so the screen can give the user a
  // hint when the toggle is on but the model isn't ready yet.
  useEffect(() => {
    if (!voiceEnabled) return;
    if (voice.isReady) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase('disabled');
  }, [voiceEnabled, voice.isReady]);

  useEffect(() => {
    if (!voiceEnabled || !voice.isReady) return;
    if (!ready) return;
    if (!expected || expected.length === 0) return;
    if (currentWordKey === 'none') return;
    if (armedForKeyRef.current === currentWordKey) return;

    armedForKeyRef.current = currentWordKey;
    let cancelled = false;

    const run = async () => {
      // Let the Arabic word audio play out before opening the mic so the prompt
      // is never cut off. Resolves quickly when no audio plays for this card.
      await waitForCardAudioToFinish(() => cancelled);
      if (cancelled) return;

      setPhase('listening');
      void analytics.track(ANALYTICS_EVENTS.VOICE_ARM, { wordKey: currentWordKey });
      Sentry.addBreadcrumb({
        category: 'voice',
        level: 'info',
        message: 'voice.arm',
        data: { wordKey: currentWordKey },
      });

      const outcome = await voice.arm();
      if (cancelled) return;

      if (!outcome.ok) {
        if (outcome.reason === 'permission') {
          void analytics.track(ANALYTICS_EVENTS.VOICE_MIC_DENIED);
          Sentry.addBreadcrumb({
            category: 'voice',
            level: 'warning',
            message: 'voice.mic.denied',
          });
          showToast(STRINGS.VOICE_MIC_PERMISSION_DENIED);
          dispatch(setVoiceEnabled(false));
          setDebug(d => ({ ...d, armError: 'permission' }));
          setPhase('disabled');
          return;
        }
        Sentry.addBreadcrumb({
          category: 'voice',
          level: 'warning',
          message: 'voice.arm.failed',
          data: { reason: outcome.reason },
        });
        setDebug(d => ({
          ...d,
          armError: outcome.message ? `${outcome.reason}: ${outcome.message}` : outcome.reason,
        }));
        setPhase('idle');
        return;
      }

      setPhase('checking');
      setDebug(d => ({
        ...d,
        armError: null,
        recorder: {
          durationMs: outcome.result.durationMs,
          bufferCount: outcome.result.bufferCount,
          stopReason: outcome.result.stopReason,
          heardSpeech: outcome.result.heardSpeech,
          peakRms: outcome.result.peakRms,
          firstBufferMs: outcome.result.firstBufferMs,
          stopDecidedAtMs: outcome.result.stopDecidedAtMs,
        },
      }));
      const transcript = (await voice.transcribe(outcome.result.waveform)) ?? '';
      if (cancelled) return;

      void analytics.track(ANALYTICS_EVENTS.VOICE_TRANSCRIPT, {
        transcriptLength: transcript.length,
        durationMs: outcome.result.durationMs,
        heardSpeech: outcome.result.heardSpeech,
        peakRms: outcome.result.peakRms,
        bufferCount: outcome.result.bufferCount,
        stopReason: outcome.result.stopReason,
      });

      const match = matchSingleWord({ spoken: transcript, expected });
      void analytics.track(ANALYTICS_EVENTS.VOICE_MATCH, {
        matched: match.matched,
        method: match.method,
        normalizedSpoken: match.normalizedSpoken,
        normalizedExpected: match.normalizedExpected,
      });
      Sentry.addBreadcrumb({
        category: 'voice',
        level: 'info',
        message: 'voice.match',
        data: {
          matched: match.matched,
          method: match.method,
          spoken: match.normalizedSpoken,
          expected: match.normalizedExpected,
        },
      });
      setDebug(d => ({
        ...d,
        transcript,
        match: {
          matched: match.matched,
          method: match.method,
          similarity: match.similarity,
          spoken: match.normalizedSpoken,
          expected: match.normalizedExpected,
        },
      }));
      if (match.matched) {
        onKnownAutoRef.current();
        // Phase resets when the next card mounts (currentWordKey change).
        return;
      }

      // Clean miss: Parakeet was confident about a real word and it's clearly
      // not the answer (sim well below the fuzzy threshold, transcript is a
      // recognizable word, and `method` wasn't flagged as a hallucination).
      // Auto-advance as Unknown so the learner isn't stuck repeating the same
      // wrong attempt — edemind treats this case the same way.
      const isCleanMiss =
        match.method !== 'hallucination' &&
        match.normalizedSpoken.length >= CLEAN_MISS_MIN_TRANSCRIPT_CHARS &&
        match.similarity < CLEAN_MISS_MAX_SIMILARITY;
      if (isCleanMiss) {
        Sentry.addBreadcrumb({
          category: 'voice',
          level: 'info',
          message: 'voice.match.cleanMiss',
          data: { similarity: match.similarity, spoken: match.normalizedSpoken },
        });
        onUnknownAutoRef.current();
        // Phase resets when the next card mounts (currentWordKey change).
        return;
      }

      // Ambiguous miss / hallucination / empty transcript: reveal the answer
      // and let the user pick. A transcription error must not auto-burn an
      // FSRS attempt on a card the learner actually knew.
      setPhase('revealed');
      onRevealAnswerRef.current();
    };

    void run();

    return () => {
      cancelled = true;
      // Cancel is a no-op when nothing is in flight.
      void voice.cancel();
    };
  }, [
    voiceEnabled,
    voice,
    ready,
    expected,
    currentWordKey,
    dispatch,
    showToast,
  ]);

  return { phase, debug };
}
