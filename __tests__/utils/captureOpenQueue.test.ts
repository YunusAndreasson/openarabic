/**
 * The invariant these tests exist for: a capture teardown must never interleave
 * with another transition's open. That is the shape of the dead-microphone bug
 * (a recorder built against a session the other half is releasing), and until
 * this queue existed the rule lived as ad-hoc refs inside a 984-line provider
 * that no test can reach without a native audio stack.
 */
import { describe, expect, test } from '@jest/globals';

import { CaptureOpenQueue } from '@/utils/captureOpenQueue';

/** Resolves on demand, so a transition can be held open across other calls. */
function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve = (): void => undefined;
  const promise = new Promise<void>(res => {
    resolve = () => res();
  });
  return { promise, resolve };
}

describe('CaptureOpenQueue', () => {
  test('an open joins a reopen already in flight instead of racing it', async () => {
    const queue = new CaptureOpenQueue();
    const gate = deferred();
    const started: string[] = [];

    const reopen = queue.run('reopen', async () => {
      started.push('reopen');
      await gate.promise;
    });
    const open = queue.run('open', async () => {
      started.push('open');
    });

    // The join must be decided synchronously — arm() reaches this call while the
    // signal-driven reopen is mid-teardown.
    expect(started).toEqual(['reopen']);

    gate.resolve();
    await Promise.all([reopen, open]);

    // Never ran its own work: it attached to the reopen, which ends with an open
    // stream — exactly what the caller wanted.
    expect(started).toEqual(['reopen']);
  });

  test('a reopen queues AFTER an open in flight rather than tearing down under it', async () => {
    const queue = new CaptureOpenQueue();
    const gate = deferred();
    const events: string[] = [];

    const open = queue.run('open', async () => {
      events.push('open:start');
      await gate.promise;
      events.push('open:end');
    });
    const reopen = queue.run('reopen', async () => {
      events.push('reopen:start');
    });

    // The whole point: the teardown has NOT begun while the open is running.
    expect(events).toEqual(['open:start']);

    gate.resolve();
    await Promise.all([open, reopen]);

    expect(events).toEqual(['open:start', 'open:end', 'reopen:start']);
  });

  test('a reopen joins another reopen — one rebuild answers every signal', async () => {
    const queue = new CaptureOpenQueue();
    const gate = deferred();
    let rebuilds = 0;

    const first = queue.run('reopen', async () => {
      rebuilds += 1;
      await gate.promise;
    });
    // After a phone call, route-change and interruption-ended arrive together.
    const second = queue.run('reopen', async () => {
      rebuilds += 1;
    });

    gate.resolve();
    await Promise.all([first, second]);

    expect(rebuilds).toBe(1);
  });

  test('concurrent opens collapse to one', async () => {
    const queue = new CaptureOpenQueue();
    const gate = deferred();
    let opens = 0;

    const a = queue.run('open', async () => {
      opens += 1;
      await gate.promise;
    });
    const b = queue.run('open', async () => {
      opens += 1;
    });

    gate.resolve();
    await Promise.all([a, b]);

    expect(opens).toBe(1);
  });

  test('a failed transition still frees the queue for the next one', async () => {
    const queue = new CaptureOpenQueue();

    // openCapture swallows its own errors, but the queue must not depend on that.
    await expect(queue.run('open', () => Promise.reject(new Error('mic busy')))).rejects.toThrow(
      'mic busy',
    );

    expect(queue.isBusy).toBe(false);

    let ran = false;
    await queue.run('open', async () => {
      ran = true;
    });
    expect(ran).toBe(true);
  });

  test('a queued reopen still runs when the transition ahead of it fails', async () => {
    const queue = new CaptureOpenQueue();
    const gate = deferred();
    let rebuilt = false;

    const open = queue.run('open', async () => {
      await gate.promise;
      throw new Error('open failed');
    });
    const reopen = queue.run('reopen', async () => {
      rebuilt = true;
    });

    gate.resolve();
    await expect(open).rejects.toThrow('open failed');
    await reopen;

    expect(rebuilt).toBe(true);
  });

  test('transitions run one at a time under a burst of mixed signals', async () => {
    const queue = new CaptureOpenQueue();
    let active = 0;
    let overlaps = 0;

    const work = async (): Promise<void> => {
      active += 1;
      if (active > 1) overlaps += 1;
      await Promise.resolve();
      active -= 1;
    };

    await Promise.all([
      queue.run('reopen', work),
      queue.run('open', work),
      queue.run('reopen', work),
      queue.run('open', work),
      queue.run('reopen', work),
    ]);

    expect(overlaps).toBe(0);
  });
});
