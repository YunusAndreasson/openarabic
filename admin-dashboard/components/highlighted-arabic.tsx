import { Fragment } from 'react';

// Arabic diacritics (harakat, tanwin, Quranic marks) + tatweel. Stripped before
// comparing because word_form is fully vocalized (الْقَلْبِ) while the sentence
// text is only lightly vocalized (الْقلب) — exact matching would never hit.
const ARABIC_DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

/** Reduce an Arabic token to bare letters for diacritic/punctuation-insensitive comparison. */
function normalize(text: string): string {
  return text.normalize('NFC').replace(ARABIC_DIACRITICS, '').replace(/[^\p{L}]/gu, '');
}

interface HighlightedArabicProps {
  text: string;
  /** The surface word form to emphasise within `text`. */
  highlight: string;
}

/**
 * Renders an Arabic sentence with the target word visually emphasised, so a
 * dictionary reader can immediately spot where it occurs. Matches per whitespace
 * token after normalising diacritics/punctuation; falls back to plain text when
 * the word isn't found.
 */
export function HighlightedArabic({ text, highlight }: HighlightedArabicProps) {
  const target = normalize(highlight);
  if (!target) return <>{text}</>;

  // Split on whitespace, keeping the separators so original spacing is preserved.
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((part, i) => {
        if (part && !/\s/.test(part) && normalize(part) === target) {
          return (
            <mark key={i} className="rounded bg-primary/15 px-0.5 text-primary">
              {part}
            </mark>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
