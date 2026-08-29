/**
 * Starter vocabulary — the deck handed to a brand-new learner by the Practice
 * empty state ("add common words").
 *
 * WHY THIS IS AN EXPLICIT LIST AND NOT A QUERY
 *
 * This used to be `roots.order('id').limit(10)`, on the assumption that
 * "foundational words have lower IDs". Root ids are ingestion order, so that
 * shipped the vocabulary of whichever article was imported first: lack,
 * success, distortion, opinion, obscurity, truth, heart, obscurity, mention,
 * waste. Two of those ten (خَفَاءٌ and خُمُولٌ) render as the *identical* English
 * answer, "obscurity" — an unanswerable pair, in every new user's first session.
 *
 * Ranking by real corpus usage (counting `sentence_words.root_id`, the signal
 * the dictionary hub and the social word-picker use) does not fix it either.
 * The top of that ranking is dominated by function words (لَمْ "does not",
 * وَلَا "and no"), inflected forms carrying contextual glosses (سَمِعْتُ "I heard",
 * بِيَدِهِ "by His hand"), and surface forms that appear twice under different
 * meanings (سَلَّمَ is both "greeted" and "to bless"). The corpus is classical
 * religious prose: a dictionary-wide sweep finds only seven picturable concrete
 * nouns with a clean, unique gloss. Any derived ordering skews abstract.
 *
 * So the deck is curated. Each entry below was verified against the database to
 * have: both audio tracks present, a gloss that is unique across the whole
 * `roots` table, and a surface form that is unique across the whole `roots`
 * table. Together those three rule out the collision classes above — no two
 * cards can share an answer, and no card's Arabic can appear again meaning
 * something else.
 *
 * The Arabic and gloss in each comment are documentation of what the id
 * resolved to at curation time, not a runtime contract — the app always renders
 * whatever the database returns. They are here so a future reader can re-verify
 * the list without querying, and so a silent content change is noticeable.
 */

import type { RootId } from '@/types/branded.types';

/**
 * Curated starter roots, in the order a learner should meet them: concrete,
 * picturable nouns first, then common verbs, then the abstract terms.
 *
 * Deliberately longer than the ten actually handed out. `getCommonRoots` takes
 * the first N that still resolve, so a row disappearing from the dictionary
 * shortens the tail instead of shrinking the deck below its intended size.
 */
export const STARTER_ROOT_IDS: readonly RootId[] = [
  6526 as RootId, // بَاب — door
  10931 as RootId, // صَدِيق — friend
  6679 as RootId, // مِفْتَاحٌ — key
  12086 as RootId, // بَحْر — sea
  6141 as RootId, // شَرِبَ — drank
  5827 as RootId, // وَجَدَ — to find
  5920 as RootId, // بَنَى — to build
  5649 as RootId, // قَعَدَ — sat
  5345 as RootId, // حُزْن — sadness
  6818 as RootId, // قُرْآن — Scripture
  // Spares, in preference order — used only if one of the ten above is missing.
  5800 as RootId, // مَرَّ — to pass
  10858 as RootId, // يَنْسَى — to forget
  14026 as RootId, // مُعَلِّم — teacher
  6930 as RootId, // سُنَّةٌ — tradition
];

/** How many starter words the quick-start actually adds. */
export const STARTER_WORD_COUNT = 10;
