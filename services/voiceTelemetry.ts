/**
 * Best-effort telemetry for the Practice voice-grading flow. Writes one row per
 * RESOLVED attempt to `voice_grading_attempts` so we can build the self-learning
 * accept-list, tune matchSingleWord on real data, find mishear-prone words, and
 * diagnose capture quality.
 *
 * Fire-and-forget: failures are swallowed (Sentry breadcrumb only) so logging
 * can never affect the review session. Requires an authenticated user (RLS).
 */
import * as Sentry from '@sentry/react-native';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

import { supabase } from '@/services/supabase';
import type { Json } from '@/types/database.types';

/**
 * `arm_failed` rows describe an attempt that never produced audio, so most of
 * the transcription columns are null on them. They exist because the failures
 * we most needed to see were the only ones NOT being written: a window that
 * comes back with zero buffers returns before any match is computed, so the
 * table only ever held the attempts that worked.
 */
export type VoiceResolution = 'auto_known' | 'accept' | 'reject' | 'retry' | 'arm_failed';

/** One resolved voice attempt, in app-domain shape (mapped to columns below). */
export interface VoiceAttemptLog {
  rootId: number | null;
  expected: string | null;
  transcript: string | null;
  normalizedSpoken: string | null;
  matched: boolean;
  matchMethod: string | null;
  similarity: number | null;
  suggestion: 'unknown' | 'retry' | null;
  resolution: VoiceResolution;
  attemptIndex: number;
  durationMs: number | null;
  stopReason: string | null;
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
  rootId: number | null;
  expected: string | null;
  /** Which arm attempt on this card (0 = the learner's tap, 1+ = the ladder). */
  attemptIndex: number;
  /** 'permission' | 'busy' | 'not-ready' | 'error'. */
  reason: string;
  message: string | null;
  /** From the dead window, when there was one: 'watchdog' means the
   *  first-buffer deadline fired with nothing at all. */
  stopReason: string | null;
  durationMs: number | null;
  bufferCount: number | null;
  /** Tap → mic actually capturing, in ms. The number the learner feels, as
   *  opposed to `first_buffer_ms`, which starts at the window instead. */
  tapToCapturingMs: number | null;
  /** True if the stream had been force-reopened since the prompt ended. */
  streamRefreshed: boolean;
  meta: Record<string, unknown>;
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
      Sentry.addBreadcrumb({
        category: 'voice',
        level: 'warning',
        message: 'voice.telemetry.insert.failed',
        data: { message: error.message },
      });
    }
  } catch (err) {
    Sentry.addBreadcrumb({
      category: 'voice',
      level: 'warning',
      message: 'voice.telemetry.error',
      data: { message: err instanceof Error ? err.message : String(err) },
    });
  }
}
