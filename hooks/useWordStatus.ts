import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Determines the status of a study word based on its review interval and due date
 * @param nextReviewAt - Next review date string
 * @param intervalDays - Current interval in days
 * @returns Status information about the word
 */
export function useWordStatus(nextReviewAt: string, intervalDays: number) {
  return useMemo(() => {
    const dueDate = new Date(nextReviewAt);
    const isOverdue = dueDate < new Date();
    const isMastered = intervalDays >= 30;

    return {
      isOverdue,
      isMastered,
      status: isMastered ? 'mastered' : isOverdue ? 'due' : 'learning',
      statusLabel: isMastered ? 'Mastered' : isOverdue ? 'Due' : 'Learning',
      statusIcon: (isMastered ? 'checkmark-circle' : isOverdue ? 'time' : 'school') as IconName,
    };
  }, [nextReviewAt, intervalDays]);
}
