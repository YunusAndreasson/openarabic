import { useReadingList } from '@/hooks/playlist/useReadingList';

export function useReadingListCount(userId: string | undefined): number {
  return useReadingList(userId).data.length;
}
