/**
 * ReviewContextSentence Component Tests
 *
 * The example sentence is the review card's reason to be a surface, and it now
 * carries the reader's grammar colouring. Two things are worth guarding:
 *
 * - the practised word is marked from the corpus (root_id), not by matching the
 *   form against the sentence text. The old split-on-the-form approach marked
 *   EVERY occurrence, so a sentence using the word twice lit up twice and a form
 *   that was a substring of a longer word lit up inside it.
 * - the mark is the same tint-coloured underline SkiaSentenceWords uses for a
 *   saved word, never a text colour: in this palette `tint` is the same hue as
 *   the grammar palette's "possessive" and as `success` ("Knew it"), so a
 *   tinted word would read as a role or as a verdict.
 * - each word reaches the painter WHOLE, with its segments alongside it. The
 *   words used to be coloured spans nested in a `<Text>`; on Android each span
 *   is its own shaping run, so the Arabic came apart at every colour boundary.
 *
 * `SkiaColoredArabic` paints to a canvas, so its glyphs are not in the RN tree
 * and cannot be queried by text. It is stubbed below with a node that exposes
 * exactly what this component hands it — the word, its segments, and the
 * default colour — which is the contract these tests are actually about.
 */

import { describe, expect, jest, test } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { ReviewContextSentence } from '@/components/review/ReviewContextSentence';
import { STRINGS } from '@/constants/strings';
import type { ExampleWord, WordExample } from '@/services/sentences';

jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/components/common/SkiaColoredArabic', () => {
  const react = require('react');
  const { Text, View } = require('react-native');
  return {
    SkiaColoredArabic: ({
      text,
      segments,
      color,
    }: {
      text: string;
      segments?: { text: string; color: string }[];
      color?: string;
    }) =>
      react.createElement(
        View,
        // The whole word, exactly as handed to the painter — a split word would
        // show up here as a missing or truncated testID.
        { testID: `painted-word-${text}` },
        (segments?.length ? segments : [{ text, color: color ?? '' }]).map((segment, index) =>
          react.createElement(
            Text,
            { key: index, style: { color: segment.color || color } },
            segment.text,
          ),
        ),
      ),
  };
});

const ARABIC_TEXT = '#1a1a1a';
const DEFINITE_ARTICLE = '#C7894A';

function word(overrides: Partial<ExampleWord> & Pick<ExampleWord, 'position' | 'wordForm'>) {
  return {
    english: 'the book',
    rootId: 1,
    isTarget: false,
    ...overrides,
  } as ExampleWord;
}

function makeExample(overrides: Partial<WordExample> = {}): WordExample {
  return {
    rootId: 42,
    sentenceId: 7,
    arabic: 'قرأت الكتاب',
    english: 'I read the book',
    audioUrl: 'sentences/7.mp3',
    wordForm: 'الكتاب',
    wordType: 'Noun',
    words: [
      word({ position: 1, wordForm: 'قرأت', english: 'I read', rootId: 9 }),
      word({
        position: 2,
        wordForm: 'الكتاب',
        rootId: 42,
        isTarget: true,
        coloredSegments: [
          { text: 'ال', color: DEFINITE_ARTICLE, type: 'prefix' },
          { text: 'كتاب', color: ARABIC_TEXT, type: 'root' },
        ],
      }),
    ],
    ...overrides,
  };
}

/** True when at least one node showing `text` is painted `color`. Order-agnostic:
 *  a segment and the word that contains it can both match the text. */
function someNodeIsColored(nodes: { props: { style?: unknown } }[], color: string): boolean {
  return nodes.some(
    node => StyleSheet.flatten(node.props.style as StyleProp<TextStyle>)?.color === color,
  );
}

/** The marker underline is a sibling node, present only on the target word —
 *  rendered under `example-word-{position}-underline`, not on the word's own
 *  wrapper, so a query that finds nothing means "not marked". */
function underlineColor(
  queryByTestId: (testId: string) => { props: { style?: unknown } } | null,
  position: number,
): unknown {
  const node = queryByTestId(`example-word-${position}-underline`);
  return node
    ? StyleSheet.flatten(node.props.style as StyleProp<ViewStyle>)?.backgroundColor
    : undefined;
}

describe('ReviewContextSentence', () => {
  describe('The sentence', () => {
    test('renders every word of the sentence', () => {
      const { getAllByText } = render(<ReviewContextSentence example={makeExample()} />);

      expect(getAllByText('قرأت').length).toBeGreaterThan(0);
      expect(getAllByText('كتاب').length).toBeGreaterThan(0);
    });

    // Regression: the words were coloured spans nested inside one <Text>, which
    // Android shapes as a separate run per span — `أَزَالَتْ` painted with its
    // `تْ` floating free of the `ل`. Each word must reach the painter whole,
    // with its colours as data alongside it rather than as sibling text nodes.
    test('hands each word to the painter whole, not split per colour', () => {
      const { queryByTestId } = render(<ReviewContextSentence example={makeExample()} />);

      expect(queryByTestId('painted-word-الكتاب')).toBeTruthy();
      expect(queryByTestId('painted-word-قرأت')).toBeTruthy();
      // The prefix must NOT arrive as a word of its own.
      expect(queryByTestId('painted-word-ال')).toBeNull();
    });

    test('paints a grammar segment in its role colour', () => {
      const { getAllByText } = render(<ReviewContextSentence example={makeExample()} />);

      expect(someNodeIsColored(getAllByText('ال'), DEFINITE_ARTICLE)).toBe(true);
    });

    test('renders a word the analyzer found nothing in as plain text', () => {
      const { getAllByText } = render(<ReviewContextSentence example={makeExample()} />);

      // "قرأت" has no coloredSegments in this fixture — it must still appear,
      // in the neutral Arabic colour rather than disappearing or throwing.
      expect(someNodeIsColored(getAllByText('قرأت'), DEFINITE_ARTICLE)).toBe(false);
    });

    test('falls back to the raw sentence when the word breakdown is missing', () => {
      const { getByText } = render(<ReviewContextSentence example={makeExample({ words: [] })} />);

      expect(getByText('قرأت الكتاب')).toBeTruthy();
    });

    test('reads as one sentence to a screen reader', () => {
      const example = makeExample();
      const { getByLabelText } = render(<ReviewContextSentence example={example} />);

      expect(getByLabelText(example.arabic)).toBeTruthy();
    });
  });

  describe('Marking the practised word', () => {
    test('underlines the target word and only the target word', () => {
      const { queryByTestId } = render(<ReviewContextSentence example={makeExample()} />);

      expect(underlineColor(queryByTestId, 2)).toBeDefined();
      expect(underlineColor(queryByTestId, 1)).toBeUndefined();
    });

    // Regression: the old implementation split the sentence string on the
    // inflected form, so both occurrences were marked even though only one is
    // the practised root's.
    test('marks only the occurrence the corpus points at when a form repeats', () => {
      const example = makeExample({
        arabic: 'الكتاب الكتاب',
        words: [
          word({ position: 1, wordForm: 'الكتاب', rootId: 42, isTarget: true }),
          word({ position: 2, wordForm: 'الكتاب', rootId: 77, isTarget: false }),
        ],
      });
      const { queryByTestId } = render(<ReviewContextSentence example={example} />);

      expect(underlineColor(queryByTestId, 1)).toBeDefined();
      expect(underlineColor(queryByTestId, 2)).toBeUndefined();
    });

    test('marks the word with an underline, never with a text colour', () => {
      const { queryByTestId, getAllByText } = render(
        <ReviewContextSentence example={makeExample()} />,
      );

      // The underline is a sibling of the word's text…
      expect(underlineColor(queryByTestId, 2)).toBeDefined();
      // …and the word's own segments keep their grammar colours, which is what
      // makes the two channels readable at once.
      expect(someNodeIsColored(getAllByText('ال'), DEFINITE_ARTICLE)).toBe(true);
    });
  });

  describe('The audio control', () => {
    test('offers playback when there is a handler and a file', () => {
      const onPlay = jest.fn();
      const { getByLabelText } = render(
        <ReviewContextSentence example={makeExample()} onPlay={onPlay} />,
      );

      expect(getByLabelText(STRINGS.PLAY_SENTENCE_AUDIO)).toBeTruthy();
    });

    test('offers nothing when the sentence has no audio', () => {
      const { queryByLabelText } = render(
        <ReviewContextSentence example={makeExample({ audioUrl: null })} onPlay={jest.fn()} />,
      );

      expect(queryByLabelText(STRINGS.PLAY_SENTENCE_AUDIO)).toBeNull();
    });

    test('offers nothing when the card passed no handler', () => {
      const { queryByLabelText } = render(<ReviewContextSentence example={makeExample()} />);

      expect(queryByLabelText(STRINGS.PLAY_SENTENCE_AUDIO)).toBeNull();
    });
  });
});
