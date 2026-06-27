import Link from 'next/link';
import { wordPagePath } from '@/lib/word-pages';
import type { Database } from '@/lib/database.types';

type VocabRoot = Pick<
  Database['public']['Tables']['roots']['Row'],
  'id' | 'letters' | 'meaning'
>;

interface ArticleVocabularyProps {
  roots: VocabRoot[];
}

/**
 * Server-rendered "Key vocabulary" section: links each distinct word in the
 * article to its dictionary entry. Crawlable internal links — they build the
 * link graph that makes the dictionary pages discoverable and rankable, and
 * give readers a glossary.
 */
export function ArticleVocabulary({ roots }: ArticleVocabularyProps) {
  if (roots.length === 0) return null;

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-16">
      <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1.5">
        Key vocabulary in this article
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        Tap a word for its meaning, pronunciation, and more example sentences.
      </p>
      <ul className="flex flex-wrap gap-2">
        {roots.map((root) => (
          <li key={root.id}>
            <Link
              href={wordPagePath(root)}
              className="inline-flex items-baseline gap-2 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-sm transition-colors hover:border-border hover:bg-muted/50"
            >
              <span lang="ar" dir="rtl" className="text-base text-foreground">
                {root.letters}
              </span>
              <span className="text-muted-foreground">{root.meaning}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
