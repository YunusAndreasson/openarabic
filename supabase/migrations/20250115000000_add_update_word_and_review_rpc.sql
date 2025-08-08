-- Create RPC function to atomically update FSRS word and record review
CREATE OR REPLACE FUNCTION update_word_and_review(
  p_user_id UUID,
  p_root_id INTEGER,
  p_fsrs_due TIMESTAMPTZ,
  p_fsrs_stability REAL,
  p_fsrs_difficulty REAL,
  p_fsrs_elapsed_days INTEGER,
  p_fsrs_scheduled_days INTEGER,
  p_fsrs_learning_steps INTEGER,
  p_fsrs_reps INTEGER,
  p_fsrs_lapses INTEGER,
  p_fsrs_state INTEGER,
  p_fsrs_last_review TIMESTAMPTZ,
  p_rating INTEGER,
  p_learning_steps INTEGER,
  p_success_streak INTEGER DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  word_exists BOOLEAN := FALSE;
BEGIN
  -- Check if the study word exists and belongs to the user
  SELECT EXISTS(
    SELECT 1 FROM study_words
    WHERE user_id = p_user_id AND root_id = p_root_id
  ) INTO word_exists;

  IF NOT word_exists THEN
    RAISE EXCEPTION 'Study word not found or does not belong to user';
  END IF;

  -- Update the study word with FSRS parameters
  UPDATE study_words SET
    fsrs_due = p_fsrs_due,
    fsrs_stability = p_fsrs_stability,
    fsrs_difficulty = p_fsrs_difficulty,
    fsrs_elapsed_days = p_fsrs_elapsed_days,
    fsrs_scheduled_days = p_fsrs_scheduled_days,
    fsrs_learning_steps = p_fsrs_learning_steps,
    fsrs_reps = p_fsrs_reps,
    fsrs_lapses = p_fsrs_lapses,
    fsrs_state = p_fsrs_state,
    fsrs_last_review = p_fsrs_last_review,
    success_streak = COALESCE(p_success_streak, success_streak)
  WHERE user_id = p_user_id AND root_id = p_root_id;

  -- Record the review
  INSERT INTO reviews (
    user_id,
    root_id,
    grade,
    learning_steps,
    reviewed_at
  ) VALUES (
    p_user_id,
    p_root_id,
    p_rating,
    p_learning_steps,
    NOW()
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise the exception to ensure transaction rollback
    RAISE;
END;
$$;
