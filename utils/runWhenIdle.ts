const IDLE_TIMEOUT_MS = 1000;

/**
 * Defer non-urgent work until the JS runtime has idle time, while guaranteeing
 * that it still runs when the app stays busy. The timer fallback keeps tests
 * and runtimes without the global deterministic without importing deprecated
 * RN APIs.
 */
export function runWhenIdle(task: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(task, { timeout: IDLE_TIMEOUT_MS });
    return;
  }

  setTimeout(task, 0);
}
