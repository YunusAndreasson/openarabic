/**
 * Always-on record of what the Arabic prompt actually did on the current card.
 *
 * The review pipeline already has a rich timeline in `utils/reviewDiagnostics`,
 * but that one is gated behind __DEV__ / the Voice debug HUD, so a TestFlight
 * session produces nothing. Two bugs hid in exactly that gap and cost a full
 * investigation each:
 *
 *   1. `playAudio` resolving `started: false` — the player was created and the
 *      file downloaded fine, but `waitForPlayerReady` timed out, so the card
 *      sat in silence and the mic opened on a word the learner never heard.
 *      Nothing threw, so Sentry was empty too.
 *   2. `speakNow()` stopping the clip on its way in. Since the tap became the
 *      only way to arm, every early tap truncates the prompt — by design, but
 *      indistinguishable from (1) in a bug report, and invisible everywhere.
 *
 * Neither is an error, so neither reaches Sentry; neither touches the mic, so
 * neither reaches the `arm_failed` rows. This module closes that hole: it is a
 * plain module-level singleton (one card in flight at a time, same as the
 * pipeline it watches), it never logs or allocates on the hot path, and it is
 * NOT gated on the diagnostics flag — its whole reason to exist is being on in
 * a build the learner is actually using.
 *
 * Reads are key-checked. A snapshot only comes back for the card that asked for
 * it, so a row can never carry the previous card's prompt by accident.
 */
import type { PromptFinishReason } from '@/hooks/review/promptFinishWatcher';

/** Why the prompt effect was still sitting on its hands. */
export type PromptGateReason =
  /** The audio preloader had not finished the first card's file yet. */
  | 'preload'
  /** The answer was already showing, so the prompt is suppressed by design. */
  | 'revealed';

/** What took the prompt down early, when something did. */
export type PromptCutSource =
  /** The learner tapped "Speak to answer" — `speakNow()` stops the clip. */
  | 'speak-now'
  /** "Show answer" / a voice miss revealed the meaning. */
  | 'reveal'
  /** The learner replayed the word, superseding the prompt with itself. */
  | 'replay'
  /** The card advanced (graded, swiped, session ended). */
  | 'advance';

/** The prompt's story for one card, flattened for a jsonb column. */
export interface PromptSnapshot {
  /**
   * ms between the card becoming current and the prompt actually being
   * requested — the window the effect spent behind its gates.
   *
   * This is where a "I waited 2-3 seconds for the Arabic" goes when `playMs` is
   * 50 ms: the prompt effect is gated on the audio preloader, so the card is on
   * screen and silent while `playAudio` has not been called yet. Measuring only
   * from the play call made that wait invisible.
   */
  gateMs: number | null;
  /** What the effect was waiting on, when it waited. */
  gateReason: PromptGateReason | null;
  /**
   * ms from the card becoming current to the word being audible — gate plus
   * load plus player start. The only number here that matches what the learner
   * experiences; every other timing measures one link of the chain.
   */
  toAudibleMs: number | null;
  /** Did `play()` ever get the source playing? `false` is the silent card. */
  started: boolean | null;
  /** ms `playAudio` took to resolve — a ~5s/~20s value with `started:false`
   *  is the `waitForPlayerReady` deadline, i.e. bug (1) above. */
  playMs: number | null;
  /** The file was not resolvable from the preload map and had to be fetched. */
  cacheMissed: boolean | null;
  /** The cache self-heal (invalidate → re-download → retry) ran for this card. */
  healed: boolean | null;
  /** How the finish watcher settled, when it got to settle. */
  finishReason: PromptFinishReason | null;
  /** ms between play resolving and the prompt being declared done. */
  audibleMs: number | null;
  /** Clip length the player reported, so `audibleMs` has something to mean. */
  durationMs: number | null;
  /** What cut the clip short, if anything did. */
  cutBy: PromptCutSource | null;
  /** ms into the prompt at which it was cut. */
  cutAtMs: number | null;
  /** The headline: did the learner hear the whole word? Derived, so a query
   *  never has to know which finish reasons count as complete. */
  heardInFull: boolean | null;
  /** Distinct play-head readings the finish watcher saw. A low count means the
   *  `reachedEnd` deadline was extrapolating rather than tracking. */
  positionSamples: number | null;
  /** Did the player's own finish event arrive after the estimate had already
   *  settled? Distinguishes "iOS never emits it" from "it lost the race". */
  lateFinishEventSeen: boolean | null;
  /** ms by which it lost that race. */
  lateFinishEventMs: number | null;
}

const EMPTY: PromptSnapshot = {
  gateMs: null,
  gateReason: null,
  toAudibleMs: null,
  started: null,
  playMs: null,
  cacheMissed: null,
  healed: null,
  finishReason: null,
  audibleMs: null,
  durationMs: null,
  cutBy: null,
  cutAtMs: null,
  heardInFull: null,
  positionSamples: null,
  lateFinishEventSeen: null,
  lateFinishEventMs: null,
};

/** Finish reasons that mean the clip was allowed to run out. Anything else —
 *  `stopped`, `cancelled`, `superseded`, `maxWait` — ended it early. */
const COMPLETE_REASONS: ReadonlySet<PromptFinishReason> = new Set<PromptFinishReason>([
  'didJustFinish',
  'reachedEnd',
]);

let currentKey: string | null = null;
/** When the card became current — BEFORE any gate. The origin for `gateMs`
 *  and `toAudibleMs`, and the whole reason those two exist. */
let cardCurrentAt = 0;
/** When the prompt was actually requested, i.e. past the gates. */
let startedAt = 0;
let snapshot: PromptSnapshot = { ...EMPTY };

/**
 * This card is now the one on screen. The reset point, and it must be called
 * unconditionally — ahead of every gate the prompt effect applies — or the
 * waiting it is here to measure is exactly what gets skipped.
 */
export function markCardCurrent(key: string): void {
  currentKey = key;
  cardCurrentAt = Date.now();
  startedAt = cardCurrentAt;
  snapshot = { ...EMPTY };
}

/** The prompt effect looked and decided it could not run yet. */
export function recordPromptGate(key: string, reason: PromptGateReason): void {
  if (key !== currentKey) return;
  snapshot = { ...snapshot, gateReason: reason };
}

/**
 * Past the gates: the prompt is being requested now. Does NOT reset — the
 * waiting recorded before this point is the interesting part.
 */
export function beginPrompt(key: string): void {
  if (key !== currentKey) {
    // The card was never announced (a path that skips markCardCurrent). Better
    // to measure from here than to drop the card entirely.
    markCardCurrent(key);
    return;
  }
  startedAt = Date.now();
  snapshot = { ...snapshot, gateMs: startedAt - cardCurrentAt };
}

/** The card has no prompt audio at all — recorded so a missing `audio_url` is
 *  distinguishable from a prompt that failed to play. */
export function recordPromptAbsent(key: string): void {
  if (key !== currentKey) return;
  snapshot = { ...snapshot, started: false, playMs: 0, heardInFull: false };
}

/** `playAudio` resolved. `started:false` here IS the silent-card bug. */
export function recordPromptPlay(
  key: string,
  outcome: { started: boolean; playMs: number; cacheMissed: boolean; healed: boolean },
): void {
  if (key !== currentKey) return;
  snapshot = {
    ...snapshot,
    started: outcome.started,
    playMs: outcome.playMs,
    cacheMissed: outcome.cacheMissed,
    healed: outcome.healed,
    // Measured from the card, not from the play call, so it includes the gate.
    toAudibleMs: outcome.started ? Date.now() - cardCurrentAt : null,
    // A prompt that never started was never heard — settle it now rather than
    // waiting for a finish watcher that is never created on this path.
    ...(outcome.started ? {} : { heardInFull: false }),
  };
}

/** The post-settle audit: did the player's own finish event ever turn up? */
export function recordPromptFinishAudit(
  key: string,
  audit: { lateEventSeen: boolean; lateEventMs: number | null },
): void {
  if (key !== currentKey) return;
  snapshot = {
    ...snapshot,
    lateFinishEventSeen: audit.lateEventSeen,
    lateFinishEventMs: audit.lateEventMs,
  };
}

/** The finish watcher settled. */
export function recordPromptFinish(
  key: string,
  outcome: {
    reason: PromptFinishReason;
    audibleMs: number;
    durationMs: number;
    positionSamples?: number;
  },
): void {
  if (key !== currentKey) return;
  snapshot = {
    ...snapshot,
    finishReason: outcome.reason,
    audibleMs: outcome.audibleMs,
    durationMs: outcome.durationMs > 0 ? outcome.durationMs : null,
    positionSamples: outcome.positionSamples ?? null,
    // `cutBy` is set by whoever did the cutting, which happens before the
    // watcher notices — so a recorded cut always wins over the reason alone.
    heardInFull: snapshot.cutBy === null && COMPLETE_REASONS.has(outcome.reason),
  };
}

/**
 * Something is about to stop the prompt. Called by the actor doing the
 * stopping, because only it knows why — the watcher downstream sees an
 * indistinguishable teardown either way.
 *
 * Unkeyed: the callers (`speakNow`, reveal, replay) act on whatever card is on
 * screen and do not carry its key. First cut wins — a reveal that follows a tap
 * is the tap's consequence, not a second cut.
 */
export function recordPromptCut(source: PromptCutSource): void {
  if (currentKey === null || snapshot.cutBy !== null) return;
  // Nothing to cut: the prompt already finished, or never started.
  if (snapshot.started !== true || snapshot.finishReason !== null) return;
  snapshot = {
    ...snapshot,
    cutBy: source,
    cutAtMs: Date.now() - startedAt,
    heardInFull: false,
  };
}

/**
 * The prompt story for `key`, or null if that card is not the one in flight.
 * Callers spread this into a telemetry row's `meta`.
 */
export function getPromptSnapshot(key: string | null): PromptSnapshot | null {
  if (key === null || key !== currentKey) return null;
  return snapshot;
}

/** Session teardown. Stops a finished session's card leaking into the next. */
export function resetPromptTelemetry(): void {
  currentKey = null;
  cardCurrentAt = 0;
  startedAt = 0;
  snapshot = { ...EMPTY };
}
