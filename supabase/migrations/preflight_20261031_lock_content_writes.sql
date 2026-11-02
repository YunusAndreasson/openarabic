-- PREFLIGHT for 20261031_lock_content_writes.sql. REQUIRED, and READ ONLY.
-- Run immediately before applying. Compares the live database with the snapshot
-- the migration and rollback were written from (2026-10-31 ~11:45 CET).
-- Zero rows: no drift, safe to go on. Any row: stop, and update the migration and
-- rollback first. "new in live" means a policy the rollback would not restore;
-- "missing from live" means the policy changed or was removed since the snapshot.
-- Deliberately has no numeric prefix, so the Supabase CLI skips this file.

WITH snapshot (schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check) AS (
  VALUES
  ('public'::text, 'article_sentences'::text, 'Allow all for authenticated users'::text, 'PERMISSIVE'::text, '{authenticated}'::text, 'ALL'::text, 'true'::text, 'true'::text),
  ('public'::text, 'article_sentences'::text, 'Allow anon delete on article_sentences'::text, 'PERMISSIVE'::text, '{anon}'::text, 'DELETE'::text, 'true'::text, NULL::text),
  ('public'::text, 'article_sentences'::text, 'Allow insert for pipeline'::text, 'PERMISSIVE'::text, '{public}'::text, 'INSERT'::text, NULL::text, 'true'::text),
  ('public'::text, 'article_sentences'::text, 'Allow update for pipeline'::text, 'PERMISSIVE'::text, '{public}'::text, 'UPDATE'::text, 'true'::text, 'true'::text),
  ('public'::text, 'article_sentences'::text, 'Apply to public users'::text, 'PERMISSIVE'::text, '{public}'::text, 'SELECT'::text, 'true'::text, NULL::text),
  ('public'::text, 'articles'::text, 'Allow role to update'::text, 'PERMISSIVE'::text, '{public}'::text, 'ALL'::text, 'true'::text, NULL::text),
  ('public'::text, 'articles'::text, 'Allow select for public users'::text, 'PERMISSIVE'::text, '{public}'::text, 'SELECT'::text, 'true'::text, NULL::text),
  ('public'::text, 'authors'::text, 'Allow public select on authors'::text, 'PERMISSIVE'::text, '{anon,authenticated}'::text, 'SELECT'::text, 'true'::text, NULL::text),
  ('public'::text, 'categories'::text, 'Allow all for authenticated users'::text, 'PERMISSIVE'::text, '{authenticated}'::text, 'ALL'::text, 'true'::text, 'true'::text),
  ('public'::text, 'categories'::text, 'Allow public select'::text, 'PERMISSIVE'::text, '{public}'::text, 'SELECT'::text, 'true'::text, NULL::text),
  ('public'::text, 'reading_list'::text, 'Allow owner access on reading_list'::text, 'PERMISSIVE'::text, '{authenticated}'::text, 'ALL'::text, '(user_id = ( SELECT auth.uid() AS uid))'::text, '(user_id = ( SELECT auth.uid() AS uid))'::text),
  ('public'::text, 'reading_list'::text, 'Users can add to their reading list'::text, 'PERMISSIVE'::text, '{public}'::text, 'INSERT'::text, NULL::text, '(( SELECT auth.uid() AS uid) = user_id)'::text),
  ('public'::text, 'reading_list'::text, 'Users can delete their own reading list items'::text, 'PERMISSIVE'::text, '{public}'::text, 'DELETE'::text, '(( SELECT auth.uid() AS uid) = user_id)'::text, NULL::text),
  ('public'::text, 'reading_list'::text, 'Users can delete their reading list items'::text, 'PERMISSIVE'::text, '{public}'::text, 'DELETE'::text, '(( SELECT auth.uid() AS uid) = user_id)'::text, NULL::text),
  ('public'::text, 'reading_list'::text, 'Users can update their own reading list items'::text, 'PERMISSIVE'::text, '{public}'::text, 'UPDATE'::text, '(( SELECT auth.uid() AS uid) = user_id)'::text, '(( SELECT auth.uid() AS uid) = user_id)'::text),
  ('public'::text, 'reading_list'::text, 'Users can update their reading list items'::text, 'PERMISSIVE'::text, '{public}'::text, 'UPDATE'::text, '(( SELECT auth.uid() AS uid) = user_id)'::text, NULL::text),
  ('public'::text, 'reading_list'::text, 'Users can view their own reading list'::text, 'PERMISSIVE'::text, '{public}'::text, 'SELECT'::text, '(( SELECT auth.uid() AS uid) = user_id)'::text, NULL::text),
  ('public'::text, 'reading_progress'::text, 'Users can insert own reading progress'::text, 'PERMISSIVE'::text, '{public}'::text, 'INSERT'::text, NULL::text, '(( SELECT auth.uid() AS uid) = user_id)'::text),
  ('public'::text, 'reading_progress'::text, 'Users can update own reading progress'::text, 'PERMISSIVE'::text, '{public}'::text, 'UPDATE'::text, '(( SELECT auth.uid() AS uid) = user_id)'::text, NULL::text),
  ('public'::text, 'reading_progress'::text, 'Users can view own reading progress'::text, 'PERMISSIVE'::text, '{public}'::text, 'SELECT'::text, '(( SELECT auth.uid() AS uid) = user_id)'::text, NULL::text),
  ('public'::text, 'root_enrichment'::text, 'root_enrichment_public_read'::text, 'PERMISSIVE'::text, '{anon,authenticated}'::text, 'SELECT'::text, 'true'::text, NULL::text),
  ('public'::text, 'root_translation_improvements'::text, 'Allow all operations on root_translation_improvements'::text, 'PERMISSIVE'::text, '{public}'::text, 'ALL'::text, 'true'::text, 'true'::text),
  ('public'::text, 'roots'::text, 'Allow all for authenticated users'::text, 'PERMISSIVE'::text, '{authenticated}'::text, 'ALL'::text, 'true'::text, 'true'::text),
  ('public'::text, 'roots'::text, 'Allow for service'::text, 'PERMISSIVE'::text, '{public}'::text, 'ALL'::text, 'true'::text, NULL::text),
  ('public'::text, 'sentence_words'::text, 'Allow all for authenticated users'::text, 'PERMISSIVE'::text, '{authenticated}'::text, 'ALL'::text, 'true'::text, 'true'::text),
  ('public'::text, 'sentence_words'::text, 'Allow anon delete on sentence_words'::text, 'PERMISSIVE'::text, '{anon}'::text, 'DELETE'::text, 'true'::text, NULL::text),
  ('public'::text, 'sentence_words'::text, 'Allow insert for pipeline'::text, 'PERMISSIVE'::text, '{public}'::text, 'INSERT'::text, NULL::text, 'true'::text),
  ('public'::text, 'sentence_words'::text, 'Apply to public users'::text, 'PERMISSIVE'::text, '{public}'::text, 'SELECT'::text, 'true'::text, NULL::text),
  ('public'::text, 'sentence_words'::text, 'allow_updates'::text, 'PERMISSIVE'::text, '{public}'::text, 'UPDATE'::text, 'true'::text, NULL::text),
  ('public'::text, 'study_words'::text, 'Allow owner access on study_words'::text, 'PERMISSIVE'::text, '{authenticated}'::text, 'ALL'::text, '(user_id = ( SELECT auth.uid() AS uid))'::text, '(user_id = ( SELECT auth.uid() AS uid))'::text),
  ('public'::text, 'study_words'::text, 'Users can delete their own study words'::text, 'PERMISSIVE'::text, '{public}'::text, 'DELETE'::text, '(( SELECT auth.uid() AS uid) = user_id)'::text, NULL::text),
  ('public'::text, 'study_words'::text, 'Users can insert their own study words'::text, 'PERMISSIVE'::text, '{public}'::text, 'INSERT'::text, NULL::text, '(( SELECT auth.uid() AS uid) = user_id)'::text),
  ('public'::text, 'study_words'::text, 'Users can update their own study words'::text, 'PERMISSIVE'::text, '{public}'::text, 'UPDATE'::text, '(( SELECT auth.uid() AS uid) = user_id)'::text, NULL::text),
  ('public'::text, 'study_words'::text, 'Users can view their own study words'::text, 'PERMISSIVE'::text, '{public}'::text, 'SELECT'::text, '(( SELECT auth.uid() AS uid) = user_id)'::text, NULL::text),
  ('public'::text, 'translation_improvements'::text, 'Allow all operations on translation_improvements'::text, 'PERMISSIVE'::text, '{public}'::text, 'ALL'::text, 'true'::text, 'true'::text),
  ('public'::text, 'voice_grading_attempts'::text, 'voice_grading_attempts_insert_own'::text, 'PERMISSIVE'::text, '{authenticated}'::text, 'INSERT'::text, NULL::text, '(auth.uid() = user_id)'::text),
  ('public'::text, 'voice_grading_attempts'::text, 'voice_grading_attempts_select_own'::text, 'PERMISSIVE'::text, '{authenticated}'::text, 'SELECT'::text, '(auth.uid() = user_id)'::text, NULL::text),
  ('public'::text, 'word_types'::text, 'Allow all for authenticated users'::text, 'PERMISSIVE'::text, '{authenticated}'::text, 'ALL'::text, 'true'::text, 'true'::text),
  ('storage'::text, 'objects'::text, 'Allow anon to update images'::text, 'PERMISSIVE'::text, '{anon}'::text, 'UPDATE'::text, '(bucket_id = ''images''::text)'::text, '(bucket_id = ''images''::text)'::text),
  ('storage'::text, 'objects'::text, 'Allow anon to upload images'::text, 'PERMISSIVE'::text, '{anon}'::text, 'INSERT'::text, NULL::text, '(bucket_id = ''images''::text)'::text),
  ('storage'::text, 'objects'::text, 'Allow anonymous uploads to batch_scheduled'::text, 'PERMISSIVE'::text, '{public}'::text, 'INSERT'::text, NULL::text, '(bucket_id = ''batch_scheduled''::text)'::text),
  ('storage'::text, 'objects'::text, 'Allow authenticated uploads to audio'::text, 'PERMISSIVE'::text, '{public}'::text, 'INSERT'::text, NULL::text, '(bucket_id = ''audio''::text)'::text),
  ('storage'::text, 'objects'::text, 'Allow authenticated users to upload images'::text, 'PERMISSIVE'::text, '{authenticated}'::text, 'INSERT'::text, NULL::text, '((bucket_id = ''images''::text) AND (owner = auth.uid()))'::text),
  ('storage'::text, 'objects'::text, 'Allow public read access to audio'::text, 'PERMISSIVE'::text, '{public}'::text, 'SELECT'::text, '(bucket_id = ''audio''::text)'::text, NULL::text),
  ('storage'::text, 'objects'::text, 'Allow public read access to batch_scheduled'::text, 'PERMISSIVE'::text, '{public}'::text, 'SELECT'::text, '(bucket_id = ''batch_scheduled''::text)'::text, NULL::text),
  ('storage'::text, 'objects'::text, 'Allow public read access to images'::text, 'PERMISSIVE'::text, '{public}'::text, 'SELECT'::text, '(bucket_id = ''images''::text)'::text, NULL::text),
  ('storage'::text, 'objects'::text, 'Allow users to delete their own audio'::text, 'PERMISSIVE'::text, '{public}'::text, 'DELETE'::text, '((bucket_id = ''audio''::text) AND (owner = auth.uid()))'::text, NULL::text),
  ('storage'::text, 'objects'::text, 'Allow users to delete their own images'::text, 'PERMISSIVE'::text, '{authenticated}'::text, 'DELETE'::text, '((bucket_id = ''images''::text) AND (owner = auth.uid()))'::text, NULL::text),
  ('storage'::text, 'objects'::text, 'Allow users to update their own audio'::text, 'PERMISSIVE'::text, '{public}'::text, 'UPDATE'::text, '((bucket_id = ''audio''::text) AND (owner = auth.uid()))'::text, '((bucket_id = ''audio''::text) AND (owner = auth.uid()))'::text),
  ('storage'::text, 'objects'::text, 'Allow users to update their own images'::text, 'PERMISSIVE'::text, '{authenticated}'::text, 'UPDATE'::text, '((bucket_id = ''images''::text) AND (owner = auth.uid()))'::text, '((bucket_id = ''images''::text) AND (owner = auth.uid()))'::text),
  ('storage'::text, 'objects'::text, 'Service role can manage images'::text, 'PERMISSIVE'::text, '{service_role}'::text, 'ALL'::text, '(bucket_id = ''images''::text)'::text, '(bucket_id = ''images''::text)'::text),
  ('storage'::text, 'objects'::text, 'service account 1ffg0oo_0'::text, 'PERMISSIVE'::text, '{service_role}'::text, 'UPDATE'::text, '(bucket_id = ''images''::text)'::text, NULL::text),
  ('storage'::text, 'objects'::text, 'service account 1ffg0oo_1'::text, 'PERMISSIVE'::text, '{service_role}'::text, 'DELETE'::text, '(bucket_id = ''images''::text)'::text, NULL::text),
  ('storage'::text, 'objects'::text, 'service account 1ffg0oo_2'::text, 'PERMISSIVE'::text, '{service_role}'::text, 'INSERT'::text, NULL::text, '(bucket_id = ''images''::text)'::text),
  ('storage'::text, 'objects'::text, 'service account 1ffg0oo_3'::text, 'PERMISSIVE'::text, '{service_role}'::text, 'SELECT'::text, '(bucket_id = ''images''::text)'::text, NULL::text),
  ('storage'::text, 'objects'::text, 'service account audio full access'::text, 'PERMISSIVE'::text, '{public}'::text, 'ALL'::text, '(bucket_id = ''audio''::text)'::text, '(bucket_id = ''audio''::text)'::text)
),
live AS (
  SELECT schemaname::text, tablename::text, policyname::text, permissive, roles::text, cmd, qual, with_check
    FROM pg_policies
   WHERE schemaname IN ('public', 'storage')
)
(SELECT 'missing from live' AS drift, s.schemaname, s.tablename, s.policyname, s.roles, s.cmd, s.qual, s.with_check
   FROM (SELECT * FROM snapshot EXCEPT SELECT * FROM live) s)
UNION ALL
(SELECT 'new in live', l.schemaname, l.tablename, l.policyname, l.roles, l.cmd, l.qual, l.with_check
   FROM (SELECT * FROM live EXCEPT SELECT * FROM snapshot) l)
UNION ALL
(SELECT 'table privileges differ', 'public', c.relname::text, NULL, c.relacl::text, NULL, NULL, NULL
   FROM pg_class c
  WHERE c.relnamespace = 'public'::regnamespace
    AND c.relkind = 'r'
    AND c.relname = ANY (ARRAY['articles', 'article_sentences', 'sentence_words', 'roots', 'authors',
      'categories', 'word_types', 'root_enrichment', 'translation_improvements',
      'root_translation_improvements']::name[])
    AND c.relacl::text IS DISTINCT FROM
      '{postgres=arwdDxt/postgres,anon=arwdDxt/postgres,authenticated=arwdDxt/postgres,service_role=arwdDxt/postgres}')
ORDER BY 1, 2, 3, 4;
