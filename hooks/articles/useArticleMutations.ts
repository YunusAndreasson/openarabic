import type { UseMutationResult } from '@tanstack/react-query';

import { useReadingListMutations } from '@/hooks/articles/useReadingListMutations';
import { useStudyWordMutations } from '@/hooks/articles/useStudyWordMutations';
import type { ArticleId, RootId } from '@/types/branded.types';

type StudyWordContext = {
  previousStudyWords: { root_id: number }[];
};

interface ArticleMutationsResult {
  handleToggleReadingList: (
    articleId: ArticleId | undefined,
    isInReadingList: boolean,
  ) => Promise<void>;
  handleWordPress: (wordId: RootId) => void;
  handleRootPress: (rootId: RootId) => Promise<boolean | undefined>;
  addToReadingListMutation: UseMutationResult<
    void,
    Error,
    { userId: string; articleId: ArticleId }
  >;
  removeFromReadingListMutation: UseMutationResult<
    void,
    Error,
    { userId: string; articleId: ArticleId }
  >;
  toggleWordMutation: UseMutationResult<
    boolean,
    Error,
    { userId: string; wordId?: RootId; rootId?: number },
    StudyWordContext
  >;
  toggleRootMutation: UseMutationResult<
    boolean,
    Error,
    { userId: string; wordId?: RootId; rootId?: number },
    StudyWordContext
  >;
}

/**
 * Composite hook for article-related mutations
 * Combines reading list and study word mutations for backward compatibility
 *
 * @deprecated Consider using `useReadingListMutations` or `useStudyWordMutations` directly
 *             for focused functionality. This hook is maintained for backward compatibility.
 *
 * @param _userId - The current user ID (might be stale, prefer session-based auth in individual hooks)
 * @param refetchReadingListStatus - Function to refetch reading list status
 * @param refetchStudyWords - Function to refetch study words (returns a Promise)
 * @returns Object with all mutation functions (reading list + study words)
 */
export const useArticleMutations = (
  _userId: string | undefined,
  refetchReadingListStatus: () => void,
  refetchStudyWords?: () => Promise<void>,
): ArticleMutationsResult => {
  // Use focused hooks for each concern
  const readingListMutations = useReadingListMutations(refetchReadingListStatus);
  const studyWordMutations = useStudyWordMutations(refetchStudyWords);

  // Combine results from both hooks
  return {
    ...readingListMutations,
    ...studyWordMutations,
  };
};
