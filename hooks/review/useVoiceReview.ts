/**
 * Wires the voice-grading pipeline into a Practice review session. Auto-arms
 * the mic on each new card once the Arabic word audio has finished playing (so
 * the prompt is never cut off) — gated on `promptAudioDoneKey` from useReview,
 * which owns the prompt playback and reports completion per card. Then on stop
 * transcribes via Parakeet and runs `matchSingleWord` against the card's
 * English meaning.
 *
 * A correct answer just proceeds — `onKnownAuto()` fires and the card advances,
 * keeping the hands-free flow fast. We only stop the learner when the answer
 * was *wrong*: a `result` is surfaced and the panel waits, so a mishear can
 * never silently burn an FSRS attempt. The learner taps `accept()` (the answer
 * was actually right → Known), `reject()` (Unknown), or `retry()` (re-record);
 * `suggestion` nudges the likely choice.
 */
import * as Sentry from '@sentry/react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useToast, useVoiceGrading } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { STRINGS } from '@/constants/strings';
import {
  PARAKEET_MODEL_ID,
  VOICE_DECODING_METHOD,
  VOICE_MAX_ACTIVE_PATHS,
} from '@/hooks/voice/useSherpaStt';
import { DEFAULT_RECORDING_CONFIG } from '@/lib/voice/recording';
import { analytics } from '@/services/analytics';
import { logVoiceAttempt, type VoiceAttemptLog } from '@/services/voiceTelemetry';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import { setVoiceEnabled } from '@/store/settingsSlice';
import { errorFeedback } from '@/utils/haptics';
import { countDiag, mark as diagMark, span as diagSpan } from '@/utils/reviewDiagnostics';
import { matchSingleWord } from '@/utils/voiceMatching';

/**
 * `arming` is the window between asking for the mic and the mic actually
 * delivering audio (~0.5 s on device: permission check, then opening an
 * exclusive input stream). It is a distinct phase because showing "Listening…"
 * across it invites the learner to answer into a mic that is not recording yet
 * — the answer is lost, the card times out, and it reads as "the mic is
 * unreliable".
 */
export type VoicePhase = 'idle' | 'arming' | 'listening' | 'checking' | 'result' | 'disabled';

/**
 * A wrong / ambiguous answer the learner can act on. A *correct* answer never
 * produces one — the card just proceeds — so the presence of a result always
 * means "we stopped because the spoken answer didn't match; show what was
 * heard and let the user override".
 */
export interface VoiceResult {
  /** Normalized transcript shown as "you said …". '' when nothing usable was
   *  heard (silence / hallucination) — the panel shows a fallback instead. */
  heard: string;
  /** Normalized expected meaning, shown as the answer. */
  expected: string;
  /** Which matchSingleWord branch fired (debug / suggestion logic). */
  method: string;
  similarity: number;
  /** The action the recognizer leans toward, used to emphasise one button.
   *  'retry' when the audio was unusable, 'unknown' for a confident wrong
   *  word, null when genuinely ambiguous (let the learner judge). */
  suggestion: 'unknown' | 'retry' | null;
}

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
  /** Current card's root id, recorded with each telemetry attempt. */
  rootId: number | null | undefined;
  /** From useReview: the `currentWordKey` whose Arabic prompt has finished
   *  playing (or had no audio). The mic only arms once this matches the current
   *  card, so the prompt is never cut off and the mic never opens over it. */
  promptAudioDoneKey: string | null;
  /** Is the review session ready (not loading, no audio preload in flight). */
  ready: boolean;
  /** Stop any in-flight playback (reveal audio) before reopening the mic on a
   *  retry, so its tail isn't captured by the recording. */
  stopAudio: () => void;
  /** Called after a match — caller should advance the card as Known. */
  onKnownAuto: () => void;
  /** Called after a clean miss (recognized real word that's clearly different
   *  from the expected) — caller should advance the card as Unknown. */
  onUnknownAuto: () => void;
  /** Called after an ambiguous miss / hallucination / silence — caller should
   *  reveal the English meaning and let the user pick Known or Unknown. */
  onRevealAnswer: () => void;
}

/** Similarity below this counts as a "clean miss" — a clearly recognized but
 *  wrong word. Anything between this and FUZZY_MIN_SIMILARITY (0.70) is
 *  ambiguous: surface the answer and let the user judge. Picked so that
 *  "date" vs "bee" (sim ~0.25) auto-Unknowns while a 5-char word with two
 *  edits ("growth" vs "groth", sim ~0.83) goes to the match path. */
const CLEAN_MISS_MAX_SIMILARITY = 0.5;

/** Minimum transcript length to trust the heard word. A single-character emit
 *  ("a", "i") is almost always Parakeet hedging on near-silence — show the
 *  "didn't catch that" fallback and suggest a retry instead. */
const CLEAN_MISS_MIN_TRANSCRIPT_CHARS = 2;

/** Transient arm() failures tolerated per card before we stop retrying and let
 *  the learner grade by hand. Small on purpose — a mic that needs four goes is
 *  broken, not slow. */
const MAX_ARM_RETRIES = 3;
/** Backoff between arm retries, multiplied by the attempt number. Long enough
 *  for a previous recorder's native teardown to complete. */
const ARM_RETRY_BASE_MS = 250;

export function useVoiceReview({
  expected,
  currentWordKey,
  rootId,
  promptAudioDoneKey,
  ready,
  stopAudio,
  onKnownAuto,
  onUnknownAuto,
  onRevealAnswer,
}: UseVoiceReviewArgs): {
  phase: VoicePhase;
  debug: VoiceDebug;
  result: VoiceResult | null;
  /** True while auto-listen is muted for the rest of this session. */
  paused: boolean;
  /** Mark the current card Known (the spoken answer was right). */
  accept: () => void;
  /** Mark the current card Unknown. */
  reject: () => void;
  /** Re-open the mic for another attempt on the same card. */
  retry: () => void;
  /** Mute / unmute auto-listen for the rest of this session. */
  togglePause: () => void;
} {
  const voiceEnabled = useAppSelectorShallow(state => state.settings.voiceEnabled);
  // Advanced dev toggles — snapshotted into each telemetry attempt's `meta`.
  const energyGateEnabled = useAppSelectorShallow(state => state.settings.voiceEnergyGateEnabled);
  const gainNormalizeEnabled = useAppSelectorShallow(
    state => state.settings.voiceGainNormalizeEnabled,
  );
  const iosRawMode = useAppSelectorShallow(state => state.settings.voiceIosRawMode);
  const debugEnabled = useAppSelectorShallow(state => state.settings.voiceDebugEnabled);
  const voice = useVoiceGrading();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [debug, setDebug] = useState<VoiceDebug>({
    transcript: '',
    match: null,
    recorder: null,
    armError: null,
  });

  // Bumped by retry() to re-arm the same card; part of the arm effect's deps.
  const [attempt, setAttempt] = useState(0);
  // True for the single arm() triggered by retry(), so it skips the wait-for-
  // audio gate (there's no prompt replaying — open the mic immediately).
  const retryRequestedRef = useRef(false);

  // Session-local mute. When true the arm effect bails (no auto-listen) and any
  // in-flight recording is cancelled. Does NOT touch the global `voiceEnabled`
  // setting or persist — it only quiets the mic for the rest of this session.
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  // Stable refs for callback identity.
  const onKnownAutoRef = useRef(onKnownAuto);
  const onUnknownAutoRef = useRef(onUnknownAuto);
  const onRevealAnswerRef = useRef(onRevealAnswer);
  const stopAudioRef = useRef(stopAudio);
  // Latest dev-settings snapshot for telemetry `meta` (read from a ref so the
  // arm effect / stable callbacks always log the current values without taking
  // the settings as effect deps and re-arming when a toggle flips).
  const settingsRef = useRef({ energyGateEnabled, gainNormalizeEnabled, iosRawMode, debugEnabled });
  useEffect(() => {
    onKnownAutoRef.current = onKnownAuto;
    onUnknownAutoRef.current = onUnknownAuto;
    onRevealAnswerRef.current = onRevealAnswer;
    stopAudioRef.current = stopAudio;
    settingsRef.current = { energyGateEnabled, gainNormalizeEnabled, iosRawMode, debugEnabled };
  });

  // The most recent resolved-or-pending attempt's loggable fields (everything
  // except `resolution`). Populated after each match so the auto-known path and
  // the panel callbacks (accept/reject/retry) can log with the right verdict.
  const attemptCtxRef = useRef<Omit<VoiceAttemptLog, 'resolution'> | null>(null);

  // The card key we've already armed for, to avoid re-arming on incidental
  // re-renders while the mic is in flight.
  const armedForKeyRef = useRef<string | null>(null);
  // Transient arm() failures on the CURRENT card. A card whose arm fails must
  // not be left mic-less for the rest of its life — that is the "I randomly
  // have to wait for the mic" report — so it retries a bounded number of times.
  const armFailuresRef = useRef(0);
  const armRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mirror of `result` so togglePause (a stable callback) can tell whether a
  // wrong-answer panel is currently awaiting the user without re-arming under it.
  const resultRef = useRef<VoiceResult | null>(null);
  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  // Reset on every new card. Latched state tied to currentWordKey transitions —
  // a ref alone wouldn't re-render the indicator overlay. Debug is also reset
  // so the HUD never shows last card's transcript / stats during this card's
  // listening window.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase('idle');
    setResult(null);
    setDebug({ transcript: '', match: null, recorder: null, armError: null });
    armedForKeyRef.current = null;
    attemptCtxRef.current = null;
    armFailuresRef.current = 0;
    if (armRetryTimerRef.current) {
      clearTimeout(armRetryTimerRef.current);
      armRetryTimerRef.current = null;
    }
  }, [currentWordKey]);

  // Drop a pending arm retry if the screen goes away mid-backoff.
  useEffect(
    () => () => {
      if (armRetryTimerRef.current) clearTimeout(armRetryTimerRef.current);
    },
    [],
  );

  // Surface a passive "Preparing voice…" pill ONLY while the model is genuinely
  // loading. On a load error (or any non-loading not-ready state) stay idle —
  // otherwise the pill spins forever on a failure that will never resolve; the
  // user just grades manually. Becomes ready → the arm effect takes over.
  useEffect(() => {
    if (!voiceEnabled) return;
    if (voice.isReady) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase(voice.isLoading ? 'disabled' : 'idle');
  }, [voiceEnabled, voice.isLoading, voice.isReady]);

  useEffect(() => {
    // Every early return below is a card where the mic does NOT open. The user
    // experiences that as "I had to wait for the mic", so each reason is
    // recorded — a silent gate is exactly what made this hard to diagnose.
    if (!voiceEnabled) return;
    if (currentWordKey === 'none') return;
    let blockedBy: string | null = null;
    if (!voice.isReady) blockedBy = 'model-not-ready';
    else if (paused) blockedBy = 'paused';
    else if (!ready) blockedBy = 'session-not-ready';
    else if (!expected || expected.length === 0) blockedBy = 'no-expected';
    // A wrong-answer panel is waiting on the learner. Opening the mic here
    // records them reading the answer, and its verdict replaces the panel they
    // were still deciding on. This used to be implied by the armedForKeyRef
    // latch, which a mid-panel re-render could clear — stating it directly is
    // the only way it actually holds. accept/reject/retry all clear `result`
    // before re-arming, so this never blocks the paths that should re-arm.
    else if (result !== null) blockedBy = 'result-pending';
    else if (armedForKeyRef.current === currentWordKey) blockedBy = 'already-armed';
    // `!expected` is re-tested so TypeScript narrows it for the rest of the
    // effect; the gate above already covers it.
    if (blockedBy !== null || !expected) {
      if (blockedBy !== null) diagMark('mic.gate', { blockedBy, key: currentWordKey });
      return;
    }

    const isRetry = retryRequestedRef.current;
    // Wait for this card's Arabic prompt to finish before opening the mic, so
    // the prompt is never cut off and the mic never records over it. Gated on
    // useReview's per-card `promptAudioDoneKey` (it owns the prompt playback),
    // not the global audio status — which can't tell this card's prompt from
    // lingering audio. A retry/resume skips the gate: no prompt is replaying.
    if (!isRetry && promptAudioDoneKey !== currentWordKey) return;

    armedForKeyRef.current = currentWordKey;
    retryRequestedRef.current = false;
    let cancelled = false;

    const run = async () => {
      setPhase('arming');
      void analytics.track(ANALYTICS_EVENTS.VOICE_ARM, { wordKey: currentWordKey });
      Sentry.addBreadcrumb({
        category: 'voice',
        level: 'info',
        message: 'voice.arm',
        data: { wordKey: currentWordKey },
      });

      const outcome = await voice.arm({
        // The mic is live — only now is it honest to ask for an answer.
        onCapturing: () => {
          if (!cancelled) setPhase('listening');
        },
      });
      if (cancelled) {
        diagMark('mic.arm.cancelled', { key: currentWordKey, ok: outcome.ok });
        return;
      }

      if (!outcome.ok) {
        countDiag({ micArmFailures: 1 });
        diagMark('mic.arm.failed', { reason: outcome.reason, message: outcome.message });
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
        // 'busy' / 'error' / 'not-ready' are transient: the recorder from the
        // previous card may still be tearing down, or the native session
        // hiccupped. Leaving the card here is what strands the learner on a mic
        // that never opens, so re-arm after a short backoff instead.
        if (armFailuresRef.current < MAX_ARM_RETRIES) {
          armFailuresRef.current += 1;
          const delay = ARM_RETRY_BASE_MS * armFailuresRef.current;
          diagMark('mic.arm.retry-scheduled', { attempt: armFailuresRef.current, delay });
          armedForKeyRef.current = null;
          retryRequestedRef.current = true;
          armRetryTimerRef.current = setTimeout(() => {
            armRetryTimerRef.current = null;
            setAttempt(a => a + 1);
          }, delay);
          return;
        }
        diagMark('mic.arm.gave-up', { attempts: armFailuresRef.current });
        setPhase('idle');
        return;
      }
      armFailuresRef.current = 0;

      countDiag({ micArms: 1 });
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
      const endTranscribe = diagSpan('stt.transcribe', {
        samples: outcome.result.waveform.length,
      });
      const transcript = (await voice.transcribe(outcome.result.waveform)) ?? '';
      endTranscribe({ chars: transcript.length });
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
      // Snapshot everything loggable except the resolution. The auto-known path
      // logs immediately; a miss stores it so accept/reject/retry can log with
      // the user's verdict.
      const buildAttemptCtx = (
        sug: VoiceResult['suggestion'],
      ): Omit<VoiceAttemptLog, 'resolution'> => ({
        rootId: rootId ?? null,
        expected: match.normalizedExpected,
        transcript,
        normalizedSpoken: match.normalizedSpoken,
        matched: match.matched,
        matchMethod: match.method,
        similarity: match.similarity,
        suggestion: sug,
        attemptIndex: attempt,
        durationMs: outcome.result.durationMs,
        stopReason: outcome.result.stopReason,
        heardSpeech: outcome.result.heardSpeech,
        peakRms: outcome.result.peakRms,
        bufferCount: outcome.result.bufferCount,
        firstBufferMs: outcome.result.firstBufferMs,
        stopDecidedAtMs: outcome.result.stopDecidedAtMs,
        modelId: PARAKEET_MODEL_ID,
        meta: {
          settings: settingsRef.current,
          recordingConfig: {
            ...DEFAULT_RECORDING_CONFIG,
            energyGateEnabled: settingsRef.current.energyGateEnabled,
            gainNormalizeEnabled: settingsRef.current.gainNormalizeEnabled,
            iosRawMode: settingsRef.current.iosRawMode,
          },
          decoding: { method: VOICE_DECODING_METHOD, maxActivePaths: VOICE_MAX_ACTIVE_PATHS },
        },
      });

      if (match.matched) {
        // Correct → log the auto-pass, then proceed. Blank the indicator before
        // handing off so the "Grading…" pill doesn't linger over the advance
        // animation; the next card re-arms cleanly on mount.
        attemptCtxRef.current = buildAttemptCtx(null);
        void logVoiceAttempt({ ...attemptCtxRef.current, resolution: 'auto_known' });
        setPhase('idle');
        onKnownAutoRef.current();
        return;
      }

      // Any miss now stops and shows the result panel rather than silently
      // auto-advancing — a transcription error must never burn an FSRS attempt
      // without showing the learner what was heard and offering an override.
      // `suggestion` only nudges which button to emphasise; nothing auto-fires.
      const heardReliable =
        match.method !== 'hallucination' &&
        match.normalizedSpoken.length >= CLEAN_MISS_MIN_TRANSCRIPT_CHARS;
      let suggestion: VoiceResult['suggestion'];
      if (!heardReliable) {
        // Silence / hallucination: the transcript can't be trusted — retry.
        suggestion = 'retry';
      } else if (match.similarity < CLEAN_MISS_MAX_SIMILARITY) {
        // Confident, clearly different word — lean Unknown.
        suggestion = 'unknown';
      } else {
        // Ambiguous band (sim 0.50–0.70): let the learner judge.
        suggestion = null;
      }
      if (heardReliable) {
        // Heard a real word that didn't match → error haptic ("that was wrong").
        // Silence / "didn't catch that" isn't a wrong answer, so no haptic — and
        // a correct answer fires nothing either (it just advances).
        errorFeedback();
      }
      Sentry.addBreadcrumb({
        category: 'voice',
        level: 'info',
        message: 'voice.match.miss',
        data: { similarity: match.similarity, spoken: match.normalizedSpoken, suggestion },
      });
      // Hold the attempt; the panel's accept/reject/retry logs it with the verdict.
      attemptCtxRef.current = buildAttemptCtx(suggestion);
      setResult({
        heard: heardReliable ? match.normalizedSpoken : '',
        expected: match.normalizedExpected,
        method: match.method,
        similarity: match.similarity,
        suggestion,
      });
      setPhase('result');
      onRevealAnswerRef.current();
    };

    void run();

    return () => {
      cancelled = true;
      // Any dep change while the mic is open tears the recording down here. If
      // we also left `armedForKeyRef` pointing at this card, the effect's very
      // next run would bail on 'already-armed' and the card would sit with a
      // mic that never reopens — the second half of the "I have to wait for the
      // mic" report. Release the latch so the re-run can re-arm.
      //
      // Not released while a wrong-answer panel is waiting: there the mic is
      // deliberately closed until the learner resolves the panel, and re-arming
      // underneath it would record over their decision.
      const armReleased = resultRef.current === null && armedForKeyRef.current === currentWordKey;
      if (armReleased) armedForKeyRef.current = null;
      diagMark('mic.effect.cleanup', { key: currentWordKey, armReleased });
      // The recording this phase described is gone; leaving "Listening…" up
      // would keep inviting an answer nothing is capturing. A later run sets
      // its own phase, and 'result' belongs to the panel, so leave that alone.
      setPhase(p => (p === 'arming' || p === 'listening' || p === 'checking' ? 'idle' : p));
      // Cancel is a no-op when nothing is in flight.
      void voice.cancel();
    };
  }, [
    voiceEnabled,
    voice,
    paused,
    ready,
    result,
    expected,
    currentWordKey,
    rootId,
    promptAudioDoneKey,
    attempt,
    dispatch,
    showToast,
  ]);

  const accept = useCallback((): void => {
    const ctx = attemptCtxRef.current;
    if (ctx) void logVoiceAttempt({ ...ctx, resolution: 'accept' });
    attemptCtxRef.current = null;
    setResult(null);
    // Blank the indicator immediately so nothing transient (the cleared result
    // panel, a stale phase) shows during the advance; the next card re-arms.
    setPhase('idle');
    onKnownAutoRef.current();
  }, []);

  const reject = useCallback((): void => {
    const ctx = attemptCtxRef.current;
    if (ctx) void logVoiceAttempt({ ...ctx, resolution: 'reject' });
    attemptCtxRef.current = null;
    setResult(null);
    setPhase('idle');
    onUnknownAutoRef.current();
  }, []);

  const retry = useCallback((): void => {
    const ctx = attemptCtxRef.current;
    if (ctx) void logVoiceAttempt({ ...ctx, resolution: 'retry' });
    // Stop the reveal audio (played when the panel appeared) before reopening
    // the mic, so its tail isn't captured by the new recording.
    stopAudioRef.current();
    setResult(null);
    setPhase('arming');
    // Force the arm effect to fire again for this same card and skip the
    // wait-for-audio gate so the mic reopens immediately.
    retryRequestedRef.current = true;
    armedForKeyRef.current = null;
    setAttempt(a => a + 1);
  }, []);

  const togglePause = useCallback((): void => {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    if (next) {
      // Pausing — the arm effect's cleanup cancels any in-flight recording once
      // `paused` flips in its deps; clear the live indicator here so the pill
      // doesn't linger while the recorder unwinds. A waiting result panel stays.
      setPhase(p => (p === 'arming' || p === 'listening' || p === 'checking' ? 'idle' : p));
    } else if (resultRef.current === null) {
      // Resuming with no pending panel — re-open the mic for the current card
      // even if we'd already armed for it before pausing (the cancelled
      // recording left armedForKeyRef set). The prompt audio already played, so
      // skip the wait-for-audio gate and open the mic right away, like a retry.
      armedForKeyRef.current = null;
      retryRequestedRef.current = true;
      setPhase('arming');
    }
    // Resuming while a wrong-answer panel is up: keep armedForKeyRef so the arm
    // effect bails under the panel; the next card arms once the user resolves it.
  }, []);

  return { phase, debug, result, paused, accept, reject, retry, togglePause };
}
