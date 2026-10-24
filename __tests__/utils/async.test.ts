import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { delay, withTimeout } from '@/utils/async';

describe('delay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('resolves only once the time has passed', async () => {
    let settled = false;
    const pending = delay(500).then(() => {
      settled = true;
    });
    await jest.advanceTimersByTimeAsync(499);
    expect(settled).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    await pending;
    expect(settled).toBe(true);
  });
});

describe('withTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('settles with the work when it finishes first, and never runs onTimeout', async () => {
    const onTimeout = jest.fn(() => 'late');
    const result = withTimeout(Promise.resolve('done'), 1000, onTimeout);
    await expect(result).resolves.toBe('done');
    await jest.advanceTimersByTimeAsync(2000);
    expect(onTimeout).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('settles with the onTimeout value when the deadline wins', async () => {
    const never = new Promise<string>(() => undefined);
    const result = withTimeout(never, 1000, () => 'fallback');
    await jest.advanceTimersByTimeAsync(1000);
    await expect(result).resolves.toBe('fallback');
  });

  test('rejects with what onTimeout throws', async () => {
    const never = new Promise<string>(() => undefined);
    const result = withTimeout(never, 1000, () => {
      throw new Error('timed out');
    });
    const assertion = expect(result).rejects.toThrow('timed out');
    await jest.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  test('passes through a rejection from the work and clears the timer', async () => {
    const result = withTimeout(Promise.reject(new Error('boom')), 1000, () => 'fallback');
    await expect(result).rejects.toThrow('boom');
    expect(jest.getTimerCount()).toBe(0);
  });
});
