import type { WordConfidence } from './review.types';
import type { StudyWord } from './vocabulary.types';

export interface UseFSRSOptions {
  userId: string | undefined;
  onComplete?: () => void;
  useAllWords?: boolean; // If true, fetch all words instead of just due words
}

export type UseFSRSResult = {
  currentWord: StudyWord | null;
  wordQueue: StudyWord[];
  isLoading: boolean;
  isComplete: boolean;
  progress: number;
  updateWord: (rootId: number, confidence: WordConfidence) => Promise<void>;
  invalidateQueries: () => void;
  refetchDueWords: () => Promise<unknown>;
  resetQueue: () => void;
};

export type FSRSStateTracking = {
  isProcessingUpdate: boolean;
  completionTriggered: boolean;
  queueInitialized: boolean;
};
