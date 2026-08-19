-- Prevent out-of-order client requests from moving reading progress backwards.
--
-- The article's length is read from `article_sentences` rather than taken from
-- the caller. The client is not a reliable source for it: measured on this
-- database, 331 of 7,564 `reading_progress` rows (4.4%) carry a
-- `total_sentences` that disagrees with the real sentence count, and every
-- single one is 1-5 too SMALL — never too large. Clients under-report, most
-- likely from saving while the article is still streaming in.
--
-- That matters because the end-of-article clamp below is expressed in terms of
-- the total. Trusting the caller's figure would turn each of those under-reports
-- into a rewind: a reader at sentence 49 of 50 whose client posts a total of 45
-- would be clamped back to 44, silently, on an ordinary scroll-triggered save.
-- Reading position is not recoverable once overwritten, so the clamp has to be
-- measured against the server's count.
--
-- Deriving it server-side also keeps the legitimate case working: if an article
-- genuinely loses sentences, the count drops with it and a stored position past
-- the new end is corrected on the next save.
CREATE OR REPLACE FUNCTION public.update_reading_progress_monotonic(
  p_user_id uuid,
  p_article_id bigint,
  p_last_sentence_read integer,
  -- Advisory only. Used solely as a fallback for an article that has no
  -- `article_sentences` rows, so a caller cannot shorten an article that does.
  p_total_sentences integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_total integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'user_id must match the authenticated user';
  END IF;

  IF p_article_id <= 0 OR p_last_sentence_read < 0 THEN
    RAISE EXCEPTION 'invalid reading progress';
  END IF;

  -- Index-only scan on idx_article_sentences_article_position.
  SELECT count(*)::integer
    INTO v_total
    FROM public.article_sentences
   WHERE article_id = p_article_id;

  IF v_total IS NULL OR v_total <= 0 THEN
    v_total := p_total_sentences;
  END IF;

  IF v_total IS NULL OR v_total <= 0 THEN
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
    LEAST(p_last_sentence_read, v_total - 1),
    v_total,
    now()
  )
  ON CONFLICT (user_id, article_id) DO UPDATE
  SET
    -- Monotonic: the furthest point reached wins, then clamped to the article's
    -- real last index. EXCLUDED.total_sentences is the server's count, so this
    -- clamp can no longer be driven down by the caller.
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
