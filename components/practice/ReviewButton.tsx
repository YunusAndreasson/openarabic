import { router } from 'expo-router';
import { useCallback, type JSX } from 'react';

import { HeaderTextButton } from '@/components/ui';
import { PRACTICE_DUE_WORDS_LIMIT } from '@/constants/queries';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth';
import { useDueWordsCount, useHasStudyWords } from '@/hooks/vocabulary/useFSRSQueries';

/**
 * The Practice tab's `headerRight` — starts a review session.
 *
 * Was a full-width pill pinned above the tab bar; the label carried the
 * workload ("Review 12 words") because it had the room. Up here it is one word,
 * and the count it used to spell out is already on the tab badge and the "Due
 * now" card directly below — the same fact at three sizes was never worth the
 * header width,
 * and a label that changes length as the session drains would make the header
 * twitch.
 *
 * ONE button whose label and action swap, not two that trade places — same rule
 * the pinned version documented. Caught up is not the same as nothing to do:
 * with nothing due the action becomes "Browse articles", because more words
 * come from reading and a Practice tab with no action at all is a dead end at
 * exactly the moment the learner came looking for something to do.
 *
 * Reads its own queries rather than taking props, like `DictionaryButton`
 * beside it: header components are mounted by the layout, which has no access
 * to the screen's state.
 */
export function ReviewButton(): JSX.Element | null {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const hasStudyWords = useHasStudyWords(userId);
  const dueWordsCount = useDueWordsCount({ userId, limit: PRACTICE_DUE_WORDS_LIMIT });

  const handleStartReview = useCallback(() => {
    router.push(ROUTE_PATHS.REVIEW);
  }, []);

  // Matches the empty state's secondary CTA.
  const handleBrowseArticles = useCallback(() => router.navigate(ROUTE_PATHS.EXPLORE_TAB), []);

  // No words saved yet — the screen is showing its empty state, which carries
  // its own call to action. A second one in the header would compete with it.
  if (!hasStudyWords) {
    return null;
  }

  const hasDueWords = dueWordsCount > 0;

  return (
    <HeaderTextButton
      title={hasDueWords ? STRINGS.REVIEW_CTA : STRINGS.BROWSE_ARTICLES}
      onPress={hasDueWords ? handleStartReview : handleBrowseArticles}
    />
  );
}
