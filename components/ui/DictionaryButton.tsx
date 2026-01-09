import { router } from 'expo-router';
import type { JSX } from 'react';
import { useCallback } from 'react';

import { TransparentHeaderButton } from '@/components/ui/TransparentHeaderButton';
import { ROUTE_PATHS } from '@/constants/routes';
import { useAuth } from '@/hooks/auth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

interface DictionaryButtonProps {
  hideWhenEmpty?: boolean;
  itemCount?: number;
}

export function DictionaryButton(props: DictionaryButtonProps): JSX.Element | null {
  const { hideWhenEmpty = true, itemCount } = props;
  const { session } = useAuth();

  // Get study words count to determine if button should be shown
  const { allWords, dueWords } = useFSRSQueries({ userId: session?.user?.id });
  const studyWordsCount = (allWords?.length ?? 0) + (dueWords?.length ?? 0);
  const effectiveCount = itemCount ?? studyWordsCount;

  const handlePressAction = useCallback((): void => {
    router.push(ROUTE_PATHS.PRACTICE_DICTIONARY);
  }, []);

  // Hide button when hideWhenEmpty is true and there are no study words
  if (hideWhenEmpty && (effectiveCount ?? 0) <= 0) {
    return null;
  }

  return <TransparentHeaderButton iconName="book" onPress={handlePressAction} size="medium" />;
}
