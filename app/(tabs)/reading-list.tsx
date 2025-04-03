import React, { useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { readingListService } from '@/services/readingList';
import { analytics } from '@/services/analytics';
import type { Article } from '@/types/articles.types';

interface ReadingListItem {
  user_id: string;
  article_id: number;
  position: number;
  completed: boolean;
  completed_at: string | null;
  read_count: number;
  added_at: string;
  articles: Article & { author: { id: number; name: string } };
}

export default function ReadingListScreen() {
  const { user } = useAuth();
  const { data: readingList } = useQuery<ReadingListItem[]>({
    queryKey: ['readingList', user?.id],
    queryFn: () => readingListService.getReadingList(user!.id),
    enabled: !!user?.id,
  });

  // Track reading list view
  useEffect(() => {
    if (user && readingList) {
      const completedCount = readingList.filter(item => item.completed).length;
      analytics.trackViewReadingList({
        totalCount: readingList.length,
        completedCount,
      });
    }
  }, [user, readingList]);

  // ... rest of the code ...
}
