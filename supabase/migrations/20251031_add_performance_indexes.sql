-- Performance Optimization: Add indexes for frequently queried columns
-- Date: 2025-10-31
-- Purpose: Improve query performance by 100x+ for filtered queries on large tables

-- ============================================================================
-- USER ID INDEXES - For fast filtering by user
-- ============================================================================

-- Reading progress: Filter by user_id
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id
  ON reading_progress(user_id);

-- Study words: Filter by user_id
CREATE INDEX IF NOT EXISTS idx_study_words_user_id
  ON study_words(user_id);

-- Study words: Composite index for user + due date (common query pattern)
CREATE INDEX IF NOT EXISTS idx_study_words_user_due
  ON study_words(user_id, fsrs_due);

-- ============================================================================
-- ARTICLE FILTERING INDEXES
-- ============================================================================

-- Articles: Filter by category_id
CREATE INDEX IF NOT EXISTS idx_articles_category_id
  ON articles(category_id);

-- Articles: Filter by author_id
CREATE INDEX IF NOT EXISTS idx_articles_author_id
  ON articles(author_id);

-- Articles: Filter by difficulty_level (for filtering)
CREATE INDEX IF NOT EXISTS idx_articles_difficulty
  ON articles(difficulty_level);

-- ============================================================================
-- COMPOSITE INDEXES - For multi-column queries
-- ============================================================================

-- Reading progress: Composite index for user + article lookups
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_article
  ON reading_progress(user_id, article_id);

-- Study words: Composite index for root + user lookups
CREATE INDEX IF NOT EXISTS idx_study_words_root_user
  ON study_words(root_id, user_id);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify indexes were created:
-- SELECT indexname, tablename FROM pg_indexes
-- WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;
