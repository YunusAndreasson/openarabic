/**
 * DictionarySortBar Component Tests
 *
 * The count on the right of this bar does three jobs: it says how many words are
 * below it, it names the active scope, and it is the control that changes both.
 *
 * It DOES restate the growth card's headline while the list is unfiltered. An
 * attempt to suppress that was reverted: the card's number comes from a 30-day
 * series of parsed `created_at`s and can legitimately be smaller than the number
 * of rows, so hiding this one would hide the discrepancy too. The visible text
 * and the accessible name are therefore always the same string — a control whose
 * accessible name does not contain its visible label cannot be reached by voice
 * input (WCAG 2.5.3).
 */

import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { DictionarySortBar } from '@/components/practice/DictionarySortBar';

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/utils/haptics', () => ({
  lightFeedback: jest.fn(),
  mediumFeedback: jest.fn(),
  successFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  errorFeedback: jest.fn(),
}));

describe('DictionarySortBar', () => {
  const renderBar = (props: Partial<React.ComponentProps<typeof DictionarySortBar>> = {}) =>
    render(
      <DictionarySortBar
        scope="all"
        sortField="difficulty"
        sortDirection="desc"
        wordCount={11}
        onSelectField={jest.fn()}
        onPressScope={jest.fn()}
        onClearScope={jest.fn()}
        {...props}
      />,
    );

  test('the accessible name is the visible label, so voice input can reach it', () => {
    const { getByLabelText, getByText } = renderBar();

    expect(getByText('11 words')).toBeTruthy();
    expect(getByLabelText('11 words')).toBeTruthy();
  });

  test('a scoped count leads with the scope it is describing', () => {
    const { getByText } = renderBar({ scope: 'struggling', wordCount: 4 });

    expect(getByText('Struggling · 4')).toBeTruthy();
  });

  test('opens the picker under a picker scope', () => {
    const onPressScope = jest.fn();
    const onClearScope = jest.fn();
    const { getByLabelText } = renderBar({ onPressScope, onClearScope });

    fireEvent.press(getByLabelText('11 words'));

    expect(onPressScope).toHaveBeenCalledTimes(1);
    expect(onClearScope).not.toHaveBeenCalled();
  });

  test('clears instead of opening under a scope the picker cannot show', () => {
    const onPressScope = jest.fn();
    const onClearScope = jest.fn();
    const { getByLabelText } = renderBar({
      scope: 'horizon-weeks',
      wordCount: 4,
      onPressScope,
      onClearScope,
    });

    fireEvent.press(getByLabelText('Holds for weeks · 4'));

    expect(onClearScope).toHaveBeenCalledTimes(1);
    expect(onPressScope).not.toHaveBeenCalled();
  });
});
