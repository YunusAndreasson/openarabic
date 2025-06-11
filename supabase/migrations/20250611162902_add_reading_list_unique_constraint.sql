DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reading_list_user_article_key'
  ) THEN
    ALTER TABLE public.reading_list
      ADD CONSTRAINT reading_list_user_article_key UNIQUE (user_id, article_id);
  END IF;
END $$;
