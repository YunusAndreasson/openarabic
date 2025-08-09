import { act, render } from '@testing-library/react-native';
import React from 'react';

import { ArabicWord } from '@/components/article/ArabicWord';

// Dynamic control for selection state
let mockIsSelected = false;

jest.mock('@/hooks/vocabulary', () => ({
  useArabicWord: () => ({ isSelected: mockIsSelected }),
  useArabicWordAnalysis: () => ({ hasComponents: false, coloredSegments: [] }),
}));

jest.mock('@/hooks/theme/useColors', () => ({
  useColors: () => ({
    arabicText: '#000',
    wordDueUnderline: '#f00',
    wordSelectionUnderline: '#0a0',
    transparent: 'transparent',
  }),
}));

describe('ArabicWord underline behavior', () => {
  it('adds underline when selected and removes when unselected (simulates bookmark toggle)', async () => {
    mockIsSelected = false;
    const word = { id: 1, position: 0, word_form: 'كلمة', english: 'word', root_id: 5 } as any;

    const { getByTestId, rerender } = render(
      <ArabicWord
        word={word}
        onTooltipOpen={() => {}}
        settings={{ fontScale: 1 }}
        testID="word-under-test"
      />
    );

    const getUnderlineColor = () => {
      const el = getByTestId('word-under-test');
      const style: any[] = Array.isArray(el.props.style) ? el.props.style.flat() : [el.props.style];
      const merged = Object.assign({}, ...style.filter(Boolean));
      return merged.borderBottomColor;
    };

    // Baseline transparent underline is always present to prevent layout jump
    expect(getUnderlineColor()).toBe('transparent');

    // Simulate bookmarking (selection becomes true)
    mockIsSelected = true;
    await act(async () => {
      rerender(
        <ArabicWord
          word={word}
          onTooltipOpen={() => {}}
          settings={{ fontScale: 1.1 }}
          testID="word-under-test"
        />
      );
    });

    // When selected, underline color should change from transparent to selection color
    expect(getUnderlineColor()).toBe('#0a0');

    // Simulate unbookmarking (selection becomes false)
    mockIsSelected = false;
    await act(async () => {
      rerender(
        <ArabicWord
          word={word}
          onTooltipOpen={() => {}}
          settings={{ fontScale: 1.2 }}
          testID="word-under-test"
        />
      );
    });

    // When unselected again, it should go back to transparent baseline color
    expect(getUnderlineColor()).toBe('transparent');
  });
});
