-- Root Enrichment Table
-- Date: 2026-08-21
-- Purpose: One row per dictionary headword holding the synthesised root
--          explanation (Lane's Lexicon grounding -> LLM synthesis -> automated
--          root gate -> judge). Replaces admin-dashboard/lib/word-enrichment.ts
--          as the source of truth so the app and the website read the same row.

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Create the helper ONLY if it is missing. Deliberately not CREATE OR REPLACE:
-- root_translation_improvements already installed this function and other
-- triggers depend on it, so replacing it here would silently redefine shared
-- behaviour on tables this migration has no business touching.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'set_updated_at'
  ) THEN
    CREATE FUNCTION public.set_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      NEW.updated_at = timezone('utc', now());
      RETURN NEW;
    END;
    $fn$;
  END IF;
END
$$;

-- ============================================================================
-- TABLE DEFINITION
-- ============================================================================

-- root_id is the PRIMARY KEY, not a surrogate id with an index beside it: there
-- is exactly one enrichment per headword and every read is a point lookup by
-- that key, so the key is the access path.
CREATE TABLE IF NOT EXISTS public.root_enrichment (
  root_id INTEGER PRIMARY KEY REFERENCES public.roots(id) ON DELETE CASCADE,
  triliteral_root TEXT NOT NULL,
  root_transliteration TEXT NOT NULL,
  -- The sense shared by the whole word family, <=6 words ("to turn, invert,
  -- change"). Distinct from the headword's own gloss, and the only field short
  -- enough to carry a one-line collapsed summary on a phone.
  root_meaning TEXT NOT NULL,
  headword_transliteration TEXT NOT NULL,
  part_of_speech TEXT NOT NULL,
  senses JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Members carry {letters, transliteration, meaning, root_id?}. root_id rather
  -- than the website's "/word/slug-123" path, so each client builds its own link.
  word_family JSONB NOT NULL DEFAULT '[]'::jsonb,
  usage_note TEXT,
  -- Search-engine FAQ (feeds FAQPage JSON-LD on the website). Deliberately NOT
  -- rendered in the app: the answers restate the senses in question form.
  faq JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.root_enrichment ENABLE ROW LEVEL SECURITY;

-- Read-only to clients, unlike the permissive FOR ALL policy on
-- root_translation_improvements. That table collects suggestions; this one holds
-- published dictionary content, and the anon key ships inside the app bundle —
-- a write policy here would let any holder of it rewrite every explanation in
-- the dictionary. Writes go through the service role (the pipeline), never anon.
DROP POLICY IF EXISTS "root_enrichment_public_read" ON public.root_enrichment;
CREATE POLICY "root_enrichment_public_read"
ON public.root_enrichment
FOR SELECT
TO anon, authenticated
USING (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS trg_root_enrichment_updated_at ON public.root_enrichment;
CREATE TRIGGER trg_root_enrichment_updated_at
BEFORE UPDATE ON public.root_enrichment
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
