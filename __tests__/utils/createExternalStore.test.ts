import { act, renderHook } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';

import { createExternalStore } from '@/utils/createExternalStore';

describe('createExternalStore', () => {
  test('notifies listeners on a change, and not for an Object.is-equal value', () => {
    const store = createExternalStore(1);
    const listener = jest.fn();
    store.subscribe(listener);

    store.set(2);
    expect(store.get()).toBe(2);
    expect(listener).toHaveBeenCalledTimes(1);

    store.set(2);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('update derives from the current value', () => {
    const store = createExternalStore(10);
    store.update(current => current + 5);
    expect(store.get()).toBe(15);
  });

  test('runs the lifecycle hooks on the first subscribe and the last unsubscribe only', () => {
    const onFirstSubscribe = jest.fn();
    const onLastUnsubscribe = jest.fn();
    const store = createExternalStore(0, { onFirstSubscribe, onLastUnsubscribe });

    const unsubscribeA = store.subscribe(() => undefined);
    const unsubscribeB = store.subscribe(() => undefined);
    expect(onFirstSubscribe).toHaveBeenCalledTimes(1);

    unsubscribeA();
    expect(onLastUnsubscribe).not.toHaveBeenCalled();
    unsubscribeB();
    unsubscribeB(); // idempotent: a double cleanup must not fire it twice
    expect(onLastUnsubscribe).toHaveBeenCalledTimes(1);
  });

  test('a listener that unsubscribes during the fan-out does not skip its sibling', () => {
    const store = createExternalStore('a');
    const sibling = jest.fn();
    const unsubscribeSelf = store.subscribe(() => unsubscribeSelf());
    store.subscribe(sibling);
    store.set('b');
    expect(sibling).toHaveBeenCalledTimes(1);
  });

  test('useValue re-renders with the new value', () => {
    const store = createExternalStore('first');
    const { result } = renderHook(() => store.useValue());
    expect(result.current).toBe('first');

    act(() => {
      store.set('second');
    });
    expect(result.current).toBe('second');
  });
});
