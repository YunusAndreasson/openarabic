import { Fragment } from 'react';

interface HighlightedArabicProps {
  text: string;
  /** The surface word form to emphasise within `text`. */
  highlight: string;
}

/**
 * Renders an Arabic sentence with the target word visually emphasised, so a
 * dictionary reader can immediately spot where the word occurs. Falls back to
 * plain text when the exact form isn't present (e.g. diacritic mismatch).
 */
export function HighlightedArabic({ text, highlight }: HighlightedArabicProps) {
  if (!highlight || !text.includes(highlight)) return <>{text}</>;

  const parts = text.split(highlight);
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <mark className="rounded bg-primary/15 px-0.5 text-primary">
              {highlight}
            </mark>
          )}
        </Fragment>
      ))}
    </>
  );
}
