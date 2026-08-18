import { TransparentHeaderButton } from '@/components/ui';
import { router } from 'expo-router';
import type { JSX } from 'react';

import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

/**
 * The Practice tab's `headerRight` — opens the full word list, and hides itself
 * until the learner has words to look at.
 *
 * Lives here rather than in `components/ui` because it is not a primitive: it
 * reaches into FSRS data and the router. A `components/ui` component should be
 * driveable entirely by its props.
 */
export function DictionaryButton(): JSX.Element | null {
  const { session } = useAuth();

  // Get study words count to determine if button should be shown
  const { allWords, dueWords } = useFSRSQueries({ userId: session?.user?.id });
  const studyWordsCount = (allWords?.length ?? 0) + (dueWords?.length ?? 0);

  const handlePressAction = () => router.push(ROUTE_PATHS.PRACTICE_DICTIONARY);

  // Nothing to look at yet — the header stays clean until there is
  if (studyWordsCount <= 0) {
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
