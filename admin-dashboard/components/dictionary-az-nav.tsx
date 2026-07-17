import Link from 'next/link';

interface DictionaryAzNavProps {
  /** Buckets that have entries, in A–Z order (from getDictionaryLetters). */
  letters: string[];
  /** The bucket of the current page, highlighted and marked aria-current. */
  active?: string;
}

function bucketLabel(letter: string): string {
  if (letter === '0-9') return '0–9';
  if (letter === 'other') return '#';
  return letter.toUpperCase();
}

/**
 * A–Z (plus 0–9 / #) navigation across the dictionary browse pages. Rendered as
 * real links so crawlers reach every letter page — and through them the full
 * long tail of word pages that the sitemap alone does not get indexed.
 */
export function DictionaryAzNav({ letters, active }: DictionaryAzNavProps) {
  return (
    <nav
      aria-label="Browse the dictionary A to Z"
      className="flex flex-wrap gap-1.5"
    >
      {letters.map((letter) => {
        const isActive = letter === active;
        return (
          <Link
            key={letter}
            href={`/dictionary/${letter}`}
            aria-current={isActive ? 'page' : undefined}
            className={`inline-flex min-w-9 items-center justify-center rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition-colors ${
              isActive
                ? 'border-primary/50 bg-muted text-foreground'
                : 'border-border/60 bg-card text-muted-foreground hover:border-primary/50 hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            {bucketLabel(letter)}
          </Link>
        );
      })}
    </nav>
  );
}
