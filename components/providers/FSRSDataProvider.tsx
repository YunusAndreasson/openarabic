import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { StudyWord } from '@/types/vocabulary.types';

import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

interface FSRSDataContextValue {
  studyWords: StudyWord[] | undefined;
  isLoading: boolean;
  error: unknown;
}

const FSRSDataContext = createContext<FSRSDataContextValue | null>(null);

interface FSRSDataProviderProps {
  children: ReactNode;
  userId: string | undefined;
}

export function FSRSDataProvider({ children, userId }: FSRSDataProviderProps) {
  const {
    allWords: studyWords,
    isLoading,
    error,
  } = useFSRSQueries({
    userId,
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
  const context = useContext(FSRSDataContext);
  if (!context) {
    throw new Error('useFSRSData must be used within an FSRSDataProvider');
  }
  return context;
}
