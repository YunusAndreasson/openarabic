import { useQuery } from '@tanstack/react-query';
import { useMemo, type ReactNode } from 'react';

import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { fsrsQueries, gated } from '@/constants/queries';
import type { StudyWord } from '@/types/vocabulary.types';
import { createRequiredContext } from '@/utils/createRequiredContext';

interface FSRSDataContextValue {
  studyWords: StudyWord[] | undefined;
  isLoading: boolean;
  error: unknown;
}

const [FSRSDataContext, useFSRSDataContext] = createRequiredContext<FSRSDataContextValue>(
  'FSRSDataContext',
  'useFSRSData must be used within an FSRSDataProvider',
);

interface FSRSDataProviderProps {
  children: ReactNode;
  userId: string | undefined;
}

export function FSRSDataProvider({ children, userId }: FSRSDataProviderProps) {
  // The context is the full word list and nothing else, so its loading and
  // error states are that list's alone.
  const { data: studyWords, isLoading, error } = useQuery(gated(fsrsQueries.all, userId));

  // Kept warm on purpose, not read here: the review session's due entry (the
  // cooldown variant with no limit — `useFSRS`'s own key). Observing it at the
  // root is what makes every invalidation and resume refetch it straight away.
  // `useFSRS` builds its session from whatever that entry holds when the review
  // screen mounts, without waiting for its own mount refetch, so with no
  // observer here a session could start from a list that predates the last
  // change — a word saved in the reader since then simply missing. Render-free:
  // `notifyOnChangeProps: []` never re-renders the provider for it.
  useQuery({
    ...gated(id => fsrsQueries.due(id, DEFAULT_SESSION_COOLDOWN_HOURS), userId),
    notifyOnChangeProps: [],
  });

  const value: FSRSDataContextValue = useMemo(
    () => ({
      studyWords,
      isLoading,
      error,
    }),
    [studyWords, isLoading, error],
  );

  return <FSRSDataContext value={value}>{children}</FSRSDataContext>;
}

export function useFSRSData(): FSRSDataContextValue {
  return useFSRSDataContext();
}
