import {
  areArticleSentencePropsEqual,
  type ArticleSentenceProps,
} from '@/components/article/ArticleSentence';
import type { SentenceWord } from '@/types/vocabulary.types';

const createProps = (
  selectedRootIds: ReadonlySet<number>,
  words: SentenceWord[],
): ArticleSentenceProps =>
  ({
    sentence: { id: 1, english: 'English', arabic: 'Arabic' },
    words,
    colors: {},
    selectedRootIds,
  }) as ArticleSentenceProps;

describe('ArticleSentence memo comparison', () => {
  const words = [
    { id: 10, root_id: 100 },
    { id: 11, root_id: 101 },
  ] as SentenceWord[];

  it('keeps an unaffected sentence mounted when another root changes', () => {
    const previous = createProps(new Set([100]), words);
    const next = { ...previous, selectedRootIds: new Set([100, 999]) };

    expect(areArticleSentencePropsEqual(previous, next)).toBe(true);
  });

  it('updates a sentence when one of its roots changes selection', () => {
    const previous = createProps(new Set([100]), words);
    const next = { ...previous, selectedRootIds: new Set([100, 101]) };

    expect(areArticleSentencePropsEqual(previous, next)).toBe(false);
  });

  it('updates when FlashList recycles the view for different words', () => {
    const previous = createProps(new Set([100]), words);
    const next = { ...previous, words: [...words] };

    expect(areArticleSentencePropsEqual(previous, next)).toBe(false);
  });
});
