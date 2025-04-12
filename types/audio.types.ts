export type EnhancedAudioTrack = {
  id: string; // Composite ID, e.g., "article-sentence-123-4" or "article-word-123-5"
  type: 'sentence' | 'study_word_english' | 'study_word_arabic';
  articleId: number;
  audioUrl: string;
  title: string; // e.g., "Sentence 4" or "Word: Hello (English)"
  wordId?: number; // Only for study word type
  sentenceId?: number; // Only for sentence type
  sentencePosition?: number; // Optional: Position of sentence in article for reference
  duration?: number; // Optional: duration in milliseconds, useful for playback simulation
};

// ... rest of the types
