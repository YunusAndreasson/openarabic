import type { Json } from '@/types/database.types';
import type { RootId } from '@/types/branded.types';

/**
 * One sense of a headword. `note` clarifies register or usage for that sense.
 */
export interface RootSense {
  gloss: string;
  note?: string;
}

/**
 * A word sharing the same root. `rootId` is present only when the pipeline
 * matched the form to a unique entry in our own dictionary — the app links a
 * member only when it can, so a chip never dead-ends.
 */
export interface RootFamilyMember {
  letters: string;
  transliteration: string;
  meaning: string;
  rootId?: RootId;
  /**
   * The plural Lane's states for this word, when he states one. Arabic broken
   * plurals are not derivable from the singular — عَالِم gives عُلَمَاء, أَب gives
   * آبَاء — so this is the rare piece of the record a learner genuinely cannot
   * work out, which is why it earns a line where the morphological pattern does
   * not.
   */
  plural?: string;
}

/**
 * The synthesised root explanation for one dictionary headword.
 *
 * Mirrors `public.root_enrichment` minus `faq`, which exists to feed FAQPage
 * JSON-LD on the website and is deliberately never fetched here: its answers
 * restate the senses in question form, which is exactly the padding a phone
 * surface cannot afford.
 */
export interface RootEnrichment {
  rootId: RootId;
  /** Spaced Arabic radicals, e.g. 'ق ل ب'. */
  triliteralRoot: string;
  rootTransliteration: string;
  /** The sense shared by the whole family, <=6 words, e.g. 'to turn, invert, change'. */
  rootMeaning: string;
  headwordTransliteration: string;
  senses: RootSense[];
  wordFamily: RootFamilyMember[];
  usageNote: string | null;
  source: string;
  sourceUrl: string;
}

const isRecord = (value: Json | undefined): value is Record<string, Json | undefined> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: Json | undefined): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

/**
 * Narrow one JSONB array element into a sense.
 *
 * Postgres hands `senses`/`word_family` back as `Json`, so every field has to be
 * proved rather than asserted. A member that fails is dropped, not defaulted:
 * a sense with an empty gloss would render as a blank bullet, which reads as a
 * rendering bug rather than as missing data.
 */
export function parseSenses(value: Json | undefined): RootSense[] {
  if (!Array.isArray(value)) return [];
  const senses: RootSense[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const gloss = asString(entry['gloss']);
    if (!gloss) continue;
    const note = asString(entry['note']);
    senses.push(note ? { gloss, note } : { gloss });
  }
  return senses;
}

export function parseWordFamily(value: Json | undefined): RootFamilyMember[] {
  if (!Array.isArray(value)) return [];
  const members: RootFamilyMember[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const letters = asString(entry['letters']);
    const meaning = asString(entry['meaning']);
    if (!letters || !meaning) continue;
    const rootId = typeof entry['root_id'] === 'number' ? (entry['root_id'] as RootId) : undefined;
    members.push({
      letters,
      transliteration: asString(entry['transliteration']) ?? '',
      meaning,
      ...(rootId === undefined ? {} : { rootId }),
      // `wazn` is carried in the row and deliberately NOT surfaced: five rows of
      // 1َ2ْ3 / تَ1َ2َّ3 read as a spreadsheet rather than as teaching. The plural
      // is per-word and unguessable, so it is the one that ships.
      ...(asString(entry['plural']) ? { plural: asString(entry['plural']) as string } : {}),
    });
  }
  return members;
}
