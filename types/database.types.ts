export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      article_sentences: {
        Row: {
          arabic: string;
          article_id: number;
          audio_url: string | null;
          english: string;
          id: number;
          position: number;
        };
        Insert: {
          arabic: string;
          article_id: number;
          audio_url?: string | null;
          english: string;
          id?: number;
          position: number;
        };
        Update: {
          arabic?: string;
          article_id?: number;
          audio_url?: string | null;
          english?: string;
          id?: number;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'article_sentences_article_id_fkey';
            columns: ['article_id'];
            isOneToOne: false;
            referencedRelation: 'articles';
            referencedColumns: ['id'];
          },
        ];
      };
      articles: {
        Row: {
          audio_url: string | null;
          author_id: number;
          category_id: number;
          content_hash: string | null;
          created_at: string;
          difficulty_level: number;
          id: number;
          image_url: string | null;
          source: string | null;
          summary: string | null;
          title: string;
        };
        Insert: {
          audio_url?: string | null;
          author_id: number;
          category_id: number;
          content_hash?: string | null;
          created_at?: string;
          difficulty_level: number;
          id?: number;
          image_url?: string | null;
          source?: string | null;
          summary?: string | null;
          title: string;
        };
        Update: {
          audio_url?: string | null;
          author_id?: number;
          category_id?: number;
          content_hash?: string | null;
          created_at?: string;
          difficulty_level?: number;
          id?: number;
          image_url?: string | null;
          source?: string | null;
          summary?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'articles_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'authors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'articles_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      authors: {
        Row: {
          id: number;
          name: string;
        };
        Insert: {
          id?: number;
          name: string;
        };
        Update: {
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: number;
          name: string;
        };
        Insert: {
          id?: number;
          name: string;
        };
        Update: {
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      fsrs_logs: {
        Row: {
          card_difficulty: number;
          card_stability: number;
          card_state: number;
          created_at: string | null;
          elapsed_days: number;
          id: number;
          log_data: Json;
          rating: number;
          review_date: string;
          root_id: number | null;
          scheduled_days: number;
          sentence_word_id: number | null;
          user_id: string;
        };
        Insert: {
          card_difficulty: number;
          card_stability: number;
          card_state: number;
          created_at?: string | null;
          elapsed_days: number;
          id?: number;
          log_data: Json;
          rating: number;
          review_date: string;
          root_id?: number | null;
          scheduled_days: number;
          sentence_word_id?: number | null;
          user_id: string;
        };
        Update: {
          card_difficulty?: number;
          card_stability?: number;
          card_state?: number;
          created_at?: string | null;
          elapsed_days?: number;
          id?: number;
          log_data?: Json;
          rating?: number;
          review_date?: string;
          root_id?: number | null;
          scheduled_days?: number;
          sentence_word_id?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fsrs_logs_root_id_fkey';
            columns: ['root_id'];
            isOneToOne: false;
            referencedRelation: 'roots';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fsrs_logs_sentence_word_id_fkey';
            columns: ['sentence_word_id'];
            isOneToOne: false;
            referencedRelation: 'sentence_words';
            referencedColumns: ['id'];
          },
        ];
      };
      reading_list: {
        Row: {
          added_at: string;
          article_id: number;
          user_id: string;
        };
        Insert: {
          added_at?: string;
          article_id: number;
          user_id: string;
        };
        Update: {
          added_at?: string;
          article_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reading_list_article_id_fkey';
            columns: ['article_id'];
            isOneToOne: false;
            referencedRelation: 'articles';
            referencedColumns: ['id'];
          },
        ];
      };
      reviews: {
        Row: {
          grade: number;
          id: number;
          reviewed_at: string;
          learning_steps: number | null;
          root_id: number | null;
          user_id: string;
        };
        Insert: {
          grade: number;
          id?: number;
          reviewed_at?: string;
          learning_steps?: number | null;
          root_id?: number | null;
          user_id: string;
        };
        Update: {
          grade?: number;
          id?: number;
          reviewed_at?: string;
          learning_steps?: number | null;
          root_id?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_root_id_fkey';
            columns: ['root_id'];
            isOneToOne: false;
            referencedRelation: 'roots';
            referencedColumns: ['id'];
          },
        ];
      };
      roots: {
        Row: {
          audio_url: string | null;
          audio_url_en: string | null;
          id: number;
          letters: string;
          meaning: string | null;
        };
        Insert: {
          audio_url?: string | null;
          audio_url_en?: string | null;
          id?: number;
          letters: string;
          meaning?: string | null;
        };
        Update: {
          audio_url?: string | null;
          audio_url_en?: string | null;
          id?: number;
          letters?: string;
          meaning?: string | null;
        };
        Relationships: [];
      };
      sentence_words: {
        Row: {
          audio_end: string | null;
          audio_start: string | null;
          difficulty_level: number;
          english: string;
          grammar_note: string | null;
          id: number;
          position: number;
          root_id: number;
          sentence_id: number;
          word_form: string;
          word_type_id: number;
        };
        Insert: {
          audio_end?: string | null;
          audio_start?: string | null;
          difficulty_level?: number;
          english: string;
          grammar_note?: string | null;
          id?: number;
          position: number;
          root_id: number;
          sentence_id: number;
          word_form: string;
          word_type_id: number;
        };
        Update: {
          audio_end?: string | null;
          audio_start?: string | null;
          difficulty_level?: number;
          english?: string;
          grammar_note?: string | null;
          id?: number;
          position?: number;
          root_id?: number;
          sentence_id?: number;
          word_form?: string;
          word_type_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'sentence_words_root_id_fkey';
            columns: ['root_id'];
            isOneToOne: false;
            referencedRelation: 'roots';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sentence_words_sentence_id_fkey';
            columns: ['sentence_id'];
            isOneToOne: false;
            referencedRelation: 'article_sentences';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sentence_words_word_type_id_fkey';
            columns: ['word_type_id'];
            isOneToOne: false;
            referencedRelation: 'word_types';
            referencedColumns: ['id'];
          },
        ];
      };
      study_words: {
        Row: {
          created_at: string;
          difficulty: number;
          ease_factor: number;
          failure_streak: number;
          fsrs_difficulty: number | null;
          fsrs_due: string | null;
          fsrs_elapsed_days: number | null;
          fsrs_lapses: number | null;
          fsrs_last_review: string | null;
          fsrs_reps: number | null;
          fsrs_learning_steps: number | null;
          fsrs_scheduled_days: number | null;
          fsrs_stability: number | null;
          fsrs_state: number | null;
          interval_days: number;
          lapses: number;
          next_review_at: string;
          previous_interval: number;
          review_count: number;
          root_id: number;
          stability: number;
          success_streak: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          difficulty?: number;
          ease_factor?: number;
          failure_streak?: number;
          fsrs_difficulty?: number | null;
          fsrs_due?: string | null;
          fsrs_elapsed_days?: number | null;
          fsrs_lapses?: number | null;
          fsrs_last_review?: string | null;
          fsrs_reps?: number | null;
          fsrs_learning_steps?: number | null;
          fsrs_scheduled_days?: number | null;
          fsrs_stability?: number | null;
          fsrs_state?: number | null;
          interval_days?: number;
          lapses?: number;
          next_review_at: string;
          previous_interval?: number;
          review_count?: number;
          root_id: number;
          stability?: number;
          success_streak?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          difficulty?: number;
          ease_factor?: number;
          failure_streak?: number;
          fsrs_difficulty?: number | null;
          fsrs_due?: string | null;
          fsrs_elapsed_days?: number | null;
          fsrs_lapses?: number | null;
          fsrs_last_review?: string | null;
          fsrs_reps?: number | null;
          fsrs_learning_steps?: number | null;
          fsrs_scheduled_days?: number | null;
          fsrs_stability?: number | null;
          fsrs_state?: number | null;
          interval_days?: number;
          lapses?: number;
          next_review_at?: string;
          previous_interval?: number;
          review_count?: number;
          root_id?: number;
          stability?: number;
          success_streak?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'study_words_root_id_fkey';
            columns: ['root_id'];
            isOneToOne: false;
            referencedRelation: 'roots';
            referencedColumns: ['id'];
          },
        ];
      };
      word_types: {
        Row: {
          id: number;
          name: string;
        };
        Insert: {
          id?: number;
          name: string;
        };
        Update: {
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_column_if_not_exists: {
        Args: { table_name: string; column_name: string; column_type: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
