import { TransparentHeaderButton } from '@/components/ui';
import { router } from 'expo-router';
import type { JSX } from 'react';

import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

interface DictionaryButtonProps {
  hideWhenEmpty?: boolean;
}

/**
 * The Practice tab's `headerRight` — opens the full word list, and hides itself
 * until the learner has words to look at.
 *
 * Lives here rather than in `components/ui` because it is not a primitive: it
 * reaches into FSRS data and the router. A `components/ui` component should be
 * driveable entirely by its props.
 */
export function DictionaryButton({
  hideWhenEmpty = true,
}: DictionaryButtonProps): JSX.Element | null {
  const { session } = useAuth();

  // Get study words count to determine if button should be shown
  const { allWords, dueWords } = useFSRSQueries({ userId: session?.user?.id });
  const studyWordsCount = (allWords?.length ?? 0) + (dueWords?.length ?? 0);

  const handlePressAction = () => router.push(ROUTE_PATHS.PRACTICE_DICTIONARY);

  // Hide button when hideWhenEmpty is true and there are no study words
  if (hideWhenEmpty && studyWordsCount <= 0) {
    return null;
  }

  return (
    <TransparentHeaderButton
      accessibilityLabel={STRINGS.DICTIONARY_A11Y}
      icon="book"
      onPress={handlePressAction}
    />
  );
}
