/**
 * Run async operations one at a time, in call order.
 *
 * AsyncStorage has no compare-and-swap, so a read-modify-write of a shared
 * value must not interleave with another. Two modules (onboarding progress and
 * the daily new-word quota) kept their own copy of this queue.
 *
 * Each operation starts after the previous one settles, whether it resolved or
 * rejected — one failure never wedges the queue — and the caller still receives
 * its own operation's result or rejection.
 */
export function createSerialQueue(): <T>(operation: () => Promise<T>) => Promise<T> {
  let tail: Promise<void> = Promise.resolve();

  return <T>(operation: () => Promise<T>): Promise<T> => {
    const result = tail.then(operation, operation);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}
