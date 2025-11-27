import { QueryClient } from '@tanstack/react-query';
import { act } from 'react';

/**
 * Standard QueryClient configuration for tests
 * - No retries (fail fast)
 * - No garbage collection time (immediate cleanup)
 */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

/**
 * Helper to flush all pending timers and promises
 * Useful for testing components with setTimeout, setInterval, or debouncing
 *
 * @example
 * await flushPromisesAndTimers();
 * expect(mockCallback).toHaveBeenCalled();
 */
export const flushPromisesAndTimers = async (): Promise<void> => {
  await act(async () => {
    // Flush all pending promises
    await new Promise(resolve => setImmediate(resolve));
    // Flush all timers
    jest.runAllTimers();
  });
};

/**
 * Advance timers by a specific amount and flush promises
 * Useful for testing time-based behavior (debouncing, throttling, animations)
 *
 * @example
 * await advanceTimersByTime(3000); // Advance 3 seconds
 */
export const advanceTimersByTime = async (ms: number): Promise<void> => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await new Promise(resolve => setImmediate(resolve));
  });
};
