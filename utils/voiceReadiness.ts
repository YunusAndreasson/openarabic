/**
 * One answer to "can the learner speak right now, and if not, why?".
 *
 * Three screens used to compute this independently — the Practice settings row,
 * the Advanced models row, and the review screen — and they disagreed. The
 * settings row in particular reported "Answer out loud instead of tapping"
 * whenever the toggle was off, which becomes a lie the moment a prefetch is
 * running underneath it.
 *
 * Pure and React-free on purpose: this is where the copy decisions live, so they
 * can be table-tested rather than re-derived in three `useMemo`s.
 */
import type { VoiceModelErrorKind, VoiceModelSnapshot } from '@/services/voiceModelStore';

export type VoiceReadiness =
  /** Usable now. */
  | { kind: 'ready' }
  /**
   * Bytes are on disk; the recognizer just is not loaded into RAM.
   *
   * A real and ordinary state, because the engine is only built while something
   * retains it — the Practice tab or an open review session. Anywhere else, a
   * fully downloaded model sits here. It needs its own kind: reporting it as
   * `preparing` made the Settings screen say "Downloading 100%" about a model
   * that had finished downloading long ago, and reporting it as `ready` would
   * let the review screen offer a microphone with nothing behind it.
   */
  | { kind: 'model-ready' }
  /** Bytes or engine still coming. `progress` is 0..1 across the whole journey. */
  | { kind: 'preparing'; progress: number }
  /**
   * Wanted, but no fetch has started yet.
   *
   * Distinct from `preparing` because quoting a percentage for work that has not
   * begun is a lie: after a manual delete this rendered as "Downloading 0%" for
   * a model nothing was downloading. Surfaces that can afford a neutral label
   * should use one; the review screen, where a prefetch is imminent, can treat
   * it as preparing-without-a-number.
   */
  | { kind: 'pending' }
  /** Wanted, but waiting for an unmetered connection. Offer the cellular opt-in. */
  | { kind: 'waiting-wifi' }
  /** The OS refused the microphone — actionable, but only in system settings. */
  | { kind: 'mic-denied' }
  | { kind: 'failed'; reason: VoiceModelErrorKind }
  /** The learner turned it off. Nothing to explain. */
  | { kind: 'off' };

/** The sliver of progress reserved for building and warming the engine. */
const ENGINE_BAND_START = 0.99;

export function voiceReadiness(input: {
  voiceEnabled: boolean;
  micDenied: boolean;
  model: VoiceModelSnapshot;
  /** `error` is the recognizer build failure, as the provider reports it. */
  engine: { isReady: boolean; isWarming: boolean; error: string | null };
}): VoiceReadiness {
  const { voiceEnabled, micDenied, model, engine } = input;

  if (!voiceEnabled) return { kind: 'off' };

  // A refused microphone outranks every model state: no amount of downloading
  // makes it work, and telling someone to wait when they need to change a
  // setting is the worst of the available answers.
  if (micDenied) return { kind: 'mic-denied' };
  if (engine.isReady) return { kind: 'ready' };

  if (engine.error) return { kind: 'failed', reason: 'unknown' };

  switch (model.state) {
    case 'ready':
      // Bytes present. If the engine is actually building, report the last
      // sliver rather than jumping to 100% — "100%" should mean usable.
      // Otherwise nothing has asked for a recognizer yet, which is not progress
      // of any kind.
      return engine.isWarming
        ? { kind: 'preparing', progress: ENGINE_BAND_START }
        : { kind: 'model-ready' };
    case 'downloading':
    case 'extracting':
      return { kind: 'preparing', progress: model.progress };
    case 'waiting-wifi':
      return { kind: 'waiting-wifi' };
    case 'failed':
      return { kind: 'failed', reason: model.errorKind ?? 'unknown' };
    case 'unknown':
    case 'absent':
    default:
      return { kind: 'pending' };
  }
}
