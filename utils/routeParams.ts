import { useLocalSearchParams } from 'expo-router';

import type { RootId } from '@/types/branded.types';

/**
 * A route param that must be a positive integer id, or `undefined`.
 *
 * Only a string of digits counts. `parseInt` reads '12abc' as 12, and `Number`
 * reads '' as 0 and '1e3' as 1000, so a malformed link used to open some other
 * id, or none, instead of being reported as malformed. A repeated query key
 * arrives as an array, which is not an id either.
 */
export function parsePositiveIntParam<T extends number = number>(
  raw: string | string[] | undefined,
): T | undefined {
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return undefined;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? (value as T) : undefined;
}

/**
 * The `rootId` of a word route (`getPracticeWordRoute`, `getWordDetailRoute`),
 * or `undefined` when the link carried no usable one.
 */
export function useRootIdParam(): RootId | undefined {
  const { rootId } = useLocalSearchParams<{ rootId?: string }>();
  return parsePositiveIntParam<RootId>(rootId);
}
