const SUPABASE_STORAGE_BASE =
  'https://kkmnzbeugdoajtzfjkxg.supabase.co/storage/v1/object/public/images';

export function normalizeImageUrl(imageUrl: string): string {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  return `${SUPABASE_STORAGE_BASE}/${imageUrl}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function estimateReadTime(
  summary: string,
  difficultyLevel: number,
): string {
  const wordCount = summary.trim().split(/\s+/).length;
  const estimatedTotalWords = wordCount * 8;
  const readingSpeed =
    difficultyLevel <= 2 ? 250 : difficultyLevel <= 4 ? 225 : 200;
  const minutes = Math.ceil(estimatedTotalWords / readingSpeed);
  const bilingualReadTime = Math.ceil(minutes * 2);
  const readTime = Math.max(1, bilingualReadTime);

  return `${readTime} min read`;
}
