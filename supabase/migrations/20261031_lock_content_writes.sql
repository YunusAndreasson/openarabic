-- Lock Content Writes
-- Date: 2026-10-31
-- Purpose: Remove write access for the public (anon) and generic signed-in
--          (authenticated) roles from content tables and storage buckets. Public
--          reads stay. Content is written with the service role only, which
--          bypasses RLS and is unaffected by the policies and revokes below.
--
-- NOT APPLIED. Written from a snapshot of pg_policies taken 2026-10-31 ~11:45 CET.
-- Before applying: run preflight_20261031_lock_content_writes.sql and resolve drift.
-- Afterwards: run verify_20261031_lock_content_writes.sql.
-- Undo: rollback_20261031_lock_content_writes.sql (this reopens the hole).
-- Apply from the SQL editor. Do not use `supabase db push`: the 8-digit local file
-- names do not line up with the 14-digit remote migration history.
--
-- User-owned tables (study_words, reading_progress, reading_list,
-- voice_grading_attempts) are deliberately not touched.
--
-- Idempotent, and all-or-nothing: the checks at the end abort the transaction if
-- any write path survives, including a policy added after the snapshot.

BEGIN;

-- ============================================================================
-- CONTENT TABLES: DROP WRITE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Allow role to update" ON public.articles;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.article_sentences;
DROP POLICY IF EXISTS "Allow anon delete on article_sentences" ON public.article_sentences;
DROP POLICY IF EXISTS "Allow insert for pipeline" ON public.article_sentences;
DROP POLICY IF EXISTS "Allow update for pipeline" ON public.article_sentences;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.sentence_words;
DROP POLICY IF EXISTS "Allow anon delete on sentence_words" ON public.sentence_words;
DROP POLICY IF EXISTS "Allow insert for pipeline" ON public.sentence_words;
DROP POLICY IF EXISTS "allow_updates" ON public.sentence_words;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.categories;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.roots;
DROP POLICY IF EXISTS "Allow for service" ON public.roots;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.word_types;

DROP POLICY IF EXISTS "Allow all operations on translation_improvements" ON public.translation_improvements;
DROP POLICY IF EXISTS "Allow all operations on root_translation_improvements" ON public.root_translation_improvements;

-- ============================================================================
-- CONTENT TABLES: KEEP READS THAT ONLY THE DROPPED POLICIES WERE GRANTING
-- ============================================================================
-- These tables had no separate SELECT policy: their ALL policies were also what
-- allowed reading. Without these, the app's dictionary and word types would go
-- empty with no error, because RLS filters rows instead of raising.

DROP POLICY IF EXISTS "Public read on roots" ON public.roots;
CREATE POLICY "Public read on roots"
  ON public.roots FOR SELECT TO public USING (true);

-- Signed-in only, matching today: anon has never been able to read word_types.
-- Widening that would change what logged-out pages render, so it is left alone.
DROP POLICY IF EXISTS "Authenticated read on word_types" ON public.word_types;
CREATE POLICY "Authenticated read on word_types"
  ON public.word_types FOR SELECT TO authenticated USING (true);

-- The admin review pages read these through the public client.
DROP POLICY IF EXISTS "Public read on translation_improvements" ON public.translation_improvements;
CREATE POLICY "Public read on translation_improvements"
  ON public.translation_improvements FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public read on root_translation_improvements" ON public.root_translation_improvements;
CREATE POLICY "Public read on root_translation_improvements"
  ON public.root_translation_improvements FOR SELECT TO public USING (true);

-- ============================================================================
-- CONTENT TABLES: REVOKE WRITE PRIVILEGES
-- ============================================================================
-- A second layer beside RLS, and it changes how a refused write looks: without
-- the privilege the caller gets a permission error, where an RLS-filtered UPDATE
-- or DELETE reports success on zero rows. It also removes these tables from the
-- GraphQL mutation schema. TRUNCATE is not subject to RLS at all.
-- authors and root_enrichment have no write policy, only these privileges.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE
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
FROM anon, authenticated;

-- voice_grading_attempts_id_seq is left alone: signed-in users insert into that table.
REVOKE USAGE, UPDATE ON SEQUENCE
  public.articles_id_seq,
  public.article_sentences_id_seq,
  public.sentence_words_id_seq,
  public.roots_id_seq,
  public.authors_id_seq,
  public.categories_id_seq,
  public.word_types_id_seq,
  public.translation_improvements_id_seq,
  public.root_translation_improvements_id_seq
FROM anon, authenticated;

-- ============================================================================
-- FUTURE TABLES
-- ============================================================================
-- New tables made by postgres no longer hand write access to anon/authenticated.
-- A future user-owned table must now say so itself:
--   GRANT INSERT, UPDATE, DELETE ON public.<table> TO authenticated;
-- SELECT stays in the default, so a new table without RLS is still world-readable.
-- Sequence and function defaults are unchanged. Objects made by supabase_admin
-- keep their own defaults, which the postgres role cannot alter.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES
  FROM anon, authenticated;

-- ============================================================================
-- STORAGE
-- ============================================================================
-- storage.objects is owned by supabase_storage_admin, so there is nothing to
-- revoke here; policies are the control. Reads stay ("Allow public read access
-- to ..."), and the service_role policies stay. The "their own" policies go too:
-- anyone signed in could create objects they own in a public bucket.

DROP POLICY IF EXISTS "Allow anon to update images" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon to upload images" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous uploads to batch_scheduled" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own images" ON storage.objects;
DROP POLICY IF EXISTS "service account audio full access" ON storage.objects;

-- ============================================================================
-- POST-CONDITIONS: ABORT THE WHOLE TRANSACTION IF A WRITE PATH SURVIVES
-- ============================================================================

DO $$
DECLARE
  content_tables text[] := ARRAY[
    'articles', 'article_sentences', 'sentence_words', 'roots', 'authors',
    'categories', 'word_types', 'root_enrichment', 'translation_improvements',
    'root_translation_improvements'
  ];
  problem text;
BEGIN
  SELECT string_agg(schemaname || '.' || tablename || ': ' || policyname, ', ')
    INTO problem
    FROM pg_policies
   WHERE cmd <> 'SELECT'
     AND roles <> ARRAY['service_role']::name[]
     AND (
       (schemaname = 'public' AND tablename = ANY (content_tables))
       OR (schemaname = 'storage' AND tablename = 'objects')
     );
  IF problem IS NOT NULL THEN
    RAISE EXCEPTION 'write policies remain: %', problem;
  END IF;

  SELECT string_agg(r.rolname || ' on ' || t, ', ')
    INTO problem
    FROM unnest(content_tables) AS t
   CROSS JOIN (VALUES ('anon'), ('authenticated')) AS r(rolname)
   WHERE has_table_privilege(
     r.rolname, format('public.%I', t), 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
   );
  IF problem IS NOT NULL THEN
    RAISE EXCEPTION 'write privileges remain: %', problem;
  END IF;

  SELECT string_agg(t, ', ')
    INTO problem
    FROM unnest(content_tables) AS t
   WHERE NOT EXISTS (
     SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = t AND p.cmd IN ('SELECT', 'ALL')
   )
      OR NOT has_table_privilege('authenticated', format('public.%I', t), 'SELECT')
      OR NOT (SELECT c.relrowsecurity FROM pg_class c WHERE c.oid = format('public.%I', t)::regclass);
  IF problem IS NOT NULL THEN
    RAISE EXCEPTION 'read access or RLS is wrong on: %', problem;
  END IF;
END
$$;

COMMIT;
