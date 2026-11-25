-- Guests get the full reader (2026-11-25), so the grammatical type label in an article's
-- word embeds must resolve for anon too. word_types holds only (id, name): a public grammar
-- vocabulary with no learner or draft data. Writes stay revoked (20261031_lock_content_writes).
-- Applied to kkmnzbeugdoajtzfjkxg on 2026-11-25.
BEGIN;
DROP POLICY IF EXISTS "Anonymous read on word_types" ON public.word_types;
CREATE POLICY "Anonymous read on word_types"
  ON public.word_types FOR SELECT TO anon USING (true);
COMMIT;
