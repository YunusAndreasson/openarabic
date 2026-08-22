import { supabase } from '@/services/supabase';
import type { RootId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import { parseSenses, parseWordFamily, type RootEnrichment } from '@/types/rootEnrichment.types';
import { createServiceErrorConfig } from '@/utils/serviceErrorConfig';
import { executeQuery } from '@/utils/supabaseHelpers';

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

export const rootEnrichmentService = {
  /**
   * The root explanation for one headword, or `null` when we have not generated
   * one yet.
   *
   * A miss is the ordinary case — coverage is a small fraction of the dictionary
   * — so it is `maybeSingle()` and an absent value rather than an error, and the
   * surfaces that show this simply render nothing.
   *
   * `overrideTypes` after `maybeSingle()` follows `articles.getArticleById`:
   * inference through the `executeQuery` wrapper collapses a single-row result
   * to `never`, and stating the row type is how this codebase already resolves
   * that.
   */
  async getByRootId(rootId: RootId): Promise<RootEnrichment | null> {
    // Explicit generic: `maybeSingle()` genuinely returns null on a miss — the
    // ordinary case here — but inference through the wrapper hands back a
    // non-nullable row, which makes the guard below read as dead code.
    const row = await executeQuery<RootEnrichmentRow | null>(
      () =>
        supabase
          .from('root_enrichment')
          .select(
            'root_id, triliteral_root, root_transliteration, root_meaning, headword_transliteration, senses, word_family, usage_note, source, source_url',
          )
          .eq('root_id', rootId)
          .maybeSingle()
          .overrideTypes<RootEnrichmentRow, { merge: false }>(),
      errorConfig,
    );
    if (!row) return null;

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
  },
};
