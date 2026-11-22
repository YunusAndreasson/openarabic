import { STRINGS } from '@/constants/strings';

/** A paused first read has no error object. A cached empty array is still a successful read. */
export function firstLoadError(
  query: { data: unknown; isPaused: boolean; isError: boolean; isFetching: boolean },
  failureMessage: string,
): string | undefined {
  if (query.data !== undefined || query.isFetching) return undefined;
  if (query.isPaused) return STRINGS.NO_INTERNET_CONNECTION;
  return query.isError ? failureMessage : undefined;
}
