import { describe, expect, it } from 'vitest';
import { generateSlug, parseIdFromSlug } from './slugify';

describe('generateSlug', () => {
  it('converts a simple title and id into a kebab-case slug', () => {
    expect(generateSlug('Hello World', 42)).toBe('hello-world-42');
  });

  it('collapses runs of non-alphanumerics into single dashes', () => {
    expect(generateSlug("What's New?!", 7)).toBe('what-s-new-7');
  });

  it('strips leading and trailing dashes', () => {
    expect(generateSlug('   spaced out   ', 1)).toBe('spaced-out-1');
    expect(generateSlug('!leading and trailing!', 2)).toBe('leading-and-trailing-2');
  });

  it('drops non-Latin characters (Arabic, emoji)', () => {
    // Arabic text becomes empty slug body — only the id remains
    expect(generateSlug('مرحبا', 99)).toBe('-99');
    expect(generateSlug('Hello 🚀 World', 5)).toBe('hello-world-5');
  });

  it('handles numeric titles', () => {
    expect(generateSlug('100 things to know', 3)).toBe('100-things-to-know-3');
  });
});

describe('parseIdFromSlug', () => {
  it('extracts the trailing numeric id', () => {
    expect(parseIdFromSlug('hello-world-42')).toBe(42);
  });

  it('handles ids that are multi-digit', () => {
    expect(parseIdFromSlug('article-title-123456')).toBe(123456);
  });

  it('handles a slug that is just an id', () => {
    expect(parseIdFromSlug('99')).toBe(99);
  });

  it('throws on slugs without a trailing number', () => {
    expect(() => parseIdFromSlug('no-id-here')).toThrow(/Invalid slug format/);
    expect(() => parseIdFromSlug('')).toThrow(/Invalid slug format/);
  });

  it('roundtrips with generateSlug', () => {
    const slug = generateSlug('Some Long Title Here', 12345);
    expect(parseIdFromSlug(slug)).toBe(12345);
  });
});
