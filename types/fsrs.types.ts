import type { WordConfidence } from '@/types/review.types';
import type { StudyWord } from '@/types/vocabulary.types';

export interface UseFSRSOptions {
  userId: string | undefined;
  onComplete?: () => void;
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
