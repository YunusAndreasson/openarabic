import { EmptyState } from '@/components/common/EmptyState';
import { STRINGS } from '@/constants/strings';

/**
 * Empty state for the Practice screen.
 */
export function PracticeEmptyState() {
  return (
    <EmptyState
      icon="albums-outline"
      title={STRINGS.STUDY_LIST_EMPTY_TITLE}
      hint={STRINGS.STUDY_LIST_EMPTY_HINT}
    />
  );
}
