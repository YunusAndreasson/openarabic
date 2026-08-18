/**
 * Tests for the always-on record of what the Arabic prompt did on a card.
 *
 * Two field bugs motivated this module, and both were invisible for the same
 * reason: neither throws, so Sentry never saw them, and neither touches the
 * mic, so the `arm_failed` rows never saw them either. A learner reporting "the
 * Arabic isn't always read" could mean the player timed out (silence) or that
 * their own tap on "Tap to answer" cut the clip — opposite causes, identical
 * from the outside. What these tests pin down is that the two stay
 * distinguishable, and that one card's prompt can never be reported as
 * another's.
 */
import {
  beginPrompt,
  markCardCurrent,
  getPromptSnapshot,
  recordPromptAbsent,
  recordPromptCut,
  recordPromptFinish,
  recordPromptPlay,
  resetPromptTelemetry,
} from '@/utils/promptTelemetry';

const CARD = 'root-7086-rep-6';
const OTHER_CARD = 'root-7053-rep-5';

/**
 * "The card in flight never produced audible prompt audio." Read off the
 * snapshot rather than a dedicated export: `getPromptSnapshot` already returns
 * null for a card that is not in flight, so this is the same predicate the
 * module used to expose as `isPromptSilent` without a second public surface.
 */
const isSilent = (key: string): boolean => getPromptSnapshot(key)?.started === false;

const played = {
  started: true,
  playMs: 120,
  cacheMissed: false,
  healed: false,
  sessionRecordCapable: false,
  micStreamOpen: false,
};

describe('promptTelemetry', () => {
  beforeEach(() => {
    resetPromptTelemetry();
  });

  describe('the silent card', () => {
    it('records a play that never started, with the deadline it burned', () => {
      markCardCurrent(CARD);
      beginPrompt(CARD);
      recordPromptPlay(CARD, {
        started: false,
        playMs: 4012,
        cacheMissed: true,
        healed: true,
        sessionRecordCapable: false,
        micStreamOpen: false,
      });

      const snapshot = getPromptSnapshot(CARD);
      expect(snapshot).toMatchObject({
        started: false,
        playMs: 4012,
        cacheMissed: true,
        healed: true,
        // Settled immediately: no finish watcher is created on this path, so
        // waiting for one would leave the field null forever.
        heardInFull: false,
      });
    });

    it('flags the card so a row can be written even with no voice attempt', () => {
      markCardCurrent(CARD);
      beginPrompt(CARD);
      expect(isSilent(CARD)).toBe(false);

      recordPromptPlay(CARD, {
        started: false,
        playMs: 4000,
        cacheMissed: false,
        healed: false,
        sessionRecordCapable: false,
        micStreamOpen: false,
      });
      expect(isSilent(CARD)).toBe(true);
    });

    /**
     * The inaudible card, which is NOT the silent card: `started` is true, the
     * play head moves, the finish watcher is happy — and the learner hears
     * nothing, because the prompt played on the record-capable session
     * (`.playAndRecord`, mode `.measurement` with the Advanced iOS raw-mode
     * toggle on) that the handoff exists to take it off. Six days of iOS rows
     * carried no trace of it at all.
     */
    it('records that the prompt played on a still-record-capable session', () => {
      markCardCurrent(CARD);
      beginPrompt(CARD);
      recordPromptPlay(CARD, { ...played, sessionRecordCapable: true, micStreamOpen: true });

      expect(getPromptSnapshot(CARD)).toMatchObject({
        started: true,
        sessionRecordCapable: true,
        micStreamOpen: true,
      });
    });

    /**
     * The same inaudible card seen through the desync that causes it: the app
     * believes playback owns the session while the microphone's input stream is
     * still open — which it cannot be on a playback-only session. Recorded
     * separately from the flag above because the flag is exactly what is wrong
     * in this state, so on its own it would report a clean card.
     */
    it('records an open input stream even when the flag claims playback', () => {
      markCardCurrent(CARD);
      beginPrompt(CARD);
      recordPromptPlay(CARD, { ...played, sessionRecordCapable: false, micStreamOpen: true });

      expect(getPromptSnapshot(CARD)).toMatchObject({
        sessionRecordCapable: false,
        micStreamOpen: true,
      });
    });

    it('keeps a missing audio_url distinct from a play that failed', () => {
      markCardCurrent(CARD);
      beginPrompt(CARD);
      recordPromptAbsent(CARD);

      // Both are silent, but only one of them tried: playMs separates "there
      // was nothing to play" from "it refused to load".
      expect(getPromptSnapshot(CARD)).toMatchObject({ started: false, playMs: 0 });
      expect(isSilent(CARD)).toBe(true);
    });
  });

  describe('the truncated card', () => {
    it('names what cut the prompt and how far in', () => {
      markCardCurrent(CARD);
      beginPrompt(CARD);
      recordPromptPlay(CARD, played);
      recordPromptCut('speak-now');

      const snapshot = getPromptSnapshot(CARD);
      expect(snapshot?.cutBy).toBe('speak-now');
      expect(snapshot?.cutAtMs).toEqual(expect.any(Number));
      expect(snapshot?.heardInFull).toBe(false);
    });

    it('lets the recorded cut outrank the finish reason that follows it', () => {
      markCardCurrent(CARD);
      beginPrompt(CARD);
      recordPromptPlay(CARD, played);
      recordPromptCut('speak-now');
      // The watcher sees the teardown a beat later and calls it 'stopped' — but
      // 'stopped' is also what a player dying on its own looks like. The cut is
      // the answer to "why", so it must survive the finish.
      recordPromptFinish(CARD, { reason: 'stopped', audibleMs: 300, durationMs: 1850 });

      expect(getPromptSnapshot(CARD)).toMatchObject({
        cutBy: 'speak-now',
        finishReason: 'stopped',
        audibleMs: 300,
        durationMs: 1850,
        heardInFull: false,
      });
    });

    it('keeps the first cut — a reveal after a tap is the tap consequence', () => {
      markCardCurrent(CARD);
      beginPrompt(CARD);
      recordPromptPlay(CARD, played);
      recordPromptCut('speak-now');
      recordPromptCut('reveal');

      expect(getPromptSnapshot(CARD)?.cutBy).toBe('speak-now');
    });

    it('does not invent a cut on a prompt that already finished', () => {
      markCardCurrent(CARD);
      beginPrompt(CARD);
      recordPromptPlay(CARD, played);
      recordPromptFinish(CARD, { reason: 'didJustFinish', audibleMs: 1850, durationMs: 1850 });
      // Advancing off a card whose word has been fully read is not a truncation.
      recordPromptCut('advance');

      expect(getPromptSnapshot(CARD)).toMatchObject({ cutBy: null, heardInFull: true });
    });

    it('does not invent a cut on a prompt that never started', () => {
      markCardCurrent(CARD);
      beginPrompt(CARD);
      recordPromptPlay(CARD, { ...played, started: false, playMs: 4000 });
      recordPromptCut('speak-now');

      expect(getPromptSnapshot(CARD)?.cutBy).toBeNull();
    });
  });

  describe('the healthy card', () => {
    it.each(['didJustFinish', 'reachedEnd'] as const)(
      'counts %s as the whole word being heard',
      reason => {
        markCardCurrent(CARD);
        beginPrompt(CARD);
        recordPromptPlay(CARD, played);
        recordPromptFinish(CARD, { reason, audibleMs: 1850, durationMs: 1850 });

        expect(getPromptSnapshot(CARD)?.heardInFull).toBe(true);
      },
    );

    it.each(['maxWait', 'cancelled', 'superseded', 'stopped'] as const)(
      'does not count %s as the whole word being heard',
      reason => {
        markCardCurrent(CARD);
        beginPrompt(CARD);
        recordPromptPlay(CARD, played);
        recordPromptFinish(CARD, { reason, audibleMs: 400, durationMs: 1850 });

        expect(getPromptSnapshot(CARD)?.heardInFull).toBe(false);
      },
    );

    it('reports no duration when the player never reported one', () => {
      markCardCurrent(CARD);
      beginPrompt(CARD);
      recordPromptPlay(CARD, played);
      recordPromptFinish(CARD, { reason: 'maxWait', audibleMs: 8000, durationMs: 0 });

      // Null, not 0 — "unknown" and "zero-length" are different findings.
      expect(getPromptSnapshot(CARD)?.durationMs).toBeNull();
    });
  });

  describe('card isolation', () => {
    it('refuses to hand one card the prompt of another', () => {
      markCardCurrent(CARD);
      beginPrompt(CARD);
      recordPromptPlay(CARD, played);

      expect(getPromptSnapshot(OTHER_CARD)).toBeNull();
      expect(isSilent(OTHER_CARD)).toBe(false);
    });

    it('ignores late writes from a card that has already been replaced', () => {
      markCardCurrent(CARD);
      beginPrompt(CARD);
      recordPromptPlay(CARD, played);
      markCardCurrent(OTHER_CARD);
      beginPrompt(OTHER_CARD);

      // The previous card's finish watcher settles after the advance — it must
      // not stamp its reason onto the card now on screen.
      recordPromptFinish(CARD, { reason: 'superseded', audibleMs: 200, durationMs: 1850 });

      expect(getPromptSnapshot(OTHER_CARD)).toMatchObject({
        started: null,
        finishReason: null,
      });
    });

    it('starts every card from a clean record', () => {
      markCardCurrent(CARD);
      beginPrompt(CARD);
      recordPromptPlay(CARD, {
        started: false,
        playMs: 4000,
        cacheMissed: true,
        healed: true,
        sessionRecordCapable: true,
        micStreamOpen: true,
      });
      // Asserted at markCardCurrent, before the prompt is requested: that is the
      // moment a card starts, and nothing of the previous one may survive it.
      markCardCurrent(OTHER_CARD);

      expect(getPromptSnapshot(OTHER_CARD)).toEqual({
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
        sessionRecordCapable: null,
        micStreamOpen: null,
      });
    });

    it('answers nothing once the session is torn down', () => {
      markCardCurrent(CARD);
      beginPrompt(CARD);
      recordPromptPlay(CARD, played);
      resetPromptTelemetry();

      expect(getPromptSnapshot(CARD)).toBeNull();
      expect(isSilent(CARD)).toBe(false);
    });
  });
});
