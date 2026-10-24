import { TransparentHeaderButton } from '@/components/ui';
import { router } from 'expo-router';
import { useCallback, type JSX } from 'react';

import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth';
import { useHasStudyWords } from '@/hooks/vocabulary/useFSRSQueries';

/**
 * The Practice tab's header tool (its layout's `leftComponent`: leading on iOS,
 * inboard of the Review button on Android — see `createTabHeaderOptions`) —
 * opens the full word list, and hides itself until the learner has words to
 * look at.
 *
 * Lives here rather than in `components/ui` because it is not a primitive: it
 * reaches into FSRS data and the router. A `components/ui` component should be
 * driveable entirely by its props.
 */
export function DictionaryButton(): JSX.Element | null {
  const { session } = useAuth();

  const hasStudyWords = useHasStudyWords(session?.user?.id);

  const handlePressAction = useCallback(() => router.push(ROUTE_PATHS.PRACTICE_DICTIONARY), []);

  // Nothing to look at yet — the header stays clean until there is
  if (!hasStudyWords) {
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
