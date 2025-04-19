import type { StudyWord } from './vocabulary.types';

export interface UseFSRSOptions {
  userId: string | undefined;
  onComplete?: () => void;
}

export type UseFSRSResult = {
  currentWord: StudyWord | null;
  wordQueue: StudyWord[];
  isLoading: boolean;
  isComplete: boolean;
  progress: number;
  updateWord: (rootId: number, confidence: 'known' | 'vague' | 'unknown') => Promise<void>;
  invalidateQueries: () => void;
  refetchDueWords: () => Promise<unknown>;
  resetQueue: () => void;
};

export type FSRSStateTracking = {
  isProcessingUpdate: boolean;
  completionTriggered: boolean;
  queueInitialized: boolean;
};
