/**
 * Wires the voice-grading pipeline into a Practice review session. The mic opens
 * by itself once the Arabic prompt has played, and the learner just answers.
 *
 * That is the second time this has been automatic, and the reason it is safe now
 * is worth stating, because the first attempt was removed for good cause.
 *
 * Arming on the prompt used to mean the microphone stood open while the learner
 * was still thinking — and the gate deciding what it heard read LOUDNESS. Room
 * tone, a passing conversation or a television clears 12 dB over a quiet room
 * easily, so the window confirmed speech on nobody, closed on 900 ms of quiet,
 * and graded an empty transcript against a card that had never been answered.
 * The tap was introduced to remove the guess: it is unambiguous intent, and the
 * pause before answering IS the retrieval, so the learner owned when it ended.
 *
 * What changed is the question the gate asks. A voice-activity detector answers
 * *is this a voice*, not *is this loud* (see `hooks/voice/useSpeechGate.ts`), so
 * an open microphone through the thinking pause costs nothing — which is what
 * makes taking the tap away an improvement rather than a regression. The tap did
 * not disappear: `speakNow()` is still the way to answer over a prompt still
 * playing, still the way back after a window that heard nothing, and still the
 * only thing that will show the OS microphone dialog. Every gate below is
 * unchanged; hands-free simply supplies the request the tap used to.
 *
 * On stop it transcribes via Parakeet and runs `matchSingleWord` against the
 * card's English meaning.
 *
 * A correct answer just proceeds — `onKnownAuto()` fires and the card advances,
 * keeping the hands-free flow fast. We only stop the learner when the answer
 * was *wrong*: a `result` is surfaced and the panel waits, so a mishear can
 * never silently burn an FSRS attempt. The learner taps `accept()` (the answer
 * was actually right → Known), `reject()` (Unknown), or `retry()` (re-record);
 * `suggestion` nudges the likely choice.
 *
 * A heard-but-wrong word marks the card immediately via `onMissHeard()`, before
 * any of those buttons is pressed. Waiting for the press meant the one thing
 * the learner already knew — that they had said something else — was the one
 * thing the app would not say until asked. The mark is provisional: `accept()`
 * repaints the same card green and throws it, which is what overruling the
 * recognizer should look like. Silence and hallucinated transcripts are exempt;
 * those are us failing to hear, not them being wrong.
 */
import { type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';

import { useToast, useVoiceGrading } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { STRINGS } from '@/constants/strings';
import { useResumeFromBackground } from '@/hooks/app/useResumeFromBackground';
import {
  PARAKEET_MODEL_ID,
  VOICE_DECODING_METHOD,
  VOICE_HOTWORD_DECODING_METHOD,
} from '@/constants/voiceModel';
import {
  DEFAULT_RECORDING_CONFIG,
  forgetMicPermissionRefusal,
  getMicPermissionStatus,
} from '@/lib/voice/recording';
import type { RecordingStopReason, SpeechGateKind } from '@/lib/voice/recording';
import type { RootId } from '@/types/branded.types';
import { analytics } from '@/services/analytics';
import {
  logVoiceArmFailure,
  logVoiceAttempt,
  type VoiceAttemptLog,
} from '@/services/voiceTelemetry';
import { getVoiceModelSnapshot } from '@/services/voiceModelStore';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import {
  selectVoiceEnergyGateEnabled,
  selectVoiceGainNormalizeEnabled,
} from '@/store/settingsSlice';
import { rememberAlias } from '@/store/voiceAliasesSlice';
import { isAliasStorable } from '@/utils/voiceAliases';
import { lightFeedback, warningFeedback } from '@/utils/haptics';
import { getArmStages, markArmTap } from '@/utils/armTelemetry';
import { getPromptSnapshot, recordPromptCut } from '@/utils/promptTelemetry';
import { countDiag, mark as diagMark, span as diagSpan } from '@/utils/reviewDiagnostics';
import { matchSingleWord } from '@/utils/voiceMatching';
import type { MatchMethod, VoiceSuggestion } from '@/utils/voiceMatching';
import { voiceBreadcrumb } from '@/utils/errorHandling';

/**
 * `arming` is the window between asking for the mic and the mic actually
 * delivering audio (~0.5 s on device: permission check, then opening an
 * exclusive input stream). It is a distinct phase because showing "Listening…"
 * across it invites the learner to answer into a mic that is not recording yet
 * — the answer is lost, the card times out, and it reads as "the mic is
 * unreliable".
 */
export type VoicePhase =
  | 'idle'
  | 'arming'
  | 'listening'
  | 'checking'
  | 'result'
  /** The recognizer is still downloading or loading — voice will work shortly.
   *  Split out from the old catch-all `disabled`, which used the same value for
   *  this and for a refused microphone. They mean opposite things to a learner
   *  ("wait" vs "this will never work until you change a setting") and the
   *  channel could not tell them apart. */
  | 'loading'
  /** The OS refused the microphone. Momentary in practice — the arm path also
   *  turns the voice setting off, which unmounts the channel — but it must not
   *  read as "preparing" for even that long. */
  | 'denied';

/**
 * The microphone owns the audio session right now, so nothing else may play.
 *
 * `setPlaybackPriority` refuses to close a capturing stream ("closing the
 * stream would discard the audio the learner is producing right now"), so a
 * playback request inside this window does not take the session — it plays on
 * the quiet record-capable route AND into the recording. Inaudible to the
 * learner, noise to the recognizer.
 *
 * A fact about the phase, kept here with the phase rather than derived from
 * `voiceIndicatorState`: that one answers "what should the card be saying",
 * which is a display question the screen additionally suppresses during an
 * advance. Reading a caption selector as a safety gate meant the gate opened
 * on every grade commit while the mic was still live.
 */
export const micHoldsAudioSession = (phase: VoicePhase): boolean =>
  phase === 'arming' || phase === 'listening' || phase === 'checking';

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
  method: MatchMethod;
  similarity: number;
  /** The action the recognizer leans toward, used to emphasise one button.
   *  'retry' when the audio was unusable, 'unknown' for a confident wrong
   *  word, null when genuinely ambiguous (let the learner judge). */
  suggestion: VoiceSuggestion;
}

/** Last-recording diagnostics surfaced to the on-screen voice HUD. */
export interface VoiceDebug {
  /** Trimmed Parakeet output for the most recent recording, '' if none. */
  transcript: string;
  /** Outcome of matchSingleWord on the most recent recording. */
  match: {
    matched: boolean;
    method: MatchMethod;
    similarity: number;
    spoken: string;
    expected: string;
  } | null;
  /** Raw recorder stats from the most recent stop. */
  recorder: {
    durationMs: number;
    bufferCount: number;
    stopReason: RecordingStopReason;
    /** Which detector decided this window. The config says only what was
     *  ASKED for: the VAD is skipped before its model lands and handed back
     *  mid-window on a bad capture rate, and a stop that looks wrong reads
     *  completely differently depending on which one took it. */
    gateUsed: SpeechGateKind;
    heardSpeech: boolean;
    peakRms: number;
    /** The room the gate judged this answer against, and how much of the
     *  window cleared it. A stop that looks wrong is almost always one of
     *  these two being wrong, and neither is visible from `peakRms`.
     *  `null` when no buffer ever arrived — a dead mic has measured nothing,
     *  and must not read as a quiet room. */
    noiseFloorDb: number | null;
    speechMs: number;
    firstBufferMs: number | null;
    stopDecidedAtMs: number;
  } | null;
  /** Last terminal arm() outcome (permission / busy / error / etc.). */
  armError: string | null;
}

const createEmptyVoiceDebug = (): VoiceDebug => ({
  transcript: '',
  match: null,
  recorder: null,
  armError: null,
});

interface UseVoiceReviewArgs {
  /** The English meaning expected from the user. Empty if no current card. */
  expected: string | null | undefined;
  /** Key that changes when a new card is shown. */
  currentWordKey: string;
  /** Current card's root id, recorded with each telemetry attempt. */
  rootId: RootId | null | undefined;
  /** Other English names the corpus gives this same root — see
   *  `useReviewGlossAlternates`. Widens what counts as right, at `vague`. */
  glossAlternates?: readonly string[];
  /** Every OTHER answer in the session. Not used for grading: it is the
   *  one thing that may veto remembering a "Got it", because a transcript that
   *  is another drilled word's gloss would otherwise pass two cards forever. */
  otherGlosses?: readonly string[];
  /** Every answer due this session, fixed at its start — what the recogniser is
   *  biased toward. See `utils/voiceHotwords.ts`. `undefined` while the session
   *  is still loading: the recogniser is not built until this is known. */
  sessionGlosses?: readonly string[];
  /** Is the review session ready (not loading, no audio preload in flight). */
  ready: boolean;
  /**
   * The card whose Arabic prompt has finished — the moment hands-free arming
   * waits for. See `useReview.promptAudioDoneKey`.
   */
  promptDoneKey: string | null;
  /**
   * Open the microphone as soon as this card's prompt ends, with no tap.
   * Off restores the explicit "Speak to answer" button.
   */
  handsFree: boolean;
  /** Stop any in-flight playback (reveal audio) before reopening the mic on a
   *  retry, so its tail isn't captured by the recording. */
  stopAudio: () => void;
  /** Called after a match — caller should advance the card as Known. */
  onKnownAuto: () => void;
  /** Called when the utterance SOUNDED like the answer but transcribed as
   *  something else — caller should advance the card as Guessed. Credit, not a
   *  failure: see the `near` path in voiceMatching. */
  onVagueAuto: () => void;
  /** Called after a clean miss (recognized real word that's clearly different
   *  from the expected) — caller should advance the card as Unknown. */
  onUnknownAuto: () => void;
  /** Called after an ambiguous miss / hallucination / silence — caller should
   *  reveal the English meaning and let the user pick Known or Unknown. */
  onRevealAnswer: () => void;
  /**
   * Called the moment a REAL word was heard and it was not the answer — before
   * the learner has decided anything. The caller should mark the card wrong.
   *
   * This is not a grade and may still be overturned: the result panel's "I knew
   * it" turns the same card green. It fires anyway because the alternative is
   * what shipped first — the learner said the wrong word and nothing happened
   * until they pressed a button to be told so, which is feedback arriving after
   * the person already had to work out the answer for themselves.
   *
   * Deliberately NOT fired for silence or a hallucinated transcript. Those are
   * the app failing to hear, not the learner being wrong, and marking the card
   * red would score our failure against them (`onRevealAnswer` still runs, and
   * the warning haptic still says "we're back, nothing landed").
   */
  onMissHeard: () => void;
}

/** Shared empty list so the optional grading inputs keep a stable identity. */
const EMPTY_STRINGS: readonly string[] = [];

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
/** Ceiling on a single transcription. The native call has no timeout of its
 *  own, so a hung ONNX session left the card stuck on "Grading…" with no way
 *  out but advancing. Measured on the Android emulator: 2949 ms cold (ONNX warm
 *  start) then ~1150 ms steady for 8 s of audio, so this is ~5x the worst
 *  observed case — it only ever fires on a genuine hang. */
const TRANSCRIBE_TIMEOUT_MS = 15000;

/** Resolves to `null` if the transcription outlives its budget, so the caller
 *  falls through to the "didn't catch that" panel instead of hanging. The
 *  native promise is abandoned, not cancelled — sherpa exposes no cancel — but
 *  a late resolution is harmless: `cancelled` already guards the continuation. */
async function transcribeWithTimeout(
  run: Promise<string | null>,
  timeoutMs: number = TRANSCRIBE_TIMEOUT_MS,
): Promise<{ transcript: string; timedOut: boolean }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>(resolve => {
    timer = setTimeout(() => resolve(null), timeoutMs);
  });
  try {
    const winner = await Promise.race([run.then(value => ({ value })), timeout]);
    if (winner === null) return { transcript: '', timedOut: true };
    return { transcript: winner.value ?? '', timedOut: false };
  } finally {
    clearTimeout(timer);
  }
}

export function useVoiceReview({
  expected,
  currentWordKey,
  rootId,
  glossAlternates,
  otherGlosses,
  sessionGlosses,
  ready,
  promptDoneKey,
  handsFree,
  stopAudio,
  onKnownAuto,
  onVagueAuto,
  onUnknownAuto,
  onRevealAnswer,
  onMissHeard,
}: UseVoiceReviewArgs): {
  micDenied: boolean;
  phase: VoicePhase;
  debug: VoiceDebug;
  result: VoiceResult | null;
  /** Mark the current card Known (the spoken answer was right). */
  accept: () => void;
  /** Mark the current card Unknown. */
  reject: () => void;
  /** Re-open the mic for another attempt on the same card. */
  retry: () => void;
  /** Open the mic for this card right now, whatever the gates say — the
   *  learner asked for it (hold-to-talk / skip the prompt). */
  speakNow: () => void;
  /** End a hold-to-talk recording and grade what was captured. */
  stopSpeaking: () => void;
  /**
   * Hands-free is genuinely driving THIS card, so the screen may drop the
   * "Speak to answer" button.
   *
   * One value, computed here, because every term in it lives here and the
   * screen re-deriving any of them is how the control disappears in a state
   * that still needs it. It shipped that way once: the screen tested only the
   * setting, so a fresh install — where the OS has not been asked for the
   * microphone yet, and the tap on that button is the ONLY thing that asks —
   * rendered no button, never armed, never prompted, and left voice
   * permanently unreachable with no way out.
   *
   * False therefore whenever the learner still needs the manual control: voice
   * switched off, the permission not yet granted, or this card's window having
   * already waited out its budget and heard nobody.
   */
  handsFreeActive: boolean;
} {
  const voiceEnabled = useAppSelectorShallow(state => state.settings.voiceEnabled);
  // Advanced dev toggles — snapshotted into each telemetry attempt's `meta`.
  const energyGateEnabled = useAppSelectorShallow(selectVoiceEnergyGateEnabled);
  const gainNormalizeEnabled = useAppSelectorShallow(selectVoiceGainNormalizeEnabled);
  const iosRawMode = useAppSelectorShallow(state => state.settings.voiceIosRawMode);
  const debugEnabled = useAppSelectorShallow(state => state.settings.voiceDebugEnabled);
  // The learner's own accept-list. Selected as the whole map (shallow-compared,
  // so only a genuine write re-renders) and indexed per card, because the root
  // changes on every card and a per-root selector would rebuild each time.
  const aliasesByRoot = useAppSelectorShallow(state => state.voiceAliases.byRoot);
  const aliases = (rootId != null ? aliasesByRoot[String(rootId)] : undefined) ?? EMPTY_STRINGS;
  const voice = useVoiceGrading();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [debug, setDebug] = useState<VoiceDebug>(createEmptyVoiceDebug);
  const debugRef = useRef(debug);
  const debugEnabledRef = useRef(debugEnabled);

  // Diagnostics must keep their latest snapshot for a HUD that is enabled
  // mid-attempt, but hidden instrumentation must not repaint ReviewContent.
  // Keep the canonical value in a ref and publish it to React only while the
  // advanced HUD is actually visible.
  const publishDebug = useCallback((update: SetStateAction<VoiceDebug>): void => {
    const next = typeof update === 'function' ? update(debugRef.current) : update;
    debugRef.current = next;
    if (debugEnabledRef.current) setDebug(next);
  }, []);

  useEffect(() => {
    debugEnabledRef.current = debugEnabled;
    if (debugEnabled) setDebug(debugRef.current);
  }, [debugEnabled]);

  // Bumped by every path that asks for the mic, so the arm effect re-runs.
  const [attempt, setAttempt] = useState(0);
  // Opening the capture session is itself microphone use (and lights the OS
  // privacy indicator), so it must be downstream of an explicit voice action.
  // Once requested, keep it warm for the remainder of this review session.
  const [sessionRequested, setSessionRequested] = useState(false);
  /**
   * A microphone has been asked for and the effect may arm exactly once.
   *
   * The one trigger every path goes through, so there is a single place a window
   * can be opened from: hands-free (the card's prompt ending), `speakNow()` (the
   * tap), `retry()`, and the transient-failure backoff — which is the one case
   * where the request outlives its first attempt, since the asking already
   * happened and the ladder is only finishing it.
   */
  const armRequestedRef = useRef(false);

  // Timing the learner actually feels: the tap, and the moment the microphone
  // began delivering audio. `first_buffer_ms` measures from the window opening,
  // which misses everything before it — the React round trip, a dead window and
  // its retry backoff. That gap is the whole complaint.
  const tapAtRef = useRef<number | null>(null);
  const tapToCapturingRef = useRef<number | null>(null);
  /**
   * What set `armRequestedRef` for this card. Recorded because a field report
   * of "the mic was live and I never tapped" cannot be checked without it —
   * `tapToCapturingMs` looked like the answer but was structurally always null
   * (`tapAtRef` was cleared and read, never assigned), so it proved nothing.
   * A row with an arm and a null trigger is an arm nobody asked for.
   */
  const armTriggerRef = useRef<'tap' | 'auto' | 'retry' | 'ladder' | null>(null);
  /**
   * Whether the window currently being graded was one the learner opened.
   *
   * Read after the recording stops, where a `noSpeech` result means opposite
   * things for the two: a tapped window that heard nothing is a failed answer
   * worth showing, and a self-opened one is a card nobody chose to speak to.
   */
  const handsFreeWindowRef = useRef(false);
  /**
   * The card whose hands-free window ran out its budget without hearing
   * anything. Its microphone is not reopened — that would be a loop — and the
   * manual control comes back for that card instead.
   */
  const handsFreeExhaustedRef = useRef<string | null>(null);
  const [handsFreeExhausted, setHandsFreeExhausted] = useState<string | null>(null);
  /** The card hands-free has already opened once, so it opens exactly once. */
  const autoArmedForKeyRef = useRef<string | null>(null);

  // Stable refs for callback identity.
  const onKnownAutoRef = useRef(onKnownAuto);
  const onVagueAutoRef = useRef(onVagueAuto);
  const onUnknownAutoRef = useRef(onUnknownAuto);
  const onRevealAnswerRef = useRef(onRevealAnswer);
  const onMissHeardRef = useRef(onMissHeard);
  const stopAudioRef = useRef(stopAudio);
  // Latest dev-settings snapshot for telemetry `meta` (read from a ref so the
  // arm effect / stable callbacks always log the current values without taking
  // the settings as effect deps and re-arming when a toggle flips).
  const settingsRef = useRef({ energyGateEnabled, gainNormalizeEnabled, iosRawMode, debugEnabled });
  // Read by speakNow/stopSpeaking, which are stable callbacks handed to the
  // voice channel: they need the CURRENT phase to decide whether there is
  // anything to take over or to stop.
  const phaseRef = useRef<VoicePhase>('idle');
  // The two grading widenings, held in refs for the same reason the settings
  // are: both arrive as fresh arrays every render, and the arm effect's deps
  // are load-bearing — adding either would re-run it (and cancel an in-flight
  // recording) on any incidental re-render.
  const aliasesRef = useRef<readonly string[]>(EMPTY_STRINGS);
  const glossAlternatesRef = useRef<readonly string[]>(EMPTY_STRINGS);
  const otherGlossesRef = useRef<readonly string[]>(EMPTY_STRINGS);
  useEffect(() => {
    onKnownAutoRef.current = onKnownAuto;
    onVagueAutoRef.current = onVagueAuto;
    onUnknownAutoRef.current = onUnknownAuto;
    onRevealAnswerRef.current = onRevealAnswer;
    onMissHeardRef.current = onMissHeard;
    stopAudioRef.current = stopAudio;
    settingsRef.current = { energyGateEnabled, gainNormalizeEnabled, iosRawMode, debugEnabled };
    phaseRef.current = phase;
    aliasesRef.current = aliases;
    glossAlternatesRef.current = glossAlternates ?? EMPTY_STRINGS;
    otherGlossesRef.current = otherGlosses ?? EMPTY_STRINGS;
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

  // Mirror of `result` so the arm effect's cleanup (which closes over the run
  // that scheduled it) can tell whether a wrong-answer panel is currently
  // awaiting the user, and leave the already-armed latch alone if so.
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
    publishDebug(createEmptyVoiceDebug());
    armedForKeyRef.current = null;
    attemptCtxRef.current = null;
    armFailuresRef.current = 0;
    // A request to open the mic belongs to the card that asked for it. Without
    // this, a request still pending when the card advanced (an arm-failure
    // backoff) would open a live mic on the next card
    // while its Arabic prompt is playing — nobody asked for that, and the
    // recording captures the prompt.
    armRequestedRef.current = false;
    tapAtRef.current = null;
    tapToCapturingRef.current = null;
    armTriggerRef.current = null;
    if (armRetryTimerRef.current) {
      clearTimeout(armRetryTimerRef.current);
      armRetryTimerRef.current = null;
    }
  }, [currentWordKey, publishDebug]);

  // Drop a pending arm retry if the screen goes away mid-backoff.
  useEffect(
    () => () => {
      if (armRetryTimerRef.current) clearTimeout(armRetryTimerRef.current);
    },
    [],
  );

  // Both effects below depend on the individual callbacks rather than the whole
  // `voice` context value: that object's identity changes whenever any of its
  // state does, so depending on it would tear the session down and rebuild it.
  const { prewarmPermission, acquireSession, acquireEngine, offerHotwordGlosses } = voice;

  // Bias the recogniser toward this session's answers — all of them, so the
  // list never says which one the current card wants. Keyed on the sorted
  // glosses because the array is rebuilt on every render.
  //
  // Declared before the retain below, and the retain waits for it: hotwords are
  // fixed when the engine is built, so retaining first started an unbiased
  // build that the vocabulary arriving a moment later tore down and replaced —
  // two full builds back to back on a session opened from a reminder, with the
  // mic shut for the whole of card 1.
  const vocabularyKnown = sessionGlosses !== undefined;
  const sessionGlossKey = [...(sessionGlosses ?? [])].sort().join('\n');
  useEffect(() => {
    if (!voiceEnabled || !sessionGlossKey) return;
    offerHotwordGlosses(sessionGlossKey.split('\n'));
  }, [voiceEnabled, sessionGlossKey, offerHotwordGlosses]);

  // Hold the recognizer in RAM for the life of the session. The Practice tab
  // retains it too, so entering review from there does not rebuild it — the
  // provider's linger covers the gap between the two retainers, and is far
  // longer than the session takes to load its words.
  useEffect(() => {
    if (!voiceEnabled || !vocabularyKnown) return;
    return acquireEngine();
  }, [voiceEnabled, vocabularyKnown, acquireEngine]);

  // The headline metric for whether the prefetch is working: a session that
  // opened with no usable recognizer. Fired once per session, and deliberately
  // carries WHY — "still downloading" and "waiting for Wi-Fi" call for
  // completely different fixes, and before this the two were indistinguishable
  // from the outside. Ideally this trends to zero.
  const sessionReadinessLoggedRef = useRef(false);
  useEffect(() => {
    if (!voiceEnabled || sessionReadinessLoggedRef.current) return;
    // Latched on the first look either way. The recogniser is rebuilt when the
    // session's hotwords arrive, and that later not-ready pass is not a session
    // that opened without a model.
    sessionReadinessLoggedRef.current = true;
    if (voice.isReady) return;
    void analytics.track(ANALYTICS_EVENTS.VOICE_SESSION_STARTED_WITHOUT_MODEL, {
      // Read from the module inside the effect rather than through the hook:
      // this is a one-shot report, not something that should re-render.
      modelState: getVoiceModelSnapshot().state,
    });
  }, [voiceEnabled, voice.isReady]);

  // The microphone permission is NOT asked for here any more.
  //
  // It used to be prewarmed at session start, which was right when voice was
  // opt-in: a learner who had just tapped "Turn it on" understood what the OS
  // dialog was for. With voice on by DEFAULT that same code fires an
  // unexplained microphone prompt seconds into a new learner's first ever
  // review session, before they have seen a single voice control — and a
  // contextless prompt gets denied. The tap on "Speak to answer" is
  // unambiguous intent and supplies its own context, so the ask moves there
  // (see `speakNow`).
  //
  // The reason prewarming existed still holds for every card AFTER the first:
  // `prewarmPermission` is latched once per provider lifetime, so the first tap
  // pays the dialog and no later card ever does.

  // Keep the input warm after the learner has asked to speak, but never acquire
  // it merely because the review screen mounted. `acquireSession()` opens a
  // real native input stream; doing that before intent both triggered the OS
  // prompt and lit the microphone privacy indicator behind an idle button.
  useEffect(() => {
    if (!voiceEnabled || !voice.isReady || !sessionRequested) return;
    return acquireSession();
  }, [voiceEnabled, voice.isReady, sessionRequested, acquireSession]);

  // Track whether the recognizer is genuinely on its way, as distinct from any
  // other not-ready state (a load error being the one that matters).
  //
  // 'loading' IS RENDERED AGAIN. It used to drive a passive "Preparing voice…"
  // pill in the review header; that header slot went away and nothing replaced
  // it, so for a while a session whose model was still downloading reported
  // nothing at all — the voice button was simply absent, which is
  // indistinguishable from the feature not existing. That silence is what this
  // phase's own doc warns about ("wait" and "this will never work until you
  // change a setting" mean opposite things), and it is now shown in the action
  // band by `voiceButtonMode`, which reads the model state directly.
  useEffect(() => {
    if (!voiceEnabled) return;
    if (voice.isReady) {
      // Loading is a transient readiness phase. Once the engine arrives, put
      // the action back into its tappable idle state; returning here used to
      // strand the button on "Preparing…" despite a usable recognizer.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase(current => (current === 'loading' ? 'idle' : current));
      return;
    }
    setPhase(voice.isWarming ? 'loading' : 'idle');
  }, [voiceEnabled, voice.isWarming, voice.isReady]);

  /**
   * Has the OS already granted the microphone? Checked without prompting, once
   * per mount, because hands-free has no tap to attach a dialog to.
   */
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'unknown'>('unknown');
  const micGranted = micPermission === 'granted';
  useEffect(() => {
    // Both answers are terminal for this process — changing the permission in
    // Settings terminates the app, so a relaunch is the only thing that can
    // revise either. Stopping on both is what keeps a refused learner from
    // paying a native round-trip on every phase hop of every card, forever.
    if (!voiceEnabled || micPermission !== 'unknown') return;
    let active = true;
    void getMicPermissionStatus().then(status => {
      if (active && status !== 'unknown') setMicPermission(status);
    });
    return () => {
      active = false;
    };
    // `phase` is a trigger, not a value read here: the first tap on "Speak to
    // answer" is what shows the OS dialog, so the answer changes underneath us
    // exactly once — when that tap resolves — and re-reading on the phase it
    // moves through is how hands-free takes over for the rest of the session
    // instead of waiting for a remount. It stops re-asking on both terminal
    // answers, which is why `micGranted` and the denial latch are gates here
    // and not just targets.
  }, [voiceEnabled, micPermission, phase]);

  // A refusal is not final: "Enable microphone" sends the learner to Settings,
  // and on Android granting there keeps this process alive (only revoking
  // kills it). Coming back re-reads the permission instead of trusting the
  // refusal, so a grant unlocks voice on the spot — this card included — and a
  // still-refused microphone lands straight back on "Enable microphone".
  useResumeFromBackground(() => {
    forgetMicPermissionRefusal();
    setMicPermission(current => (current === 'denied' ? 'unknown' : current));
    setPhase(current => (current === 'denied' ? 'idle' : current));
  }, micPermission === 'denied');

  /**
   * Hands-free arming: the microphone opens itself once the Arabic has played.
   *
   * This is the same request `speakNow()` makes, minus the tap — it sets the
   * trigger and bumps `attempt`, and the effect below does the actual arming, so
   * there is exactly one path that opens a microphone.
   *
   * Why it waits for the prompt rather than opening with the card: the input
   * stream is dropped for the duration of every prompt so the word plays at full
   * volume, so there is no earlier moment at which a window could exist. That
   * also means hands-free cannot answer OVER the prompt — for that the learner
   * still has the button, which is why `speakNow` keeps its prompt-cutting
   * behaviour.
   *
   * Every guard here is a reason NOT to take the tap away:
   *   - no permission yet — the tap is the only honest place for the OS dialog
   *   - a result panel is open — the mic must not record them reading the answer
   *   - this card already had its window — one automatic open per card, so a
   *     re-render can't reopen a mic the learner just finished with
   *   - the budget already ran out on this card — see `handsFreeExhaustedRef`
   */
  useEffect(() => {
    if (!handsFree || !voiceEnabled || !micGranted) return;
    if (currentWordKey === 'none' || promptDoneKey !== currentWordKey) return;
    if (!voice.isReady || !ready) return;
    if (!expected || expected.length === 0) return;
    if (result !== null) return;
    if (autoArmedForKeyRef.current === currentWordKey) return;
    if (handsFreeExhaustedRef.current === currentWordKey) return;
    if (armedForKeyRef.current === currentWordKey) return;

    autoArmedForKeyRef.current = currentWordKey;
    diagMark('mic.autoArm', { key: currentWordKey });
    setSessionRequested(true);
    tapAtRef.current = Date.now();
    armTriggerRef.current = 'auto';
    markArmTap();
    armRequestedRef.current = true;
    setAttempt(a => a + 1);
  }, [
    handsFree,
    voiceEnabled,
    micGranted,
    currentWordKey,
    promptDoneKey,
    voice.isReady,
    ready,
    expected,
    result,
  ]);

  useEffect(() => {
    // Every early return below is a card where the mic does NOT open. The user
    // experiences that as "I had to wait for the mic", so each reason is
    // recorded — a silent gate is exactly what made this hard to diagnose.
    if (!voiceEnabled) return;
    if (currentWordKey === 'none') return;
    let blockedBy: string | null = null;
    if (!voice.isReady) blockedBy = 'model-not-ready';
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
    // The trigger. Every other gate above is a reason an arm CAN'T happen; this
    // one is the reason it doesn't happen yet — the learner has not tapped.
    else if (!armRequestedRef.current) blockedBy = 'awaiting-tap';
    // `!expected` is re-tested so TypeScript narrows it for the rest of the
    // effect; the gate above already covers it.
    if (blockedBy !== null || !expected) {
      if (blockedBy !== null) diagMark('mic.gate', { blockedBy, key: currentWordKey });
      return;
    }

    // No wait-for-the-prompt gate any more: `speakNow()` stops the prompt on its
    // way in, so by the time we get here the clip is already down. That gate
    // existed to stop an automatic arm from opening over the Arabic — with the
    // tap as the trigger there is nothing to race.
    armedForKeyRef.current = currentWordKey;
    armRequestedRef.current = false;
    // Latched here rather than read later: `armTriggerRef` is overwritten by the
    // retry ladder, and by the time the recording stops it may no longer say who
    // opened the window this result came out of.
    handsFreeWindowRef.current = armTriggerRef.current === 'auto';
    let cancelled = false;

    const run = async () => {
      setPhase('arming');
      // `trigger` matters more than it used to: hands-free arms on essentially
      // every card, so without it this event is a card counter rather than a
      // measure of anyone reaching for the microphone.
      void analytics.track(ANALYTICS_EVENTS.VOICE_ARM, {
        wordKey: currentWordKey,
        trigger: armTriggerRef.current ?? 'unknown',
      });
      voiceBreadcrumb('voice.arm', { wordKey: currentWordKey });

      const outcome = await voice.arm({
        // A window nobody asked for has to outlast the learner thinking; one
        // opened by a tap does not. Only the two deadlines that wait for speech
        // move — see `withHandsFreeBudget`.
        handsFree: handsFreeWindowRef.current,
        // The mic is live — only now is it honest to ask for an answer.
        onCapturing: () => {
          tapToCapturingRef.current =
            tapAtRef.current === null ? null : Date.now() - tapAtRef.current;
          diagMark('mic.capturing', { tapToCapturingMs: tapToCapturingRef.current });
          if (!cancelled) {
            setPhase('listening');
            // "Go." The mic opens half a second to a second after the tap, and
            // the learner is looking at the word they are about to say, not at
            // the button that changes caption. Without this the only way to
            // know when to start speaking is to watch the UI — which is the one
            // thing a spoken-answer exercise should not require.
            lightFeedback();
          }
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
          voiceBreadcrumb('voice.mic.denied', undefined, 'warning');
          showToast(STRINGS.VOICE_MIC_PERMISSION_BLOCKED);
          // Deliberately NOT `dispatch(setVoiceEnabled(false))` any more.
          //
          // That conflated two different facts: "this learner does not want to
          // speak their answers" and "this learner has not granted a permission
          // yet". One reflexive "Don't allow" removed the feature for good, and
          // the only way back was a toggle buried in Account → Practice. With
          // voice on by default and the OS dialog as the only consent moment,
          // that was the single largest leak in the funnel. The setting stays
          // on; the button becomes an actionable "Enable microphone" that opens
          // system settings, and the learner can grade by tapping meanwhile.
          publishDebug(d => ({ ...d, armError: 'permission' }));
          // Still always worth a row: it ends this card's voice attempt, and
          // the rate of it is how we know whether the ask is landing.
          void logVoiceArmFailure({
            rootId: rootId ?? null,
            expected,
            attemptIndex: armFailuresRef.current,
            reason: 'permission',
            message: outcome.message ?? null,
            stopReason: null,
            durationMs: null,
            bufferCount: null,
            tapToCapturingMs: null,
            streamRefreshed: false,
            meta: {
              settings: settingsRef.current,
              phase: 'denied',
              prompt: getPromptSnapshot(currentWordKey),
            },
          });
          setMicPermission('denied');
          setPhase('denied');
          return;
        }
        voiceBreadcrumb('voice.arm.failed', { reason: outcome.reason }, 'warning');
        publishDebug(d => ({
          ...d,
          armError: outcome.message ? `${outcome.reason}: ${outcome.message}` : outcome.reason,
        }));
        // 'busy' / 'error' / 'not-ready' are transient: the recorder from the
        // previous card may still be tearing down, or the native session
        // hiccupped. Leaving the card here is what strands the learner on a mic
        // that never opens, so re-arm after a short backoff instead.
        //
        // Deliberately NOT logged per rung. A card that has to climb the whole
        // ladder would write three rows, and a session where the microphone is
        // simply broken would write sixty — the volume would scale with exactly
        // the failure we are trying to measure. Only the terminal outcome below
        // is written: one row per card that never got a microphone, carrying
        // how many attempts it took to give up.
        if (armFailuresRef.current < MAX_ARM_RETRIES) {
          armFailuresRef.current += 1;
          const delay = ARM_RETRY_BASE_MS * armFailuresRef.current;
          diagMark('mic.arm.retry-scheduled', { attempt: armFailuresRef.current, delay });
          armedForKeyRef.current = null;
          // Still the learner's original request — finish it rather than making
          // them tap again for a native hiccup they never saw. The trigger stays
          // whatever asked first; only note that a rung ran.
          armTriggerRef.current = armTriggerRef.current ?? 'ladder';
          armRequestedRef.current = true;
          armRetryTimerRef.current = setTimeout(() => {
            armRetryTimerRef.current = null;
            setAttempt(a => a + 1);
          }, delay);
          return;
        }
        diagMark('mic.arm.gave-up', { attempts: armFailuresRef.current });
        void logVoiceArmFailure({
          rootId: rootId ?? null,
          expected,
          attemptIndex: armFailuresRef.current,
          reason: outcome.reason,
          message: outcome.message ?? null,
          stopReason: null,
          durationMs: null,
          bufferCount: null,
          tapToCapturingMs: null,
          streamRefreshed: false,
          meta: {
            settings: settingsRef.current,
            phase: 'gave-up',
            prompt: getPromptSnapshot(currentWordKey),
          },
        });
        // The ladder is out of rungs: this card never got a microphone. The
        // button goes quietly back to "Speak to answer", which is
        // indistinguishable from it never having been pressed — so the one
        // signal the learner gets that anything went wrong is this. A warning
        // rather than an error: the mic failing is not a wrong answer.
        // (The missing VISUAL for this state is a real gap, but out of scope
        // for a haptics pass.)
        //
        // Hands-free has no button to go back to, so the failure would be a
        // buzz and nothing else — a card that silently cannot be answered by
        // the only means it offers. Mark it the same way an exhausted window is
        // marked, which hands the manual control back for this one card.
        if (handsFreeWindowRef.current) {
          handsFreeExhaustedRef.current = currentWordKey;
          setHandsFreeExhausted(currentWordKey);
        }
        warningFeedback();
        setPhase('idle');
        return;
      }
      armFailuresRef.current = 0;

      countDiag({ micArms: 1 });
      setPhase('checking');
      publishDebug(d => ({
        ...d,
        armError: null,
        recorder: {
          durationMs: outcome.result.durationMs,
          bufferCount: outcome.result.bufferCount,
          stopReason: outcome.result.stopReason,
          gateUsed: outcome.result.gateUsed,
          heardSpeech: outcome.result.heardSpeech,
          peakRms: outcome.result.peakRms,
          noiseFloorDb: outcome.result.noiseFloorDb,
          speechMs: outcome.result.speechMs,
          firstBufferMs: outcome.result.firstBufferMs,
          stopDecidedAtMs: outcome.result.stopDecidedAtMs,
        },
      }));
      // A self-opened window that ran its whole budget without hearing anyone
      // is not a wrong answer — it is a card the learner never chose to speak
      // to. Grading it would put a transcript panel (or worse, a mark) on a
      // question they were still reading, so the microphone simply closes and
      // the manual control comes back for this one card. Nothing is logged as
      // an attempt, because nothing was attempted.
      //
      // `heardSpeech` is the line, and it is load-bearing: `noSpeech` means "not
      // ENOUGH speech", not "none", so a short answer the detector confirmed but
      // that fell under `minSpeechMs` stops here too. Discarding THAT would be
      // the worst outcome this feature can produce — the learner speaks, waits
      // out the whole hands-free budget, and is told nothing. If a run of voice
      // was confirmed, it gets transcribed and graded like any other answer;
      // an empty transcript then surfaces the result panel, which is the honest
      // "we didn't catch that" rather than silence.
      if (
        handsFreeWindowRef.current &&
        outcome.result.stopReason === 'noSpeech' &&
        !outcome.result.heardSpeech
      ) {
        diagMark('mic.handsFree.exhausted', {
          key: currentWordKey,
          durationMs: outcome.result.durationMs,
          gate: outcome.result.gateUsed,
        });
        voiceBreadcrumb('voice.handsFree.exhausted', {
          durationMs: outcome.result.durationMs,
          gateUsed: outcome.result.gateUsed,
        });
        handsFreeExhaustedRef.current = currentWordKey;
        setHandsFreeExhausted(currentWordKey);
        setPhase('idle');
        return;
      }

      const endTranscribe = diagSpan('stt.transcribe', {
        samples: outcome.result.waveform.length,
      });
      const { transcript, timedOut } = await transcribeWithTimeout(
        voice.transcribe(outcome.result.waveform),
      );
      endTranscribe({ chars: transcript.length, timedOut });
      if (cancelled) return;
      if (timedOut) {
        // Treat a hung recognizer exactly like hearing nothing: surface the
        // panel so the learner can self-grade or retry. Never auto-Unknown.
        diagMark('stt.timeout', { samples: outcome.result.waveform.length });
        voiceBreadcrumb('voice.transcribe.timeout', undefined, 'warning');
        publishDebug(d => ({ ...d, armError: 'transcribe-timeout' }));
      }

      void analytics.track(ANALYTICS_EVENTS.VOICE_TRANSCRIPT, {
        transcriptLength: transcript.length,
        durationMs: outcome.result.durationMs,
        heardSpeech: outcome.result.heardSpeech,
        peakRms: outcome.result.peakRms,
        bufferCount: outcome.result.bufferCount,
        stopReason: outcome.result.stopReason,
      });

      const match = matchSingleWord({
        spoken: transcript,
        expected,
        aliases: aliasesRef.current,
        alternates: glossAlternatesRef.current,
      });
      void analytics.track(ANALYTICS_EVENTS.VOICE_MATCH, {
        matched: match.matched,
        method: match.method,
        normalizedSpoken: match.normalizedSpoken,
        normalizedExpected: match.normalizedExpected,
      });
      voiceBreadcrumb('voice.match', {
        matched: match.matched,
        method: match.method,
        spoken: match.normalizedSpoken,
        expected: match.normalizedExpected,
      });
      publishDebug(d => ({
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
          // Free: this row is written anyway, one per resolved attempt. Adds no
          // volume and gives the latency distribution the HUD can only show one
          // card at a time — `tapToCapturingMs` is what the learner waits,
          // where `first_buffer_ms` starts counting only once the window opens.
          tapToCapturingMs: tapToCapturingRef.current,
          armAttempts: armFailuresRef.current,
          armTrigger: armTriggerRef.current,
          // Where the ~1.1 s between the tap and the microphone went. Only
          // ~150 ms of it is the recorder; the rest was unattributed until this.
          armStages: getArmStages(),
          streamRefreshed: false,
          // What the learner actually heard before answering. A miss on a card
          // whose prompt was cut (or never played) is not a mishearing — it is
          // a question that was never asked, and until this landed the two were
          // indistinguishable in the table.
          prompt: getPromptSnapshot(currentWordKey),
          settings: settingsRef.current,
          recordingConfig: {
            ...DEFAULT_RECORDING_CONFIG,
            energyGateEnabled: settingsRef.current.energyGateEnabled,
            gainNormalizeEnabled: settingsRef.current.gainNormalizeEnabled,
            iosRawMode: settingsRef.current.iosRawMode,
          },
          // What the energy gate actually saw. `peak_rms` is one number for a
          // whole window, and three separate gate regressions each needed a
          // fresh device session to diagnose because of it — the envelope and
          // the room measurement are what make a row self-explaining. Rounded
          // integers, ~160 of them at most.
          gate: {
            // WHICH detector decided, never inferred from the config: the VAD is
            // skipped before its model lands and handed back mid-window on a bad
            // capture rate, so a row that assumed 'vad' would be a guess.
            used: outcome.result.gateUsed,
            // Null travels as null: a dead-mic row must stay distinguishable
            // from one that measured a quiet room. See RecordingResult.
            noiseFloorDb:
              outcome.result.noiseFloorDb === null ? null : Math.round(outcome.result.noiseFloorDb),
            speechMs: outcome.result.speechMs,
            levelsDb: outcome.result.levelsDb,
          },
          // Rows written before 2026-08-17 claim `modified_beam_search` here. That
          // was never true — see the decoding note in useSherpaStt.ts. Treat the
          // field as valid only from this value onward.
          //
          // `hotwords` is the phrase count the engine that produced THIS
          // transcript was built with, which is what a bias-on / bias-off
          // comparison has to segment on.
          decoding: {
            method: voice.hotwordCount > 0 ? VOICE_HOTWORD_DECODING_METHOD : VOICE_DECODING_METHOD,
            hotwords: voice.hotwordCount,
          },
        },
      });

      if (match.matched) {
        // Correct → log the auto-pass, then proceed. Blank the indicator before
        // handing off so the "Grading…" pill doesn't linger over the advance
        // animation; the next card re-arms cleanly on mount.
        //
        // A `near` match is credited too, but as Guessed: the learner sounded
        // like the answer and the model wrote down something else, so failing
        // them would be the model's mistake charged to them. A toast names what
        // was heard, because silently passing an answer the learner knows they
        // fumbled is its own kind of wrong.
        const vague = match.credit === 'vague';
        attemptCtxRef.current = buildAttemptCtx(null);
        void logVoiceAttempt({
          ...attemptCtxRef.current,
          resolution: vague ? 'auto_vague' : 'auto_known',
        });
        setPhase('idle');
        // Neither branch fires its own haptic. The grade these hand off to
        // plays the card's verdict, which weighs the outcome (a near match is
        // lighter than a clean pass, exactly as this code used to do by hand)
        // and fires on the frame the colour lands rather than a JS hop ahead of
        // it. Keeping a tick here would buzz one answer twice.
        if (vague) {
          showToast(STRINGS.VOICE_NEAR_MATCH_TEMPLATE(match.normalizedSpoken));
          onVagueAutoRef.current();
        } else {
          onKnownAutoRef.current();
        }
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
        // Heard a real word and it was not the answer. Mark the card wrong NOW,
        // not when the learner presses a button to be told so: it used to sit
        // there unchanged until "No, I missed it", which is feedback arriving
        // after they had already worked the answer out themselves.
        //
        // The verdict carries the error haptic on its own animation frame, so
        // there is no direct call here. It is provisional — "I knew it" on the
        // panel below repaints the same card green and throws it.
        onMissHeardRef.current();
      } else {
        // Silence or a hallucinated transcript is the app failing, not a wrong
        // answer, so it must not feel like one — but it can't be silent either.
        // After speaking into a microphone, no feedback at all is ambiguous:
        // "it heard nothing" and "it's still thinking" feel identical, and the
        // learner is left waiting on a panel that has already arrived. Warning
        // says "we're back, nothing landed" without scoring it against them.
        warningFeedback();
      }
      voiceBreadcrumb('voice.match.miss', {
        similarity: match.similarity,
        spoken: match.normalizedSpoken,
        suggestion,
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
    // The hook no longer takes `promptAudioDoneKey` at all. It used to gate the
    // arm AND sit in these deps, which with a tap trigger would be actively
    // harmful: tapping during the prompt makes speakNow stop the clip, the
    // watcher then reports the prompt finished, this effect re-runs — and its
    // cleanup cancels the recording the tap had just started.
  }, [
    voiceEnabled,
    voice,
    ready,
    result,
    expected,
    currentWordKey,
    rootId,
    attempt,
    dispatch,
    showToast,
    publishDebug,
  ]);

  const accept = useCallback((): void => {
    const ctx = attemptCtxRef.current;
    if (ctx) void logVoiceAttempt({ ...ctx, resolution: 'accept' });
    // Remember the mishear so this exact quirk stops interrupting them on this
    // word. `ctx.transcript` is the raw heard text; `isAliasStorable` is what
    // decides whether it may be kept at all — see utils/voiceAliases.
    if (
      ctx?.rootId != null &&
      ctx.transcript &&
      isAliasStorable({ transcript: ctx.transcript, otherGlosses: otherGlossesRef.current })
    ) {
      dispatch(rememberAlias({ rootId: ctx.rootId, transcript: ctx.transcript }));
    }
    attemptCtxRef.current = null;
    setResult(null);
    // Blank the indicator immediately so nothing transient (the cleared result
    // panel, a stale phase) shows during the advance; the next card re-arms.
    setPhase('idle');
    onKnownAutoRef.current();
  }, [dispatch]);

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
    tapAtRef.current = Date.now();
    armTriggerRef.current = 'retry';
    markArmTap();
    // Force the arm effect to fire again for this same card and skip the
    // wait-for-audio gate so the mic reopens immediately.
    armRequestedRef.current = true;
    armedForKeyRef.current = null;
    setAttempt(a => a + 1);
  }, []);

  /**
   * "Open the mic, now." The escape hatch for every card whose automatic arm
   * did not happen — the prompt is still playing and the learner is ready, or
   * the arm ladder gave up and the card is sitting there with a dead mic.
   *
   * Mechanically this is `retry()` without an attempt to log: the gate that
   * waits for the prompt is skipped, the already-armed latch is released, and
   * the effect re-runs. It also stops the prompt, which is what makes it a
   * skip as well as a takeover — the watcher sees the track disappear and
   * settles at zero grace instead of waiting out the clip.
   */
  const speakNow = useCallback((): void => {
    // A mic that is already open (or grading) is not something to take over —
    // re-arming here would throw away audio the learner has already spoken.
    if (
      phaseRef.current === 'arming' ||
      phaseRef.current === 'listening' ||
      phaseRef.current === 'checking'
    )
      return;
    if (!voice.isReady) return;
    // Claim the tap before React commits: another press must not cancel and
    // restart the native open already requested by this one.
    const previousPhase = phaseRef.current;
    phaseRef.current = 'arming';
    // The permission ask lives here rather than at session start: this tap is
    // the learner asking for the microphone, which is the context the OS dialog
    // otherwise lacks. Latched once per provider lifetime, so only the first tap
    // of the first session ever pays it. Fire-and-forget — arming below already
    // handles a refusal, and blocking the tap on the dialog would cost the
    // learner the beat they just decided to spend speaking.
    void prewarmPermission();
    setSessionRequested(true);
    diagMark('mic.speakNow', { phase: previousPhase });
    // The tap is now the only way to arm, so this stop runs on every card —
    // and on any card where the learner is quick, it is what truncates the
    // Arabic. Recorded before the stop, while there is still a prompt to
    // describe; the attempt row that follows carries how much was heard.
    recordPromptCut('speak-now');
    // The assignment `tapToCapturingMs` always needed: the ref was cleared per
    // card and read in onCapturing, but never set, so the column has been null
    // on every row ever written.
    tapAtRef.current = Date.now();
    armTriggerRef.current = 'tap';
    markArmTap();
    stopAudioRef.current();
    setResult(null);
    setPhase('arming');
    armRequestedRef.current = true;
    armedForKeyRef.current = null;
    setAttempt(a => a + 1);
  }, [voice.isReady, prewarmPermission]);

  /**
   * Hold released. Only meaningful once the mic is genuinely capturing —
   * before that there is no waveform to grade, so the release is ignored and
   * the recording the hold started runs on under the energy gate.
   */
  const stopSpeaking = useCallback((): void => {
    if (phaseRef.current !== 'listening') return;
    voice.stopListening();
  }, [voice]);

  return {
    micDenied: micPermission === 'denied',
    phase,
    debug,
    result,
    accept,
    reject,
    retry,
    speakNow,
    stopSpeaking,
    // `handsFreeExhausted` is compared against the LIVE key rather than cleared
    // on advance: the marker is a fact about one card, and a card that is no
    // longer showing cannot be the one holding the button open.
    handsFreeActive:
      handsFree && voiceEnabled && micGranted && handsFreeExhausted !== currentWordKey,
  };
}
