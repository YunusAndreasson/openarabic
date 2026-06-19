/**
 * Known author homepages. When an article author's name matches one of these,
 * their byline links to their site (and the link is emitted in JSON-LD).
 */
const AUTHOR_URLS: Record<string, string> = {
  'Yunus Andreasson': 'https://andreassonphoto.com',
  'Yunus Andréasson': 'https://andreassonphoto.com',
};

/** Returns the author's homepage URL, or null when none is known. */
export function getAuthorUrl(name: string | null | undefined): string | null {
  if (!name) return null;
  return AUTHOR_URLS[name.trim()] ?? null;
}
