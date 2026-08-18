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
 * Advance timers by a specific amount and flush promises
 * Useful for testing time-based behavior (debouncing, throttling, animations)
 *
 * @example
 * await advanceTimersByTime(3000); // Advance 3 seconds
 */
/** @internal Reached through a jest.mock require(); knip cannot see it. */
export const advanceTimersByTime = async (ms: number): Promise<void> => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await new Promise(resolve => setImmediate(resolve));
  });
};

/** Shape of the callback `measureInWindow` hands its caller. */
export type MeasureCallback = (
  x: number | undefined,
  y: number | undefined,
  width: number,
  height: number,
) => void;

/**
 * Render options that give a component's own `ref` something with a
 * `measureInWindow` on it.
 *
 * A component that measures itself holds that ref privately, so a test cannot
 * reach the instance from the outside — and a host instance in this renderer
 * has no `measureInWindow` at all, which the component's own try/catch then
 * swallows. Three tooltip tests used to pass while asserting nothing for
 * exactly that reason: they installed their mock on a `wordRef` PROP the
 * component had stopped accepting, so the ref stayed null and "the tooltip did
 * not open" was true for a reason unrelated to measurement. `createNodeMock` is
 * what actually stands in for the native view.
 *
 * @example
 * render(<Word onTooltipOpen={spy} />, measuring(cb => cb(12, 34, 56, 20)));
 */
export const measuring = (
  measureInWindow: (cb: MeasureCallback) => void,
): { createNodeMock: () => unknown } => ({
  createNodeMock: () => ({ measureInWindow }),
});
