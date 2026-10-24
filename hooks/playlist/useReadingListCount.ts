import { useQuery } from '@tanstack/react-query';

import { gated, readingProgressQueries } from '@/constants/queries';

/** Subscribe to the smallest reading-list shape needed by header chrome. */
export function useReadingListCount(userId: string | undefined): number {
  const query = useQuery({
    ...gated(readingProgressQueries.readingList, userId),
    select: readingList => readingList.length,
  });

  return query.data ?? 0;
}
