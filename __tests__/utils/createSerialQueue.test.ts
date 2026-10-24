import { describe, expect, test } from '@jest/globals';

import { delay } from '@/utils/async';
import { createSerialQueue } from '@/utils/createSerialQueue';

describe('createSerialQueue', () => {
  test('runs operations one at a time, in call order', async () => {
    const enqueue = createSerialQueue();
    const events: string[] = [];

    const slow = enqueue(async () => {
      events.push('slow:start');
      await delay(20);
      events.push('slow:end');
      return 'slow';
    });
    const fast = enqueue(async () => {
      events.push('fast:start');
      return 'fast';
    });

    await expect(Promise.all([slow, fast])).resolves.toEqual(['slow', 'fast']);
    expect(events).toEqual(['slow:start', 'slow:end', 'fast:start']);
  });

  test('a rejected operation reaches its caller and does not wedge the queue', async () => {
    const enqueue = createSerialQueue();
    const failed = enqueue(async () => {
      throw new Error('nope');
    });
    const next = enqueue(async () => 'still runs');

    await expect(failed).rejects.toThrow('nope');
    await expect(next).resolves.toBe('still runs');
  });
});
