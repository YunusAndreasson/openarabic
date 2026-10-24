/**
 * Small promise primitives the app used to hand-roll at each call site.
 *
 * Five sites wrote `new Promise(resolve => setTimeout(resolve, ms))`, and four
 * raced work against a deadline with a `let timer` that escaped its executor and
 * a `finally { clearTimeout(timer) }` — each one its own place to forget the
 * clear. These are those two shapes, written once.
 */

/** Resolve after `ms` milliseconds. */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

/**
 * Race `work` against a deadline.
 *
 * Settles with `work` if it settles first. Otherwise settles with whatever
 * `onTimeout` returns — or rejects with whatever it throws, which is how a
 * caller turns a timeout into an error. The timer is cleared however the race
 * ends, so a settled race never leaves one armed, and `onTimeout` never runs
 * once `work` has won.
 *
 * `work` keeps running after a timeout (a promise cannot be cancelled); a caller
 * that owns a resource the late result would leak must clean it up inside
 * `onTimeout`, e.g. `void work.then(engine => engine.destroy())`.
 */
export async function withTimeout<T, F>(
  work: Promise<T>,
  ms: number,
  onTimeout: () => F | Promise<F>,
): Promise<T | F> {
  const { promise: deadline, resolve: expire } = Promise.withResolvers<undefined>();
  const timer = setTimeout(() => expire(undefined), ms);
  try {
    return await Promise.race([work, deadline.then(onTimeout)]);
  } finally {
    clearTimeout(timer);
  }
}
