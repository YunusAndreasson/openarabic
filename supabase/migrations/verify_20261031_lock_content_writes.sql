-- VERIFY for 20261031_lock_content_writes.sql. READ ONLY.
-- Run right after applying. Every row is a problem; zero rows means the database
-- matches the intended state. This checks configuration only. It does not exercise
-- the API, so the owner's manual step in the decision record is still needed.
-- Deliberately has no numeric prefix, so the Supabase CLI skips this file.

WITH content (t) AS (
  VALUES ('articles'), ('article_sentences'), ('sentence_words'), ('roots'), ('authors'),
         ('categories'), ('word_types'), ('root_enrichment'), ('translation_improvements'),
         ('root_translation_improvements')
)
SELECT 'write policy on content table' AS problem, p.tablename::text AS object, p.policyname::text AS detail
  FROM pg_policies p JOIN content c ON c.t = p.tablename
 WHERE p.schemaname = 'public' AND p.cmd <> 'SELECT' AND p.roles <> ARRAY['service_role']::name[]
UNION ALL
SELECT 'write policy on storage.objects', 'storage.objects', p.policyname::text
  FROM pg_policies p
 WHERE p.schemaname = 'storage' AND p.tablename = 'objects'
   AND p.cmd <> 'SELECT' AND p.roles <> ARRAY['service_role']::name[]
UNION ALL
SELECT 'write privilege held', c.t, r.rolname
  FROM content c CROSS JOIN (VALUES ('anon'), ('authenticated')) AS r(rolname)
 WHERE has_table_privilege(r.rolname, format('public.%I', c.t), 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
UNION ALL
SELECT 'no read for signed-in users', c.t, NULL
  FROM content c
 WHERE NOT has_table_privilege('authenticated', format('public.%I', c.t), 'SELECT')
    OR NOT EXISTS (SELECT 1 FROM pg_policies p
                    WHERE p.schemaname = 'public' AND p.tablename = c.t AND p.cmd = 'SELECT'
                      AND p.roles && ARRAY['public', 'authenticated']::name[])
UNION ALL
SELECT 'no read for the public', c.t, NULL
  FROM content c
 WHERE c.t <> 'word_types' -- signed-in only, as before the migration
   AND NOT EXISTS (SELECT 1 FROM pg_policies p
                    WHERE p.schemaname = 'public' AND p.tablename = c.t AND p.cmd = 'SELECT'
                      AND p.roles && ARRAY['public', 'anon']::name[])
UNION ALL
SELECT 'no public read on bucket', b.b, NULL
  FROM (VALUES ('audio'), ('images'), ('batch_scheduled')) AS b(b)
 WHERE NOT EXISTS (SELECT 1 FROM pg_policies p
                    WHERE p.schemaname = 'storage' AND p.tablename = 'objects' AND p.cmd = 'SELECT'
                      AND p.roles && ARRAY['public', 'anon']::name[]
                      AND p.qual LIKE '%''' || b.b || '''%')
UNION ALL
SELECT 'future tables still get write privileges', 'default ACL', d.defaclacl::text
  FROM pg_default_acl d
 WHERE d.defaclrole = 'postgres'::regrole AND d.defaclnamespace = 'public'::regnamespace
   AND d.defaclobjtype = 'r'
   AND d.defaclacl::text ~ '(anon|authenticated)=[^/]*[awdDxt]'
ORDER BY 1, 2;
