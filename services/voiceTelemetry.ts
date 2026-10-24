/**
 * Best-effort telemetry for the Practice voice-grading flow. Writes one row per
 * RESOLVED attempt to `voice_grading_attempts` so we can build the self-learning
 * accept-list, tune matchSingleWord on real data, find mishear-prone words, and
 * diagnose capture quality.
 *
 * Fire-and-forget: failures are swallowed (Sentry breadcrumb only) so logging
 * can never affect the review session. Requires an authenticated user (RLS).
 */
import * as Application from 'expo-application';
import { Platform } from 'react-native';

import {
  PARAKEET_MODEL_ID,
  VOICE_DECODING_METHOD,
  VOICE_HOTWORD_DECODING_METHOD,
} from '@/constants/voiceModel';
import {
  DEFAULT_RECORDING_CONFIG,
  type RecordingResult,
  type RecordingStopReason,
  type VoiceArmFailureReason,
} from '@/lib/voice/recording';
import type { RootId } from '@/types/branded.types';
import { supabase } from '@/services/supabase';
import type { Json } from '@/types/database.types';
import type { ArmStages } from '@/utils/armTelemetry';
import { voiceBreadcrumb } from '@/utils/errorHandling';
import type { PromptSnapshot } from '@/utils/promptTelemetry';
import { toError } from '@/utils/toError';
import type { MatchMethod, SingleWordMatchResult, VoiceSuggestion } from '@/utils/voiceMatching';

/**
 * `arm_failed` rows describe an attempt that never produced audio, so most of
 * the transcription columns are null on them. They exist because the failures
 * we most needed to see were the only ones NOT being written: a window that
 * comes back with zero buffers returns before any match is computed, so the
 * table only ever held the attempts that worked.
 *
 * `prompt_silent` rows are the step before that: a card whose Arabic prompt
 * never played at all. It is not an error — `play()` returns `false` and the
 * pipeline deliberately carries on so the mic is not stranded — so it reaches
 * neither Sentry nor `arm_failed`, and the learner is asked to say a word they
 * were never read. One row per silent card, written whether or not voice
 * grading is on, since the prompt plays either way.
 */
export type VoiceResolution =
  | 'auto_known'
  /** Credited by the phonetic near-miss path as Guessed — the utterance sounded
   *  like the answer but didn't transcribe as it. Separate from `auto_known` so
   *  the precision of that path stays measurable against the same table. */
  | 'auto_vague'
  | 'accept'
  | 'reject'
  | 'retry'
  | 'arm_failed'
  | 'prompt_silent';

/** One resolved voice attempt, in app-domain shape (mapped to columns below). */
export interface VoiceAttemptLog {
  rootId: RootId | null;
  expected: string | null;
  transcript: string | null;
  normalizedSpoken: string | null;
  matched: boolean;
  matchMethod: MatchMethod | null;
  similarity: number | null;
  suggestion: VoiceSuggestion;
  resolution: VoiceResolution;
  attemptIndex: number;
  durationMs: number | null;
  stopReason: RecordingStopReason | null;
  heardSpeech: boolean | null;
  peakRms: number | null;
  bufferCount: number | null;
  firstBufferMs: number | null;
  stopDecidedAtMs: number | null;
  modelId: string | null;
  /** Dev-settings + effective recording/decoding config snapshot. */
  meta: Record<string, unknown>;
}

/** An arm that never delivered audio. Everything specific goes in `meta`, so
 *  this needs no schema change — the table has no CHECK on `resolution` and
 *  `meta` is free-form jsonb. */
export interface VoiceArmFailureLog {
  rootId: RootId | null;
  expected: string | null;
  /** Which arm attempt on this card (0 = the learner's tap, 1+ = the ladder). */
  attemptIndex: number;
  reason: VoiceArmFailureReason;
  message: string | null;
  /** From the dead window, when there was one: 'watchdog' means the
   *  first-buffer deadline fired with nothing at all. No caller has one today:
   *  every arm failure is decided before a window opens. Defaults to null. */
  stopReason?: RecordingStopReason | null;
  /** Defaults to null, for the same reason as `stopReason`. */
  durationMs?: number | null;
  /** Defaults to null, for the same reason as `stopReason`. */
  bufferCount?: number | null;
  /** Tap → mic actually capturing, in ms. The number the learner feels, as
   *  opposed to `first_buffer_ms`, which starts at the window instead. A failed
   *  arm never captured, so this defaults to null. */
  tapToCapturingMs?: number | null;
  /** True if the stream had been force-reopened since the prompt ended.
   *  Nothing tracks that yet; defaults to false. */
  streamRefreshed?: boolean;
  meta: Record<string, unknown>;
}

/** A card whose Arabic prompt produced no audio. Same trick as the arm failure
 *  above: everything specific rides in `meta`, so no schema change. */
export interface PromptSilentLog {
  rootId: RootId | null;
  expected: string | null;
  /** ms `playAudio` took to give up. The review lane caps the player's ready
   *  wait at `REVIEW_PLAY_OPTIONS.readyTimeoutMs`, so that deadline shows up
   *  here as roughly one (or, with the cache self-heal, two) of those. */
  playMs: number | null;
  /** Voice grading was on for this card. A silent prompt is worse when it is,
   *  because the mic then opens on a word that was never read. */
  voiceEnabled: boolean;
  meta: Record<string, unknown>;
}

/** The columns of a row that never reached the recogniser: nothing was heard,
 *  so nothing was transcribed, matched or timed. */
const NOTHING_HEARD = {
  transcript: null,
  normalizedSpoken: null,
  matched: false,
  matchMethod: null,
  similarity: null,
  suggestion: null,
  heardSpeech: null,
  peakRms: null,
  firstBufferMs: null,
  stopDecidedAtMs: null,
  modelId: null,
} satisfies Partial<VoiceAttemptLog>;

export async function logPromptSilent(log: PromptSilentLog): Promise<void> {
  await logVoiceAttempt({
    ...NOTHING_HEARD,
    rootId: log.rootId,
    expected: log.expected,
    resolution: 'prompt_silent',
    // No arm happened, and no attempt was consumed — this row describes the
    // card, not a try at answering it.
    attemptIndex: 0,
    durationMs: log.playMs,
    stopReason: null,
    bufferCount: null,
    meta: { ...log.meta, voiceEnabled: log.voiceEnabled },
  });
}

export async function logVoiceArmFailure(log: VoiceArmFailureLog): Promise<void> {
  await logVoiceAttempt({
    ...NOTHING_HEARD,
    rootId: log.rootId,
    expected: log.expected,
    resolution: 'arm_failed',
    attemptIndex: log.attemptIndex,
    durationMs: log.durationMs ?? null,
    stopReason: log.stopReason ?? null,
    bufferCount: log.bufferCount ?? null,
    meta: {
      ...log.meta,
      armReason: log.reason,
      armMessage: log.message,
      tapToCapturingMs: log.tapToCapturingMs ?? null,
      streamRefreshed: log.streamRefreshed ?? false,
    },
  });
}

/** What asked for a microphone window: the learner's tap, hands-free arming
 *  after the prompt, the result panel's retry, or the transient-failure ladder
 *  finishing a request nobody had to repeat. */
export type VoiceArmTrigger = 'tap' | 'auto' | 'retry' | 'ladder';

/** Everything one graded voice attempt's row is built from. */
export interface VoiceAttemptInput {
  rootId: RootId | null;
  /** Raw recognizer output, before normalization. */
  transcript: string;
  match: SingleWordMatchResult;
  suggestion: VoiceSuggestion;
  /** The arm request this attempt came out of (the hook's `attempt` counter). */
  attemptIndex: number;
  recording: RecordingResult;
  /** Tap → mic capturing, ms; null when no tap time was recorded. */
  tapToCapturingMs: number | null;
  /** Transient arm failures this card climbed before the window opened. */
  armAttempts: number;
  /** What asked for the window; null is an arm nobody asked for. */
  armTrigger: VoiceArmTrigger | null;
  /** An earlier miss on this card already showed and played the answer. */
  answerDisclosed: boolean;
  armStages: ArmStages;
  prompt: PromptSnapshot | null;
  /** The Advanced recording toggles as they stood for this attempt. */
  settings: {
    energyGateEnabled: boolean;
    gainNormalizeEnabled: boolean;
    iosRawMode: boolean;
    debugEnabled: boolean;
  };
  /** Phrases the engine that produced this transcript was biased toward. */
  hotwordCount: number;
}

/**
 * The row for one graded attempt, minus its resolution — the auto-pass path
 * logs it straight away, and a miss holds it until the learner's verdict on
 * the result panel says how it resolved.
 */
export function buildVoiceAttemptLog(
  input: VoiceAttemptInput,
): Omit<VoiceAttemptLog, 'resolution'> {
  const { match, recording, settings } = input;
  return {
    rootId: input.rootId,
    expected: match.normalizedExpected,
    transcript: input.transcript,
    normalizedSpoken: match.normalizedSpoken,
    matched: match.matched,
    matchMethod: match.method,
    similarity: match.similarity,
    suggestion: input.suggestion,
    attemptIndex: input.attemptIndex,
    durationMs: recording.durationMs,
    stopReason: recording.stopReason,
    heardSpeech: recording.heardSpeech,
    peakRms: recording.peakRms,
    bufferCount: recording.bufferCount,
    firstBufferMs: recording.firstBufferMs,
    stopDecidedAtMs: recording.stopDecidedAtMs,
    modelId: PARAKEET_MODEL_ID,
    meta: {
      // Free: this row is written anyway, one per resolved attempt. Adds no
      // volume and gives the latency distribution the HUD can only show one
      // card at a time — `tapToCapturingMs` is what the learner waits,
      // where `first_buffer_ms` starts counting only once the window opens.
      tapToCapturingMs: input.tapToCapturingMs,
      armAttempts: input.armAttempts,
      armTrigger: input.armTrigger,
      // A retry after the answer was shown: its match is capped at vague.
      answerDisclosed: input.answerDisclosed,
      // Where the ~1.1 s between the tap and the microphone went. Only
      // ~150 ms of it is the recorder; the rest was unattributed until this.
      armStages: input.armStages,
      streamRefreshed: false,
      // What the learner actually heard before answering. A miss on a card
      // whose prompt was cut (or never played) is not a mishearing — it is
      // a question that was never asked, and until this landed the two were
      // indistinguishable in the table.
      prompt: input.prompt,
      settings,
      recordingConfig: {
        ...DEFAULT_RECORDING_CONFIG,
        energyGateEnabled: settings.energyGateEnabled,
        gainNormalizeEnabled: settings.gainNormalizeEnabled,
        iosRawMode: settings.iosRawMode,
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
        used: recording.gateUsed,
        // Null travels as null: a dead-mic row must stay distinguishable
        // from one that measured a quiet room. See RecordingResult.
        noiseFloorDb: recording.noiseFloorDb === null ? null : Math.round(recording.noiseFloorDb),
        speechMs: recording.speechMs,
        levelsDb: recording.levelsDb,
      },
      // Rows written before 2026-08-17 claim `modified_beam_search` here. That
      // was never true — see the decoding note in useSherpaStt.ts. Treat the
      // field as valid only from this value onward.
      //
      // `hotwords` is the phrase count the engine that produced THIS
      // transcript was built with, which is what a bias-on / bias-off
      // comparison has to segment on.
      decoding: {
        method: input.hotwordCount > 0 ? VOICE_HOTWORD_DECODING_METHOD : VOICE_DECODING_METHOD,
        hotwords: input.hotwordCount,
      },
    },
  };
}

export async function logVoiceAttempt(log: VoiceAttemptLog): Promise<void> {
  try {
    // Cached session read (no network); RLS needs the authenticated user id.
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;

    const { error } = await supabase.from('voice_grading_attempts').insert({
      user_id: userId,
      root_id: log.rootId,
      expected: log.expected,
      transcript: log.transcript,
      normalized_spoken: log.normalizedSpoken,
      matched: log.matched,
      match_method: log.matchMethod,
      similarity: log.similarity,
      suggestion: log.suggestion,
      resolution: log.resolution,
      attempt_index: log.attemptIndex,
      duration_ms: log.durationMs,
      stop_reason: log.stopReason,
      heard_speech: log.heardSpeech,
      peak_rms: log.peakRms,
      buffer_count: log.bufferCount,
      first_buffer_ms: log.firstBufferMs,
      stop_decided_at_ms: log.stopDecidedAtMs,
      model_id: log.modelId,
      platform: Platform.OS,
      app_version: Application.nativeApplicationVersion,
      meta: log.meta as Json,
    });

    if (error) {
      voiceBreadcrumb('voice.telemetry.insert.failed', { message: error.message }, 'warning');
    }
  } catch (err) {
    voiceBreadcrumb('voice.telemetry.error', { message: toError(err).message }, 'warning');
  }
}
