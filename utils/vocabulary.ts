export interface StudyWord {
  sentence_word?: {
    word: string;
    translation: string;
  } | null;
  next_review_at: string;
  interval_days: number;
  review_count: number;
}
