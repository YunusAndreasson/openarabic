import { createEmptyCard, fsrs, generatorParameters, Rating } from 'ts-fsrs';

import {
  EASY_DIFFICULTY_ADJUSTMENT,
  EASY_STABILITY_MULTIPLIER,
  EASY_LAPSE_DECREMENT,
  HARD_DIFFICULTY_ADJUSTMENT,
  HARD_STABILITY_MULTIPLIER,
  HARD_LAPSE_INCREMENT,
  SKIP_FOR_TODAY_DUE_HOUR,
} from '@/constants/fsrs';

import type { TablesUpdate } from '@/types/database.types';
import type { StudyWord } from '@/types/vocabulary.types';

import { supabase, checkAuthentication } from './supabase';

/**
 * Service for managing study words with FSRS-specific operations
 * Provides contextual word management actions during study sessions
 */
export const wordManagementService = {
  /**
   * Remove a word from study entirely
   */
  async removeFromStudy(userId: string, rootId: number): Promise<void> {
    await checkAuthentication(userId);

    const { error } = await supabase
      .from('study_words')
      .delete()
      .eq('user_id', userId)
      .eq('root_id', rootId);

    if (error) {
      throw error;
    }
  },

  /**
   * Reset FSRS progress for a word (start fresh)
   */
  async resetProgress(userId: string, rootId: number): Promise<void> {
    await checkAuthentication(userId);

    const now = new Date();
    const emptyCard = createEmptyCard(now);

    const resetData: TablesUpdate<'study_words'> = {
      difficulty: emptyCard.difficulty / 10.0, // Normalize to 0-1 scale
      success_streak: 0,
      fsrs_due: now.toISOString(),
      fsrs_stability: emptyCard.stability,
      fsrs_difficulty: emptyCard.difficulty,
      fsrs_elapsed_days: emptyCard.elapsed_days,
      fsrs_scheduled_days: emptyCard.scheduled_days,
      fsrs_learning_steps: emptyCard.learning_steps,
      fsrs_reps: emptyCard.reps,
      fsrs_lapses: emptyCard.lapses,
      fsrs_state: emptyCard.state,
      fsrs_last_review: null,
    };

    const { error } = await supabase
      .from('study_words')
      .update(resetData)
      .eq('user_id', userId)
      .eq('root_id', rootId);

    if (error) {
      throw error;
    }
  },

  /**
   * Mark a word as easier (reduce difficulty and increase stability)
   */
  async markAsEasy(userId: string, word: StudyWord): Promise<void> {
    await checkAuthentication(userId);

    const fsrsInstance = fsrs(generatorParameters());
    const now = new Date();

    // Convert current word to FSRS card
    const currentCard = {
      due: word.fsrs_due ? new Date(word.fsrs_due) : now,
      stability: word.fsrs_stability ?? 0,
      difficulty: word.fsrs_difficulty ?? 6.5,
      elapsed_days: word.fsrs_elapsed_days ?? 0,
      scheduled_days: word.fsrs_scheduled_days ?? 0,
      learning_steps: word.fsrs_learning_steps ?? 0,
      reps: word.fsrs_reps ?? 0,
      lapses: word.fsrs_lapses ?? 0,
      state: word.fsrs_state ?? 0,
      last_review: word.fsrs_last_review ? new Date(word.fsrs_last_review) : undefined,
    };

    // Apply "Good" rating to make it easier
    const { card: newCard } = fsrsInstance.next(currentCard, now, Rating.Good);

    // Further adjust to make it even easier
    const adjustedCard = {
      ...newCard,
      difficulty: Math.max(1, newCard.difficulty - EASY_DIFFICULTY_ADJUSTMENT),
      stability: newCard.stability * EASY_STABILITY_MULTIPLIER,
    };

    const updateData: TablesUpdate<'study_words'> = {
      fsrs_due: adjustedCard.due.toISOString(),
      fsrs_stability: adjustedCard.stability,
      fsrs_difficulty: adjustedCard.difficulty,
      fsrs_elapsed_days: adjustedCard.elapsed_days,
      fsrs_scheduled_days: adjustedCard.scheduled_days,
      fsrs_reps: adjustedCard.reps,
      fsrs_learning_steps: adjustedCard.learning_steps,
      fsrs_lapses: Math.max(0, adjustedCard.lapses - EASY_LAPSE_DECREMENT),
      fsrs_state: adjustedCard.state,
      fsrs_last_review: now.toISOString(),
    };

    const { error } = await supabase
      .from('study_words')
      .update(updateData)
      .eq('user_id', userId)
      .eq('root_id', word.root_id);

    if (error) {
      throw error;
    }
  },

  /**
   * Mark a word as harder (increase difficulty and reduce stability)
   */
  async markAsHard(userId: string, word: StudyWord): Promise<void> {
    await checkAuthentication(userId);

    const fsrsInstance = fsrs(generatorParameters());
    const now = new Date();

    // Convert current word to FSRS card
    const currentCard = {
      due: word.fsrs_due ? new Date(word.fsrs_due) : now,
      stability: word.fsrs_stability ?? 0,
      difficulty: word.fsrs_difficulty ?? 6.5,
      elapsed_days: word.fsrs_elapsed_days ?? 0,
      scheduled_days: word.fsrs_scheduled_days ?? 0,
      learning_steps: word.fsrs_learning_steps ?? 0,
      reps: word.fsrs_reps ?? 0,
      lapses: word.fsrs_lapses ?? 0,
      state: word.fsrs_state ?? 0,
      last_review: word.fsrs_last_review ? new Date(word.fsrs_last_review) : undefined,
    };

    // Apply "Again" rating to make it harder
    const { card: newCard } = fsrsInstance.next(currentCard, now, Rating.Again);

    // Further adjust to make it harder
    const adjustedCard = {
      ...newCard,
      difficulty: Math.min(10, newCard.difficulty + HARD_DIFFICULTY_ADJUSTMENT),
      stability: newCard.stability * HARD_STABILITY_MULTIPLIER,
      due: now, // Make it due immediately
    };

    const updateData: TablesUpdate<'study_words'> = {
      fsrs_due: adjustedCard.due.toISOString(),
      fsrs_stability: adjustedCard.stability,
      fsrs_difficulty: adjustedCard.difficulty,
      fsrs_elapsed_days: adjustedCard.elapsed_days,
      fsrs_scheduled_days: adjustedCard.scheduled_days,
      fsrs_reps: adjustedCard.reps,
      fsrs_learning_steps: adjustedCard.learning_steps,
      fsrs_lapses: adjustedCard.lapses + HARD_LAPSE_INCREMENT,
      fsrs_state: adjustedCard.state,
      fsrs_last_review: now.toISOString(),
    };

    const { error } = await supabase
      .from('study_words')
      .update(updateData)
      .eq('user_id', userId)
      .eq('root_id', word.root_id);

    if (error) {
      throw error;
    }
  },

  /**
   * Skip a word for the current session (set due date to tomorrow)
   */
  async skipForToday(userId: string, rootId: number): Promise<void> {
    await checkAuthentication(userId);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(SKIP_FOR_TODAY_DUE_HOUR, 0, 0, 0);

    const updateData: TablesUpdate<'study_words'> = {
      fsrs_due: tomorrow.toISOString(),
    };

    const { error } = await supabase
      .from('study_words')
      .update(updateData)
      .eq('user_id', userId)
      .eq('root_id', rootId);

    if (error) {
      throw error;
    }
  },
};
