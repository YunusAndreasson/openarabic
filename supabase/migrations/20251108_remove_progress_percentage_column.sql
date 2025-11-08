-- Remove progress_percentage column from reading_progress table
-- Progress percentage is now calculated in application code for better maintainability

-- Drop the index first
DROP INDEX IF EXISTS idx_reading_progress_percentage;

-- Drop the generated column
ALTER TABLE reading_progress
DROP COLUMN IF EXISTS progress_percentage;

-- Update comment to clarify that percentage is calculated in code
COMMENT ON TABLE reading_progress IS
'Stores reading progress for articles. Progress percentage is calculated in application code using: ROUND(((last_sentence_read + 1) / total_sentences) * 100)';
