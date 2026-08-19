-- Prevent out-of-order client requests from moving reading progress backwards.
-- The clamp still permits a legitimate correction when an article becomes
-- shorter and the previously stored sentence no longer exists.
CREATE OR REPLACE FUNCTION public.update_reading_progress_monotonic(
  p_user_id uuid,
  p_article_id bigint,
  p_last_sentence_read integer,
  p_total_sentences integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'user_id must match the authenticated user';
  END IF;

  IF p_article_id <= 0 OR p_last_sentence_read < 0 OR p_total_sentences <= 0 THEN
    RAISE EXCEPTION 'invalid reading progress';
  END IF;

  INSERT INTO public.reading_progress (
    user_id,
    article_id,
    last_sentence_read,
    total_sentences,
    updated_at
  )
  VALUES (
    p_user_id,
    p_article_id,
    LEAST(p_last_sentence_read, p_total_sentences - 1),
    p_total_sentences,
    now()
  )
  ON CONFLICT (user_id, article_id) DO UPDATE
  SET
    last_sentence_read = LEAST(
      GREATEST(reading_progress.last_sentence_read, EXCLUDED.last_sentence_read),
      EXCLUDED.total_sentences - 1
    ),
    total_sentences = EXCLUDED.total_sentences,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.update_reading_progress_monotonic(uuid, bigint, integer, integer)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_reading_progress_monotonic(uuid, bigint, integer, integer)
  TO authenticated;
