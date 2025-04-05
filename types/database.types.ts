/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      article_sentences: {
        Row: {
          arabic: string;
          article_id: number;
          english: string;
          id: number;
          position: number;
        };
        Insert: {
          arabic: string;
          article_id: number;
          english: string;
          id?: number;
          position: number;
        };
        Update: {
          arabic?: string;
          article_id?: number;
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
          scheduled_days: number;
          sentence_word_id: number;
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
          scheduled_days: number;
          sentence_word_id: number;
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
          scheduled_days?: number;
          sentence_word_id?: number;
          user_id?: string;
        };
        Relationships: [
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
          completed: boolean;
          completed_at: string | null;
          position: number;
          read_count: number;
          user_id: string;
        };
        Insert: {
          added_at?: string;
          article_id: number;
          completed?: boolean;
          completed_at?: string | null;
          position: number;
          read_count?: number;
          user_id: string;
        };
        Update: {
          added_at?: string;
          article_id?: number;
          completed?: boolean;
          completed_at?: string | null;
          position?: number;
          read_count?: number;
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
          sentence_word_id: number;
          user_id: string;
        };
        Insert: {
          grade: number;
          id?: number;
          reviewed_at?: string;
          sentence_word_id: number;
          user_id: string;
        };
        Update: {
          grade?: number;
          id?: number;
          reviewed_at?: string;
          sentence_word_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_study_word_fkey';
            columns: ['user_id', 'sentence_word_id'];
            isOneToOne: false;
            referencedRelation: 'study_words';
            referencedColumns: ['user_id', 'sentence_word_id'];
          },
        ];
      };
      roots: {
        Row: {
          id: number;
          letters: string;
          meaning: string | null;
        };
        Insert: {
          id?: number;
          letters: string;
          meaning?: string | null;
        };
        Update: {
          id?: number;
          letters?: string;
          meaning?: string | null;
        };
        Relationships: [];
      };
      sentence_words: {
        Row: {
          audio_url: string | null;
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
          audio_url?: string | null;
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
          audio_url?: string | null;
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
          fsrs_scheduled_days: number | null;
          fsrs_stability: number | null;
          fsrs_state: number | null;
          interval_days: number;
          lapses: number;
          next_review_at: string;
          previous_interval: number;
          review_count: number;
          sentence_word_id: number;
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
          fsrs_scheduled_days?: number | null;
          fsrs_stability?: number | null;
          fsrs_state?: number | null;
          interval_days?: number;
          lapses?: number;
          next_review_at: string;
          previous_interval?: number;
          review_count?: number;
          sentence_word_id: number;
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
          fsrs_scheduled_days?: number | null;
          fsrs_stability?: number | null;
          fsrs_state?: number | null;
          interval_days?: number;
          lapses?: number;
          next_review_at?: string;
          previous_interval?: number;
          review_count?: number;
          sentence_word_id?: number;
          stability?: number;
          success_streak?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'study_words_sentence_word_id_fkey';
            columns: ['sentence_word_id'];
            isOneToOne: false;
            referencedRelation: 'sentence_words';
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
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    ? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema['Enums'] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes']
    ? PublicSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;
