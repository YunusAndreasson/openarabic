/**
 * Serializes the microphone's open/close transitions.
 *
 * Two overlapping transitions build a recorder against an audio session the
 * other half is still tearing down — the dead-microphone failure this codebase
 * has chased more than once. Guarding it needs one rule, and the rule is not
 * "one at a time": the two kinds of transition want different things from a
 * transition that is already running.
 *
 * - `open` just wants a live stream. Anything in flight ends with one, so it
 *   JOINS and re-checks rather than starting a rival attempt.
 * - `reopen` is asked for precisely because the stream is BROKEN (an
 *   interruption, a route change, a stream error), so it cannot be satisfied by
 *   a plain `open` that is already running — it has to tear the session down and
 *   rebuild. It therefore QUEUES AFTER that open instead of interleaving with it.
 * - `reopen` behind another `reopen` joins: after a phone call several signals
 *   fire within a moment of each other, and one rebuild answers all of them.
 *
 * Lives here, apart from the provider, because it is pure promise bookkeeping
 * and the provider is not reachable from a test without a native audio stack.
 */
export type CaptureOpenKind = 'open' | 'reopen';

interface InFlight {
  readonly kind: CaptureOpenKind;
  readonly promise: Promise<void>;
}

export class CaptureOpenQueue {
  private inFlight: InFlight | null = null;

  /**
   * Run (or attach to) a capture transition.
   *
   * `work` is a thunk, not a promise, so a queued `reopen` does not begin its
   * teardown until the transition ahead of it has finished.
   */
  run(kind: CaptureOpenKind, work: () => Promise<void>): Promise<void> {
    const active = this.inFlight;

    // Join: an `open` is satisfied by whatever is running, and a `reopen` is
    // satisfied by another `reopen`.
    if (active && (kind === 'open' || active.kind === 'reopen')) {
      return active.promise;
    }

    const promise = (async () => {
      // Guarded rather than `await active?.promise` — awaiting `undefined` still
      // suspends for a microtask, which would delay the FIRST transition (the
      // common case) past the synchronous window its callers run in.
      if (active) {
        // A rejection upstream is not this transition's problem — it only has to
        // not overlap with it.
        await active.promise.catch(() => undefined);
      }
      await work();
    })();

    const entry: InFlight = { kind, promise };
    this.inFlight = entry;

    const settle = (): void => {
      // Identity-checked: a later transition may already own the slot.
      if (this.inFlight === entry) this.inFlight = null;
    };
    void promise.then(settle, settle);

    return promise;
  }

  /** Whether a transition is currently running or queued. */
  get isBusy(): boolean {
    return this.inFlight !== null;
  }
}
