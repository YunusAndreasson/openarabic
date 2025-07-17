export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      article_sentences: {
        Row: {
          arabic: string
          article_id: number
          audio_url: string | null
          english: string
          id: number
          position: number
        }
        Insert: {
          arabic: string
          article_id: number
          audio_url?: string | null
          english: string
          id?: number
          position: number
        }
        Update: {
          arabic?: string
          article_id?: number
          audio_url?: string | null
          english?: string
          id?: number
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "article_sentences_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          audio_url: string | null
          author_id: number
          category_id: number
          content_hash: string | null
          created_at: string
          difficulty_level: number
          id: number
          image_url: string | null
          summary: string | null
          title: string
        }
        Insert: {
          audio_url?: string | null
          author_id: number
          category_id: number
          content_hash?: string | null
          created_at?: string
          difficulty_level: number
          id?: number
          image_url?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          audio_url?: string | null
          author_id?: number
          category_id?: number
          content_hash?: string | null
          created_at?: string
          difficulty_level?: number
          id?: number
          image_url?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      authors: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      reading_list: {
        Row: {
          added_at: string
          article_id: number
          category_id: number | null
          user_id: string
        }
        Insert: {
          added_at?: string
          article_id: number
          category_id?: number | null
          user_id: string
        }
        Update: {
          added_at?: string
          article_id?: number
          category_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_list_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_progress: {
        Row: {
          article_id: number
          created_at: string | null
          last_sentence_read: number
          progress_percentage: number | null
          total_sentences: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          article_id: number
          created_at?: string | null
          last_sentence_read?: number
          progress_percentage?: number | null
          total_sentences: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          article_id?: number
          created_at?: string | null
          last_sentence_read?: number
          progress_percentage?: number | null
          total_sentences?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          grade: number
          id: number
          learning_steps: number | null
          reviewed_at: string
          root_id: number | null
          user_id: string
        }
        Insert: {
          grade: number
          id?: number
          learning_steps?: number | null
          reviewed_at?: string
          root_id?: number | null
          user_id: string
        }
        Update: {
          grade?: number
          id?: number
          learning_steps?: number | null
          reviewed_at?: string
          root_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_root_id_fkey"
            columns: ["root_id"]
            isOneToOne: false
            referencedRelation: "roots"
            referencedColumns: ["id"]
          },
        ]
      }
      roots: {
        Row: {
          audio_url: string | null
          audio_url_en: string | null
          id: number
          letters: string
          meaning: string | null
        }
        Insert: {
          audio_url?: string | null
          audio_url_en?: string | null
          id?: number
          letters: string
          meaning?: string | null
        }
        Update: {
          audio_url?: string | null
          audio_url_en?: string | null
          id?: number
          letters?: string
          meaning?: string | null
        }
        Relationships: []
      }
      sentence_words: {
        Row: {
          audio_end: string | null
          audio_start: string | null
          difficulty_level: number
          english: string
          grammar_note: string | null
          id: number
          position: number
          root_id: number
          sentence_id: number
          word_form: string
          word_type_id: number
        }
        Insert: {
          audio_end?: string | null
          audio_start?: string | null
          difficulty_level?: number
          english: string
          grammar_note?: string | null
          id?: number
          position: number
          root_id: number
          sentence_id: number
          word_form: string
          word_type_id: number
        }
        Update: {
          audio_end?: string | null
          audio_start?: string | null
          difficulty_level?: number
          english?: string
          grammar_note?: string | null
          id?: number
          position?: number
          root_id?: number
          sentence_id?: number
          word_form?: string
          word_type_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "sentence_words_root_id_fkey"
            columns: ["root_id"]
            isOneToOne: false
            referencedRelation: "roots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sentence_words_sentence_id_fkey"
            columns: ["sentence_id"]
            isOneToOne: false
            referencedRelation: "article_sentences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sentence_words_word_type_id_fkey"
            columns: ["word_type_id"]
            isOneToOne: false
            referencedRelation: "word_types"
            referencedColumns: ["id"]
          },
        ]
      }
      study_words: {
        Row: {
          created_at: string
          difficulty: number
          fsrs_difficulty: number | null
          fsrs_due: string | null
          fsrs_elapsed_days: number | null
          fsrs_lapses: number | null
          fsrs_last_review: string | null
          fsrs_learning_steps: number | null
          fsrs_reps: number | null
          fsrs_scheduled_days: number | null
          fsrs_stability: number | null
          fsrs_state: number | null
          root_id: number
          success_streak: number
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: number
          fsrs_difficulty?: number | null
          fsrs_due?: string | null
          fsrs_elapsed_days?: number | null
          fsrs_lapses?: number | null
          fsrs_last_review?: string | null
          fsrs_learning_steps?: number | null
          fsrs_reps?: number | null
          fsrs_scheduled_days?: number | null
          fsrs_stability?: number | null
          fsrs_state?: number | null
          root_id: number
          success_streak?: number
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: number
          fsrs_difficulty?: number | null
          fsrs_due?: string | null
          fsrs_elapsed_days?: number | null
          fsrs_lapses?: number | null
          fsrs_last_review?: string | null
          fsrs_learning_steps?: number | null
          fsrs_reps?: number | null
          fsrs_scheduled_days?: number | null
          fsrs_stability?: number | null
          fsrs_state?: number | null
          root_id?: number
          success_streak?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_words_root_id_fkey"
            columns: ["root_id"]
            isOneToOne: false
            referencedRelation: "roots"
            referencedColumns: ["id"]
          },
        ]
      }
      word_types: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      daily_efficiency_stats: {
        Row: {
          avg_efficiency: number | null
          date: string | null
          user_id: string | null
          words_reviewed: number | null
        }
        Relationships: []
      }
      daily_mastery_stats: {
        Row: {
          cumulative_mastered: number | null
          cumulative_words: number | null
          date: string | null
          user_id: string | null
        }
        Relationships: []
      }
      difficulty_distribution: {
        Row: {
          easy_percentage: number | null
          easy_words: number | null
          hard_percentage: number | null
          hard_words: number | null
          medium_percentage: number | null
          medium_words: number | null
          total_words: number | null
          user_id: string | null
        }
        Relationships: []
      }
      retrievability_forecast: {
        Row: {
          avg_retrievability_percent: number | null
          critical_words: number | null
          forecast_date: string | null
          urgent_words: number | null
          user_id: string | null
          word_count: number | null
        }
        Relationships: []
      }
      user_study_stats: {
        Row: {
          avg_difficulty: number | null
          avg_stability: number | null
          due_words: number | null
          learning_words: number | null
          mastered_words: number | null
          total_words: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_column_if_not_exists: {
        Args: { table_name: string; column_name: string; column_type: string }
        Returns: undefined
      }
      get_bookmark_categories_with_counts: {
        Args: { user_id_param: string }
        Returns: {
          id: number
          user_id: string
          name: string
          color: string
          icon: string
          position: number
          created_at: string
          updated_at: string
          article_count: number
          due_word_count: number
        }[]
      }
      update_word_and_review: {
        Args: {
          p_user_id: string
          p_root_id: number
          p_fsrs_due: string
          p_fsrs_stability: number
          p_fsrs_difficulty: number
          p_fsrs_elapsed_days: number
          p_fsrs_scheduled_days: number
          p_fsrs_learning_steps: number
          p_fsrs_reps: number
          p_fsrs_lapses: number
          p_fsrs_state: number
          p_fsrs_last_review: string
          p_rating: number
          p_learning_steps: number
          p_success_streak?: number
          p_difficulty?: number
        }
        Returns: boolean
      }
      upsert_reading_progress: {
        Args: {
          p_user_id: string
          p_article_id: number
          p_last_sentence_read: number
          p_total_sentences: number
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
