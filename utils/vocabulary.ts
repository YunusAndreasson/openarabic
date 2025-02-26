// Define types for our components
export interface VocabularyStats {
  totalWords: number;
  dueWords: number;
  masteredWords: number;
  learningWords: number;
}

export interface StudyWord {
  sentence_word?: {
    word: string;
    translation: string;
  } | null;
  next_review_at: string;
  interval_days: number;
  review_count: number;
}

// Helper function to get a motivational message based on stats
export const getMotivationalMessage = (stats: VocabularyStats): string => {
  if (stats.dueWords > 0) {
    return `You have ${stats.dueWords} words to review today. Keep up the good work!`;
  } else if (stats.totalWords === 0) {
    return 'Start building your vocabulary today!';
  } else if (stats.masteredWords === stats.totalWords) {
    return "Amazing! You've mastered all your words. Add more to keep learning!";
  } else {
    return 'Great job! All caught up with your reviews for today.';
  }
};
