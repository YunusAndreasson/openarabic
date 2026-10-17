/**
 * SkiaSentenceWords: a sentence's Arabic words on one Skia canvas, with one
 * native press target per word laid over it.
 *
 * The canvas itself renders nothing under test (the Skia mock's component
 * exports reset to empty), so these tests pin the native side the user and the
 * screen reader actually touch: where each word's target sits, what a press or
 * a long-press reports, how a word is announced, and the plain-Text fallback
 * when there is no GPU.
 */

import { fireEvent, render, type RenderResult } from '@testing-library/react-native';
import React from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { Canvas, Group, type SkPaint } from 'react-native-skia';

import { SkiaSentenceWords } from '@/components/article/SkiaSentenceWords';
import type { SentenceWord } from '@/types/vocabulary.types';

import { measuring, type MeasureCallback } from '../../helpers/testUtils';
import { rootId } from '@/__tests__/helpers/ids';

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/hooks/theme/useSkiaFonts', () => ({
  useSkiaFonts: () => ({
    isReady: true,
    fontSize: 17,
    fontFamily: 'Noto Sans Arabic',
    fontManager: {},
  }),
}));

// A plain function: the shared jest.fn() in jest.setup loses its implementation
// to `resetMocks`, and the active-word reaction would never reach React.
jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (callback: (...args: unknown[]) => void, ...args: unknown[]) => callback(...args),
}));

jest.mock('@/hooks/theme/useSkiaGpuAvailable', () => ({
  useSkiaGpuAvailable: jest.fn(),
}));

jest.mock('@/hooks/vocabulary/useSentenceSelectedRoots', () => ({
  useSentenceSelectedRoots: jest.fn(),
}));

const { useSkiaGpuAvailable } = require('@/hooks/theme/useSkiaGpuAvailable');
const { useSentenceSelectedRoots } = require('@/hooks/vocabulary/useSentenceSelectedRoots');

const createWord = (position: number, overrides: Partial<SentenceWord> = {}): SentenceWord => ({
  id: position + 1,
  position,
  word_form: ['كتاب', 'جميل', 'جدا'][position] ?? 'كلمة',
  english: 'book',
  difficulty_level: 1,
  grammar_note: null,
  root_id: rootId(position + 1),
  sentence_id: 1,
  word_type_id: 1,
  audio_url: null,
  root: null,
  word_type: null,
  coloredSegments: [],
  ...overrides,
});

const WORDS = [createWord(0), createWord(1), createWord(2)];
const NO_SELECTION: ReadonlySet<number> = new Set();

/** The block reports its width the way Fabric does on the first layout pass. */
const layOut = (screen: RenderResult, width = 360) => {
  fireEvent(screen.getByTestId('sentence-words-block'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 0 } },
  });
};

const flatStyle = (element: { props: { style?: unknown } }) =>
  Object.assign({}, ...[element.props.style].flat(Infinity)) as Record<string, number>;

describe('SkiaSentenceWords', () => {
  beforeEach(() => {
    jest.mocked(useSkiaGpuAvailable).mockReturnValue(true);
    jest.mocked(useSentenceSelectedRoots).mockReturnValue(NO_SELECTION);
  });

  describe('layout', () => {
    test('draws nothing until it knows its width, rather than a provisional layout', () => {
      const screen = render(<SkiaSentenceWords words={WORDS} selectedRootIds={NO_SELECTION} />);

      expect(screen.queryByTestId('sentence-word-0')).toBeNull();

      layOut(screen);

      expect(screen.getByTestId('sentence-word-0')).toBeTruthy();
      expect(screen.getByTestId('sentence-word-2')).toBeTruthy();
    });

    test('places the first word at the right edge and the next ones to its left', () => {
      const screen = render(<SkiaSentenceWords words={WORDS} selectedRootIds={NO_SELECTION} />);
      layOut(screen);

      const first = flatStyle(screen.getByTestId('sentence-word-0'));
      const second = flatStyle(screen.getByTestId('sentence-word-1'));

      expect(first.left).toBeGreaterThan(second.left);
      expect(first.top).toBe(second.top);
    });

    test('wraps onto a second line when the sentence is narrower than the words', () => {
      const screen = render(<SkiaSentenceWords words={WORDS} selectedRootIds={NO_SELECTION} />);
      layOut(screen, 80);

      const first = flatStyle(screen.getByTestId('sentence-word-0'));
      const third = flatStyle(screen.getByTestId('sentence-word-2'));

      expect(third.top).toBeGreaterThan(first.top);
    });
  });

  describe('the word whose tooltip is open', () => {
    // The canvas renders nothing under the reset Skia mock; pass its children
    // through so the per-word groups are recorded.
    beforeEach(() => {
      jest.mocked(Canvas).mockImplementation(({ children }) => <>{children}</>);
      jest.mocked(Group).mockImplementation(({ children }) => <>{children}</>);
    });

    const activeWord = (id: number | null) =>
      ({ value: id, get: () => id }) as unknown as SharedValue<string | number | null>;

    /** The `layer` of each word's group in the latest draw, in word order. */
    const latestLayers = () =>
      jest
        .mocked(Group)
        .mock.calls.slice(-WORDS.length)
        .map(([props]) => (props as { layer?: SkPaint }).layer);

    test('is dimmed through a layer of its own, since a paragraph ignores group opacity', () => {
      const screen = render(
        <SkiaSentenceWords
          words={WORDS}
          selectedRootIds={NO_SELECTION}
          activeWordIdSV={activeWord(WORDS[1]!.id)}
        />,
      );
      layOut(screen);

      const [first, active, last] = latestLayers();

      expect(active?.getAlphaf()).toBe(0.7);
      expect(first).toBeUndefined();
      expect(last).toBeUndefined();
    });

    test('leaves the sentence without a layer when the tooltip is in another sentence', () => {
      const screen = render(
        <SkiaSentenceWords
          words={WORDS}
          selectedRootIds={NO_SELECTION}
          activeWordIdSV={activeWord(999)}
        />,
      );
      layOut(screen);

      expect(latestLayers()).toEqual([undefined, undefined, undefined]);
    });
  });

  describe('selection', () => {
    test('uses a screen-level selection without subscribing per sentence', () => {
      render(<SkiaSentenceWords words={WORDS} selectedRootIds={NO_SELECTION} />);

      expect(useSentenceSelectedRoots).not.toHaveBeenCalled();
    });

    test('subscribes once for the whole sentence when no selection is passed', () => {
      render(<SkiaSentenceWords words={WORDS} />);

      expect(useSentenceSelectedRoots).toHaveBeenCalledWith(WORDS);
    });
  });

  describe('pressing a word', () => {
    test('is not a control at all without a handler, rather than an inert one', () => {
      const screen = render(<SkiaSentenceWords words={WORDS} selectedRootIds={NO_SELECTION} />);
      layOut(screen);

      const word = screen.getByTestId('sentence-word-0');
      expect(word.props.onPress).toBeUndefined();
      expect(word.props.accessibilityRole).toBe('text');
    });

    test('opens the tooltip on the word it was measured at', () => {
      const onWordPress = jest.fn();
      const screen = render(
        <SkiaSentenceWords
          words={WORDS}
          onWordPress={onWordPress}
          selectedRootIds={NO_SELECTION}
        />,
        measuring((cb: MeasureCallback) => cb(12, 34, 56, 20)),
      );
      layOut(screen);

      fireEvent.press(screen.getByTestId('sentence-word-1'));

      expect(onWordPress).toHaveBeenCalledWith(WORDS[1], { x: 12, y: 34, width: 56, height: 20 });
    });

    test('ignores a measurement that came back with no frame', () => {
      const onWordPress = jest.fn();
      const screen = render(
        <SkiaSentenceWords
          words={WORDS}
          onWordPress={onWordPress}
          selectedRootIds={NO_SELECTION}
        />,
        // A word scrolled out of the window measures as a zero box.
        measuring((cb: MeasureCallback) => cb(undefined, undefined, 0, 0)),
      );
      layOut(screen);

      fireEvent.press(screen.getByTestId('sentence-word-0'));

      expect(onWordPress).not.toHaveBeenCalled();
    });

    test('survives a measurement that throws', () => {
      const onWordPress = jest.fn();
      const screen = render(
        <SkiaSentenceWords
          words={WORDS}
          onWordPress={onWordPress}
          selectedRootIds={NO_SELECTION}
        />,
        measuring(() => {
          throw new Error('Measurement failed');
        }),
      );
      layOut(screen);

      expect(() => fireEvent.press(screen.getByTestId('sentence-word-0'))).not.toThrow();
      expect(onWordPress).not.toHaveBeenCalled();
    });

    test('saves on a long-press even when the measurement fails', () => {
      const onWordLongPress = jest.fn();
      const screen = render(
        <SkiaSentenceWords
          words={WORDS}
          onWordLongPress={onWordLongPress}
          selectedRootIds={NO_SELECTION}
        />,
        measuring(() => {
          throw new Error('Measurement failed');
        }),
      );
      layOut(screen);

      fireEvent(screen.getByTestId('sentence-word-0'), 'longPress');

      expect(onWordLongPress).toHaveBeenCalledWith(WORDS[0], undefined);
    });
  });

  describe('screen readers', () => {
    test('announces an interactive word as an Arabic button with a save action', () => {
      const onWordLongPress = jest.fn();
      const screen = render(
        <SkiaSentenceWords
          words={WORDS}
          onWordPress={jest.fn()}
          onWordLongPress={onWordLongPress}
          selectedRootIds={NO_SELECTION}
        />,
        measuring((cb: MeasureCallback) => cb(12, 34, 56, 20)),
      );
      layOut(screen);

      const element = screen.getByLabelText('كتاب');
      expect(element.props.accessibilityRole).toBe('button');
      expect(element.props.accessibilityLanguage).toBe('ar');
      expect(element.props.accessibilityActions).toEqual([
        expect.objectContaining({ name: 'longpress' }),
      ]);

      // The save that press-and-hold does, reachable without press-and-hold.
      fireEvent(element, 'accessibilityAction', { nativeEvent: { actionName: 'longpress' } });
      expect(onWordLongPress).toHaveBeenCalledWith(WORDS[0], {
        x: 12,
        y: 34,
        width: 56,
        height: 20,
      });
    });
  });

  describe('without a GPU', () => {
    beforeEach(() => {
      jest.mocked(useSkiaGpuAvailable).mockReturnValue(false);
    });

    test('renders the Arabic as plain Text, which needs no layout pass', () => {
      const screen = render(<SkiaSentenceWords words={WORDS} selectedRootIds={NO_SELECTION} />);

      expect(screen.getByText('كتاب')).toBeTruthy();
      expect(screen.getByText('جدا')).toBeTruthy();
    });

    test('keeps the words pressable', () => {
      const onWordPress = jest.fn();
      const screen = render(
        <SkiaSentenceWords
          words={WORDS}
          onWordPress={onWordPress}
          selectedRootIds={NO_SELECTION}
        />,
        measuring((cb: MeasureCallback) => cb(1, 2, 3, 4)),
      );

      fireEvent.press(screen.getByTestId('sentence-word-2'));

      expect(onWordPress).toHaveBeenCalledWith(WORDS[2], { x: 1, y: 2, width: 3, height: 4 });
    });
  });
});
