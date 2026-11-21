import { supabase } from '@/lib/supabase';

/**
 * What the app really offers, derived from published articles. The `authors` table
 * can't answer this: it holds ten authors with no texts and a duplicate row.
 */
export interface PublishedAuthor {
  id: number;
  name: string;
  texts: number;
}

export interface PublishedCatalogue {
  /** Most texts first. */
  authors: PublishedAuthor[];
  works: number;
  /** Levels 1 to 3, the app's beginner rail (utils/articleUtils.ts). */
  easierTexts: number;
}

interface ArticleRow {
  book: string | null;
  difficulty_level: number | null;
  authors: { id: number; name: string | null } | null;
}

const EASIER_MAX_LEVEL = 3;

export function summariseCatalogue(rows: ArticleRow[]): PublishedCatalogue {
  const authors = new Map<number, PublishedAuthor>();
  const works = new Set<string>();
  let easierTexts = 0;

  for (const row of rows) {
    if (row.book) works.add(row.book);
    if (row.difficulty_level !== null && row.difficulty_level <= EASIER_MAX_LEVEL) easierTexts += 1;
    if (!row.authors?.name) continue;
    const author = authors.get(row.authors.id);
    if (author) author.texts += 1;
    else authors.set(row.authors.id, { id: row.authors.id, name: row.authors.name, texts: 1 });
  }

  return {
    authors: [...authors.values()].sort(
      (a, b) => b.texts - a.texts || a.name.localeCompare(b.name),
    ),
    works: works.size,
    easierTexts,
  };
}

/** Null when the read fails, so callers leave the line out rather than guess. */
export async function getPublishedCatalogue(): Promise<PublishedCatalogue | null> {
  const { data, error } = await supabase
    .from('articles')
    .select('book, difficulty_level, authors(id, name)')
    .eq('published', true);

  if (error || !data) {
    console.error('Error fetching published catalogue:', error);
    return null;
  }
  // `book` exists in the database but not in the generated types.
  return summariseCatalogue(data as unknown as ArticleRow[]);
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/** "six", but "22". */
export function countInWords(count: number): string {
  return NUMBER_WORDS[count] ?? String(count);
}
