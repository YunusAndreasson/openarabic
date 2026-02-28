import { EmptyState } from '@/components/common/EmptyState';
import { STRINGS } from '@/constants/strings';

/**
 * Empty state for the Dictionary screen.
 */
export function DictionaryEmptyState() {
  return (
    <EmptyState
      icon="book-outline"
      title={STRINGS.STUDY_LIST_EMPTY_TITLE}
      hint={STRINGS.STUDY_LIST_EMPTY_HINT}
    />
  );
}
