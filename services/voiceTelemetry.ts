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

import type { RecordingStopReason, VoiceArmFailureReason } from '@/lib/voice/recording';
import type { RootId } from '@/types/branded.types';
import { supabase } from '@/services/supabase';
import type { Json } from '@/types/database.types';
import { voiceBreadcrumb } from '@/utils/errorHandling';
import type { MatchMethod, VoiceSuggestion } from '@/utils/voiceMatching';

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
   *  first-buffer deadline fired with nothing at all. */
  stopReason: RecordingStopReason | null;
  durationMs: number | null;
  bufferCount: number | null;
  /** Tap → mic actually capturing, in ms. The number the learner feels, as
   *  opposed to `first_buffer_ms`, which starts at the window instead. */
  tapToCapturingMs: number | null;
  /** True if the stream had been force-reopened since the prompt ended. */
  streamRefreshed: boolean;
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

export async function logPromptSilent(log: PromptSilentLog): Promise<void> {
  await logVoiceAttempt({
    rootId: log.rootId,
    expected: log.expected,
    transcript: null,
    normalizedSpoken: null,
    matched: false,
    matchMethod: null,
    similarity: null,
    suggestion: null,
    resolution: 'prompt_silent',
    // No arm happened, and no attempt was consumed — this row describes the
    // card, not a try at answering it.
    attemptIndex: 0,
    durationMs: log.playMs,
    stopReason: null,
    heardSpeech: null,
    peakRms: null,
    bufferCount: null,
    firstBufferMs: null,
    stopDecidedAtMs: null,
    modelId: null,
    meta: { ...log.meta, voiceEnabled: log.voiceEnabled },
  });
}

export async function logVoiceArmFailure(log: VoiceArmFailureLog): Promise<void> {
  await logVoiceAttempt({
    rootId: log.rootId,
    expected: log.expected,
    transcript: null,
    normalizedSpoken: null,
    matched: false,
    matchMethod: null,
    similarity: null,
    suggestion: null,
    resolution: 'arm_failed',
    attemptIndex: log.attemptIndex,
    durationMs: log.durationMs,
    stopReason: log.stopReason,
    heardSpeech: null,
    peakRms: null,
    bufferCount: log.bufferCount,
    firstBufferMs: null,
    stopDecidedAtMs: null,
    modelId: null,
    meta: {
      ...log.meta,
      armReason: log.reason,
      armMessage: log.message,
      tapToCapturingMs: log.tapToCapturingMs,
      streamRefreshed: log.streamRefreshed,
    },
  });
}

export async function logVoiceAttempt(log: VoiceAttemptLog): Promise<void> {
  try {
    // Cached session read (no network); RLS needs the authenticated user id.
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
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
    voiceBreadcrumb(
      'voice.telemetry.error',
      { message: err instanceof Error ? err.message : String(err) },
      'warning',
    );
  }
}
