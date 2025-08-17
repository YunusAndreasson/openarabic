-- Remove audio timing columns from sentence_words table
-- These columns are no longer needed since we removed word-level timing functionality

ALTER TABLE sentence_words DROP COLUMN IF EXISTS audio_start;
ALTER TABLE sentence_words DROP COLUMN IF EXISTS audio_end;

-- Add comment to document the change
COMMENT ON TABLE sentence_words IS 'Sentence words without audio timing data - simplified for performance';
