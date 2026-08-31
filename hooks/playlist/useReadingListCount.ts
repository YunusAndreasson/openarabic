import { useQuery } from '@tanstack/react-query';

import { readingProgressQueries } from '@/constants/queries';

/** Subscribe to the smallest reading-list shape needed by header chrome. */
export function useReadingListCount(userId: string | undefined): number {
  const query = useQuery({
    ...(userId
      ? readingProgressQueries.readingList(userId)
      : {
          queryKey: ['readingList', 'none'] as const,
          queryFn: () => Promise.resolve([]),
          enabled: false,
        }),
    select: readingList => readingList.length,
  });

  return query.data ?? 0;
}
