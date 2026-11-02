-- ROLLBACK for 20261031_lock_content_writes.sql
-- Date: 2026-10-31
-- WARNING: this REOPENS public write access. Use only if the migration breaks
-- something that cannot be fixed forward, and re-apply as soon as possible.
--
-- Generated from pg_policies as recorded 2026-10-31 ~11:45 CET. If the preflight
-- reported drift before the migration ran, reconcile that drift here too.
-- Deliberately has no numeric prefix, so the Supabase CLI skips this file and it
-- can never run as a migration by accident.

BEGIN;

-- Policies the migration added
DROP POLICY IF EXISTS "Public read on roots" ON public.roots;
DROP POLICY IF EXISTS "Authenticated read on word_types" ON public.word_types;
DROP POLICY IF EXISTS "Public read on translation_improvements" ON public.translation_improvements;
DROP POLICY IF EXISTS "Public read on root_translation_improvements" ON public.root_translation_improvements;

-- Policies the migration dropped, exactly as recorded
DROP POLICY IF EXISTS "Allow role to update" ON public.articles;
CREATE POLICY "Allow role to update" ON public.articles AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.article_sentences;
CREATE POLICY "Allow all for authenticated users" ON public.article_sentences AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon delete on article_sentences" ON public.article_sentences;
CREATE POLICY "Allow anon delete on article_sentences" ON public.article_sentences AS PERMISSIVE FOR DELETE TO anon
  USING (true);
DROP POLICY IF EXISTS "Allow insert for pipeline" ON public.article_sentences;
CREATE POLICY "Allow insert for pipeline" ON public.article_sentences AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update for pipeline" ON public.article_sentences;
CREATE POLICY "Allow update for pipeline" ON public.article_sentences AS PERMISSIVE FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.sentence_words;
CREATE POLICY "Allow all for authenticated users" ON public.sentence_words AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon delete on sentence_words" ON public.sentence_words;
CREATE POLICY "Allow anon delete on sentence_words" ON public.sentence_words AS PERMISSIVE FOR DELETE TO anon
  USING (true);
DROP POLICY IF EXISTS "Allow insert for pipeline" ON public.sentence_words;
CREATE POLICY "Allow insert for pipeline" ON public.sentence_words AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);
DROP POLICY IF EXISTS "allow_updates" ON public.sentence_words;
CREATE POLICY "allow_updates" ON public.sentence_words AS PERMISSIVE FOR UPDATE TO public
  USING (true);
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.categories;
CREATE POLICY "Allow all for authenticated users" ON public.categories AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.roots;
CREATE POLICY "Allow all for authenticated users" ON public.roots AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow for service" ON public.roots;
CREATE POLICY "Allow for service" ON public.roots AS PERMISSIVE FOR ALL TO public
  USING (true);
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.word_types;
CREATE POLICY "Allow all for authenticated users" ON public.word_types AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations on translation_improvements" ON public.translation_improvements;
CREATE POLICY "Allow all operations on translation_improvements" ON public.translation_improvements AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations on root_translation_improvements" ON public.root_translation_improvements;
CREATE POLICY "Allow all operations on root_translation_improvements" ON public.root_translation_improvements AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon to update images" ON storage.objects;
CREATE POLICY "Allow anon to update images" ON storage.objects AS PERMISSIVE FOR UPDATE TO anon
  USING ((bucket_id = 'images'::text))
  WITH CHECK ((bucket_id = 'images'::text));
DROP POLICY IF EXISTS "Allow anon to upload images" ON storage.objects;
CREATE POLICY "Allow anon to upload images" ON storage.objects AS PERMISSIVE FOR INSERT TO anon
  WITH CHECK ((bucket_id = 'images'::text));
DROP POLICY IF EXISTS "Allow anonymous uploads to batch_scheduled" ON storage.objects;
CREATE POLICY "Allow anonymous uploads to batch_scheduled" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((bucket_id = 'batch_scheduled'::text));
DROP POLICY IF EXISTS "Allow authenticated uploads to audio" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to audio" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((bucket_id = 'audio'::text));
DROP POLICY IF EXISTS "Allow authenticated users to upload images" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload images" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'images'::text) AND (owner = auth.uid())));
DROP POLICY IF EXISTS "Allow users to delete their own audio" ON storage.objects;
CREATE POLICY "Allow users to delete their own audio" ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'audio'::text) AND (owner = auth.uid())));
DROP POLICY IF EXISTS "Allow users to delete their own images" ON storage.objects;
CREATE POLICY "Allow users to delete their own images" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'images'::text) AND (owner = auth.uid())));
DROP POLICY IF EXISTS "Allow users to update their own audio" ON storage.objects;
CREATE POLICY "Allow users to update their own audio" ON storage.objects AS PERMISSIVE FOR UPDATE TO public
  USING (((bucket_id = 'audio'::text) AND (owner = auth.uid())))
  WITH CHECK (((bucket_id = 'audio'::text) AND (owner = auth.uid())));
DROP POLICY IF EXISTS "Allow users to update their own images" ON storage.objects;
CREATE POLICY "Allow users to update their own images" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'images'::text) AND (owner = auth.uid())))
  WITH CHECK (((bucket_id = 'images'::text) AND (owner = auth.uid())));
DROP POLICY IF EXISTS "service account audio full access" ON storage.objects;
CREATE POLICY "service account audio full access" ON storage.objects AS PERMISSIVE FOR ALL TO public
  USING ((bucket_id = 'audio'::text))
  WITH CHECK ((bucket_id = 'audio'::text));

-- Privileges as recorded: anon and authenticated held arwdDxt on every table
GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.articles,
  public.article_sentences,
  public.sentence_words,
  public.roots,
  public.authors,
  public.categories,
  public.word_types,
  public.root_enrichment,
  public.translation_improvements,
  public.root_translation_improvements
TO anon, authenticated;

GRANT USAGE, UPDATE ON SEQUENCE
  public.articles_id_seq,
  public.article_sentences_id_seq,
  public.sentence_words_id_seq,
  public.roots_id_seq,
  public.authors_id_seq,
  public.categories_id_seq,
  public.word_types_id_seq,
  public.translation_improvements_id_seq,
  public.root_translation_improvements_id_seq
TO anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES
  TO anon, authenticated;

COMMIT;
