import { useSyncExternalStore } from 'react';

/**
 * A module-level value React can subscribe to.
 *
 * Seven modules hand-rolled the same `let value` + `Set` of listeners +
 * `useSyncExternalStore(subscribe, getSnapshot)` trio (the mini-player height,
 * the tab-bar auto-hide offset, the Skia GPU and font availability, onboarding
 * progress, the review diagnostics HUD, the voice model). This is that trio.
 *
 * The snapshot is the stored value itself, so it is stable between changes —
 * the property `useSyncExternalStore` requires, and the one a getter that built
 * a fresh object per call would break (an infinite re-render loop).
 */
export interface ExternalStore<T> {
  /** The current value. */
  get(): T;
  /** Replace the value. A value `Object.is`-equal to the current one notifies no one. */
  set(next: T): void;
  /** Derive the next value from the current one. */
  update(updater: (current: T) => T): void;
  /** Listen for changes; returns the unsubscribe. */
  subscribe(listener: () => void): () => void;
  /** React binding: the current value, re-rendering when it changes. */
  useValue(): T;
}

export interface ExternalStoreLifecycle {
  /** Runs when the first listener subscribes — e.g. attach an OS listener lazily. */
  onFirstSubscribe?: () => void;
  /** Runs when the last listener unsubscribes — detach it again. */
  onLastUnsubscribe?: () => void;
}

export function createExternalStore<T>(
  initial: T,
  lifecycle: ExternalStoreLifecycle = {},
): ExternalStore<T> {
  let value = initial;
  const listeners = new Set<() => void>();

  const get = (): T => value;

  const set = (next: T): void => {
    if (Object.is(next, value)) return;
    value = next;
    // A copy, so a listener that unsubscribes during the fan-out can't skip a sibling.
    [...listeners].forEach(listener => listener());
  };

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    if (listeners.size === 1) lifecycle.onFirstSubscribe?.();
    return () => {
      if (!listeners.delete(listener)) return;
      if (listeners.size === 0) lifecycle.onLastUnsubscribe?.();
    };
  };

  return {
    get,
    set,
    update: updater => set(updater(value)),
    subscribe,
    useValue: () => useSyncExternalStore(subscribe, get, get),
  };
}
