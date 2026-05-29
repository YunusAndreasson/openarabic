/**
 * Wires the voice-grading pipeline into a Practice review session. Auto-arms
 * the mic on each new card (after a short delay so the Arabic audio can play
 * first), then on stop transcribes via Parakeet and runs `matchSingleWord`
 * against the card's English meaning.
 *
 * Match → calls `onKnownAuto()` (the review screen routes through the existing
 * Known path). Miss → calls `onRevealAnswer()` so the English appears and the
 * card stays open for the user to manually choose Known / Unknown. There is no
 * auto-Unknown — a missed transcript must not consume an FSRS attempt.
 */
import * as Sentry from '@sentry/react-native';
import { useEffect, useRef, useState } from 'react';

import { useToast, useVoiceGrading } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { STRINGS } from '@/constants/strings';
import { analytics } from '@/services/analytics';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import { setVoiceEnabled } from '@/store/settingsSlice';
import { matchSingleWord } from '@/utils/voiceMatching';

export type VoicePhase = 'idle' | 'listening' | 'checking' | 'revealed' | 'disabled';

/** Last-recording diagnostics surfaced to the on-screen voice HUD. */
export interface VoiceDebug {
  /** Trimmed Parakeet output for the most recent recording, '' if none. */
  transcript: string;
  /** Outcome of matchSingleWord on the most recent recording. */
  match: { matched: boolean; method: string; spoken: string; expected: string } | null;
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
  /** Called after a miss — caller should reveal the English meaning + play audio. */
  onRevealAnswer: () => void;
}

/** How long to wait after a card settles before opening the mic. Lets the
 *  pre-cached Arabic audio play out (typically ~1 s). */
const ARM_DELAY_MS = 1400;

export function useVoiceReview({
  expected,
  currentWordKey,
  ready,
  onKnownAuto,
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
  const onRevealAnswerRef = useRef(onRevealAnswer);
  useEffect(() => {
    onKnownAutoRef.current = onKnownAuto;
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

    const timer = setTimeout(async () => {
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
          spoken: match.normalizedSpoken,
          expected: match.normalizedExpected,
        },
      }));
      if (match.matched) {
        onKnownAutoRef.current();
        // Phase resets when the next card mounts (currentWordKey change).
        return;
      }

      setPhase('revealed');
      onRevealAnswerRef.current();
    }, ARM_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
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
