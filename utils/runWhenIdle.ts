type IdleRequest = (callback: () => void, options?: { timeout: number }) => number;

const IDLE_TIMEOUT_MS = 1000;

/**
 * Defer non-urgent work until the JS runtime has idle time, while guaranteeing
 * that it still runs when the app stays busy. The timer fallback keeps tests
 * and older runtimes deterministic without importing deprecated RN APIs.
 */
export function runWhenIdle(task: () => void): void {
  const requestIdle = (globalThis as typeof globalThis & { requestIdleCallback?: IdleRequest })
    .requestIdleCallback;

  if (requestIdle) {
    requestIdle(task, { timeout: IDLE_TIMEOUT_MS });
    return;
  }

  setTimeout(task, 0);
}
