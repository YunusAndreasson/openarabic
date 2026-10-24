import { supabase } from '@/services/supabase';
import type { RootId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import { parseSenses, parseWordFamily, type RootEnrichment } from '@/types/rootEnrichment.types';
import { createServiceErrorConfig } from '@/utils/serviceErrorConfig';
import { executeQuery, type RequestOptions } from '@/utils/supabaseHelpers';

/**
 * 'fetch', so the factory resolves to `showToast: false` and warning-level
 * Sentry. This is supplementary content on a screen that works without it —
 * a learner opening a word should never be handed an error toast because an
 * etymology could not be loaded, and before the table is seeded that toast
 * would fire on literally every word.
 */
const errorConfig = createServiceErrorConfig('root_enrichment', 'fetch');

/**
 * The columns the app actually renders, named against the generated table type
 * so a rename in the schema fails here rather than at runtime.
 *
 * Two are deliberately absent. `faq` exists to feed FAQPage JSON-LD on the
 * website and is never shown in the app — its answers restate the senses in
 * question form. `part_of_speech` is long, prose-shaped, and would contradict
 * the part of speech the word screen already derives from real corpus usage
 * (`utils/wordUsage.ts`); the corpus one wins because it describes what the
 * learner has actually read.
 */
type RootEnrichmentRow = Pick<
  Tables<'root_enrichment'>,
  | 'root_id'
  | 'triliteral_root'
  | 'root_transliteration'
  | 'root_meaning'
  | 'headword_transliteration'
  | 'senses'
  | 'word_family'
  | 'usage_note'
  | 'source'
  | 'source_url'
>;

/**
 * The same column list as a select string, written once for both reads. A
 * literal on purpose: supabase-js parses a select string as a template literal
 * type, so the row it infers is checked against {@link RootEnrichmentRow} where
 * `parseRootEnrichment` takes it — no override needed.
 */
const ROOT_ENRICHMENT_COLUMNS =
  'root_id, triliteral_root, root_transliteration, root_meaning, headword_transliteration, senses, word_family, usage_note, source, source_url';

function parseRootEnrichment(row: RootEnrichmentRow): RootEnrichment {
  return {
    rootId: row.root_id as RootId,
    triliteralRoot: row.triliteral_root,
    rootTransliteration: row.root_transliteration,
    rootMeaning: row.root_meaning,
    headwordTransliteration: row.headword_transliteration,
    senses: parseSenses(row.senses),
    wordFamily: parseWordFamily(row.word_family),
    usageNote: row.usage_note,
    source: row.source,
    sourceUrl: row.source_url,
  };
}

export const rootEnrichmentService = {
  /**
   * Fetch the root stories for one immutable review chunk in a single query.
   *
   * Review enrichment is deliberately batch-shaped: starting a request when a
   * learner reaches each card makes the explanation race the answer they just
   * gave. Loading the whole admitted chunk once keeps the per-card path quiet
   * and makes the story ready if that card becomes a restudy hold.
   */
  async getByRootIds(
    rootIds: RootId[],
    request: RequestOptions = {},
  ): Promise<Map<number, RootEnrichment>> {
    if (rootIds.length === 0) return new Map();

    const rows = await executeQuery(
      () => supabase.from('root_enrichment').select(ROOT_ENRICHMENT_COLUMNS).in('root_id', rootIds),
      errorConfig,
      request,
    );

    return new Map(rows.map(row => [row.root_id, parseRootEnrichment(row)]));
  },

  /**
   * The root explanation for one headword, or `null` when we have not generated
   * one yet.
   *
   * A miss is the ordinary case — coverage is a small fraction of the dictionary
   * — so it is `maybeSingle()` and an absent value rather than an error, and the
   * surfaces that show this simply render nothing. `executeQuery` types the
   * result `Row | null` straight off `maybeSingle()`, so the guard below is a
   * real one.
   */
  async getByRootId(rootId: RootId, request: RequestOptions = {}): Promise<RootEnrichment | null> {
    const row = await executeQuery(
      () =>
        supabase
          .from('root_enrichment')
          .select(ROOT_ENRICHMENT_COLUMNS)
          .eq('root_id', rootId)
          .maybeSingle(),
      errorConfig,
      request,
    );
    if (!row) return null;

    return parseRootEnrichment(row);
  },
};
