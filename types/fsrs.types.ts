import type { WordConfidence } from './review.types';
import type { StudyWord } from './vocabulary.types';

export interface UseFSRSOptions {
  userId: string | undefined;
  onComplete?: () => void;
  useAllWords?: boolean; // If true, fetch all words instead of just due words
  mode?: string; // 'spaced' for struggling words, undefined for normal practice
  /**
   * Session cooldown: Exclude words reviewed within this many hours.
   * Prevents words from appearing immediately after a study session.
   * Default: 1 hour
   */
  sessionCooldownHours?: number;
}

export type UseFSRSResult = {
  currentWord: StudyWord | null;
  wordQueue: StudyWord[];
  isLoading: boolean;
  isComplete: boolean;
  progress: number;
  updateWord: (rootId: number, confidence: WordConfidence) => Promise<void>;
  invalidateQueries: () => void;
  resetQueue: () => void;
};

export type FSRSStateTracking = {
  isProcessingUpdate: boolean;
  completionTriggered: boolean;
  queueInitialized: boolean;
};
