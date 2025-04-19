export interface Database {
  public: {
    Tables: {
      study_words: {
        Row: {
          id: number;
          user_id: string;
          sentence_word_id: number | null;
          root_id: number;
          state: string;
          due: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          sentence_word_id?: number | null;
          root_id: number;
          state: string;
          due: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          sentence_word_id?: number | null;
          root_id?: number;
          state?: string;
          due?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

interface StudyWord {
  user_id: string;
  root_id: number;
  created_at: string;
  // ... existing code ...
}

interface FSRSLog {
  user_id: string;
  root_id: number;
  created_at: string;
  // ... existing code ...
}

interface FSRSState {
  user_id: string;
  root_id: number;
  // ... existing code ...
}
