-- Fix progress_percentage calculation to account for 0-based indexing
-- last_sentence_read is a 0-based index, so we need to add 1 to get the count of sentences read
-- Example: article with 100 sentences (indices 0-99)
--   - User at index 99 (last sentence) should be 100% not 99%
--   - Formula: (last_sentence_read + 1) / total_sentences * 100

-- Drop the existing generated column
ALTER TABLE reading_progress
DROP COLUMN IF EXISTS progress_percentage;

-- Recreate with correct formula
ALTER TABLE reading_progress
ADD COLUMN progress_percentage INTEGER
GENERATED ALWAYS AS (
  CASE
    WHEN total_sentences > 0
    THEN ROUND(((last_sentence_read + 1.0) / total_sentences) * 100)
    ELSE 0
  END
) STORED;

-- Add index for efficient filtering by progress
CREATE INDEX IF NOT EXISTS idx_reading_progress_percentage
ON reading_progress(progress_percentage)
WHERE progress_percentage IS NOT NULL;

-- Update comment to clarify 0-based indexing
COMMENT ON COLUMN reading_progress.last_sentence_read IS
'0-based index of the last sentence the user read. Index 0 = first sentence, index (total_sentences-1) = last sentence';

COMMENT ON COLUMN reading_progress.progress_percentage IS
'Automatically calculated as ROUND(((last_sentence_read + 1) / total_sentences) * 100). Accounts for 0-based indexing of last_sentence_read.';
