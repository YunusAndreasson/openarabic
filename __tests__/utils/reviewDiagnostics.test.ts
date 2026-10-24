/**
 * The review diagnostics HUD reads the timeline through useSyncExternalStore,
 * so the snapshot has to be stable between changes, fresh after each, and
 * cheap — no snapshot work at all while nothing watches.
 */
import {
  countDiag,
  endDiagSession,
  getDiagSnapshot,
  mark,
  setDiagnosticsEnabled,
  startDiagSession,
  subscribeDiag,
} from '@/utils/reviewDiagnostics';

describe('reviewDiagnostics snapshot', () => {
  beforeEach(() => {
    setDiagnosticsEnabled(true);
    startDiagSession();
  });

  afterEach(() => {
    endDiagSession();
  });

  test('a HUD opened mid-session sees what had already been recorded', () => {
    mark('card.show');
    countDiag({ micArms: 2 });
    // Nothing watches yet, so nothing was published...
    expect(getDiagSnapshot().counters.micArms).toBe(0);

    const unsubscribe = subscribeDiag(() => undefined);
    // ...and subscribing publishes the timeline so far.
    expect(getDiagSnapshot().counters.micArms).toBe(2);
    expect(getDiagSnapshot().tail.map(entry => entry.event)).toContain('card.show');
    unsubscribe();
  });

  test('is the same object between changes and a new one after each', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeDiag(listener);
    const before = getDiagSnapshot();
    expect(getDiagSnapshot()).toBe(before);

    mark('mic.arm.request');
    expect(listener).toHaveBeenCalled();
    expect(getDiagSnapshot()).not.toBe(before);
    expect(getDiagSnapshot().version).toBeGreaterThan(before.version);
    unsubscribe();
  });

  test('a broken subscriber cannot break the pipeline it watches', () => {
    const unsubscribe = subscribeDiag(() => {
      throw new Error('HUD exploded');
    });
    expect(() => mark('mic.capturing')).not.toThrow();
    expect(getDiagSnapshot().tail.at(-1)?.event).toBe('mic.capturing');
    unsubscribe();
  });

  test('stops publishing once the last subscriber leaves', () => {
    const unsubscribe = subscribeDiag(() => undefined);
    unsubscribe();
    const lastSeen = getDiagSnapshot();
    mark('prompt.done');
    expect(getDiagSnapshot()).toBe(lastSeen);
  });
});
