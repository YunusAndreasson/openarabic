import { createContext, use, type Context } from 'react';

/**
 * A context with no usable default, plus the hook that reads it.
 *
 * Seven providers wrote the same pair by hand: `createContext<T | null>(null)`
 * and a `useX()` that throws when no provider is mounted, so a missing provider
 * fails loudly at the first read instead of rendering `undefined` downstream.
 * This is that pair. The message is the caller's, so existing error text (which
 * tests assert) stays exactly as it was.
 *
 * Lives in `utils/` rather than `components/` so importing it can never close a
 * barrel cycle.
 */
export function createRequiredContext<T>(
  displayName: string,
  missingProviderMessage: string,
): readonly [Context<T | null>, () => T] {
  const RequiredContext = createContext<T | null>(null);
  RequiredContext.displayName = displayName;

  function useRequiredContext(): T {
    const value = use(RequiredContext);
    if (value === null) throw new Error(missingProviderMessage);
    return value;
  }

  return [RequiredContext, useRequiredContext] as const;
}
