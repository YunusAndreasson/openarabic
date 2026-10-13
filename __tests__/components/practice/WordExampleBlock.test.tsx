/**
 * WordExampleBlock Component Tests
 *
 * The word screen's examples section has always been headed "In articles" while
 * naming no article and going nowhere — `article_id` arrived with every sentence
 * and was thrown away. Reading is where these words come from, so a word screen
 * that cannot send you back to the reading leaves the loop open one way.
 *
 * Two rules to hold on to:
 * - the WHOLE block is the control, not a link tacked underneath it
 * - an article the learner cannot reach (unpublished, RLS-hidden) costs the
 *   example its attribution, never the example itself
 */

import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { WordExampleBlock } from '@/components/practice/WordExampleBlock';
import { STRINGS } from '@/constants/strings';
import type { SentenceWithWords } from '@/services/sentences';
import type { RootId } from '@/types/branded.types';

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/components/article/ArticleSentence', () => {
  const { Text } = require('react-native');
  return {
    ArticleSentence: ({ sentence }: { sentence: { arabic: string } }) => (
      <Text>{sentence.arabic}</Text>
    ),
  };
});

const TARGET = 7 as unknown as RootId;

const sentence = (
  article: { id: number; title: string } | null = { id: 3, title: 'Bedouin Manners' },
): SentenceWithWords =>
  ({
    id: 10,
    arabic: 'قِلَّةُ التَّوْفِيقِ',
    english: 'Lack of success',
    sentence_words: [],
    article,
  }) as unknown as SentenceWithWords;

describe('WordExampleBlock', () => {
  test('names the article the sentence came from', () => {
    const { getByText } = render(
      <WordExampleBlock sentence={sentence()} highlightRootId={TARGET} showDivider={false} />,
    );

    expect(getByText('Bedouin Manners')).toBeTruthy();
  });

  test('the whole block opens the article, not a link beneath it', () => {
    const onOpenArticle = jest.fn();
    const { getByLabelText } = render(
      <WordExampleBlock
        sentence={sentence()}
        highlightRootId={TARGET}
        showDivider={false}
        onOpenArticle={onOpenArticle}
      />,
    );

    const label = STRINGS.WORD_EXAMPLE_OPEN_A11Y.replace('{title}', 'Bedouin Manners');
    fireEvent.press(getByLabelText(label));

    expect(onOpenArticle).toHaveBeenCalledWith({ id: 3, title: 'Bedouin Manners' }, 10);
  });

  test('still renders the example when there is no article to attribute it to', () => {
    const onOpenArticle = jest.fn();
    const { getByText, queryByLabelText } = render(
      <WordExampleBlock
        sentence={sentence(null)}
        highlightRootId={TARGET}
        showDivider={false}
        onOpenArticle={onOpenArticle}
      />,
    );

    // The sentence survives; only its attribution and its tap target are gone.
    expect(getByText('قِلَّةُ التَّوْفِيقِ')).toBeTruthy();
    expect(getByText('Lack of success')).toBeTruthy();
    expect(queryByLabelText(/^Read this sentence in/)).toBeNull();
  });

  test('claims no destination when the screen supplies no handler', () => {
    const { queryByLabelText, queryByTestId } = render(
      <WordExampleBlock sentence={sentence()} highlightRootId={TARGET} showDivider={false} />,
    );

    expect(queryByLabelText(/^Read this sentence in/)).toBeNull();
    expect(queryByTestId('mock-icon-chevron-forward')).toBeNull();
  });
});
