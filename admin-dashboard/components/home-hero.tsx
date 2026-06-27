/**
 * Homepage hero — the page's single semantic <h1> plus a keyword-rich intro.
 *
 * Rendered only on the unfiltered homepage (see ArticlesClient) so category
 * views don't compete for the same H1. Static markup, server-rendered in the
 * initial HTML for crawlers.
 */
export function HomeHero() {
  return (
    <div className="mb-8 text-center sm:text-left">
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
        Learn to Read Arabic Through Authentic Texts
      </h1>
      <p className="mt-3 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto sm:mx-0">
        OpenArabic turns classical Islamic and literary texts into bilingual reading practice. Read
        Arabic with parallel English translations, tap any word for its meaning, hear native audio,
        and build lasting vocabulary with spaced repetition.
      </p>
    </div>
  );
}
