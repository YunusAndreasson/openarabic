import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { estimateReadTime, formatDate, normalizeImageUrl } from './article-utils';

describe('normalizeImageUrl', () => {
  it('returns empty string for empty input', () => {
    expect(normalizeImageUrl('')).toBe('');
  });

  it('passes through absolute https URLs unchanged', () => {
    const url = 'https://example.com/image.jpg';
    expect(normalizeImageUrl(url)).toBe(url);
  });

  it('passes through absolute http URLs unchanged', () => {
    const url = 'http://example.com/image.jpg';
    expect(normalizeImageUrl(url)).toBe(url);
  });

  it('prefixes relative paths with the Supabase storage base', () => {
    expect(normalizeImageUrl('cover.jpg')).toBe(
      'https://kkmnzbeugdoajtzfjkxg.supabase.co/storage/v1/object/public/images/cover.jpg',
    );
  });

  it('handles nested paths', () => {
    expect(normalizeImageUrl('articles/123/hero.png')).toBe(
      'https://kkmnzbeugdoajtzfjkxg.supabase.co/storage/v1/object/public/images/articles/123/hero.png',
    );
  });
});

describe('formatDate', () => {
  // Pin "now" so the relative-date branches are deterministic
  const NOW = new Date('2026-05-17T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Today" for the same day', () => {
    expect(formatDate('2026-05-17T03:00:00Z')).toBe('Today');
  });

  it('returns "Yesterday" for one day ago', () => {
    expect(formatDate('2026-05-16T03:00:00Z')).toBe('Yesterday');
  });

  it('returns "N days ago" for 2-6 days ago', () => {
    expect(formatDate('2026-05-14T12:00:00Z')).toBe('3 days ago');
  });

  it('returns "1 week ago" for 7 days ago', () => {
    expect(formatDate('2026-05-10T12:00:00Z')).toBe('1 week ago');
  });

  it('returns "N weeks ago" for 14-29 days ago', () => {
    expect(formatDate('2026-04-25T12:00:00Z')).toBe('3 weeks ago');
  });

  it('returns a localized short-month date for older dates within the year', () => {
    const result = formatDate('2026-01-10T12:00:00Z');
    // Locale formatting may vary slightly across runtimes; assert the month is present
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/10/);
  });

  it('includes the year for dates in different years', () => {
    expect(formatDate('2024-06-01T12:00:00Z')).toMatch(/2024/);
  });
});

describe('estimateReadTime', () => {
  it('returns a string in the "N min read" format', () => {
    expect(estimateReadTime('A short summary.', 1)).toMatch(/^\d+ min read$/);
  });

  it('returns at least 1 minute even for a one-word summary', () => {
    const result = estimateReadTime('a', 1);
    const minutes = parseInt(result);
    expect(minutes).toBeGreaterThanOrEqual(1);
    expect(result).toMatch(/min read$/);
  });

  it('produces a longer estimate for higher difficulty levels', () => {
    const summary = Array.from({ length: 50 }, () => 'word').join(' ');
    const easy = parseInt(estimateReadTime(summary, 1));
    const hard = parseInt(estimateReadTime(summary, 5));
    expect(hard).toBeGreaterThanOrEqual(easy);
  });

  it('scales with summary length', () => {
    const short = parseInt(estimateReadTime('short summary', 3));
    const long = parseInt(
      estimateReadTime(Array.from({ length: 200 }, () => 'word').join(' '), 3),
    );
    expect(long).toBeGreaterThan(short);
  });
});
