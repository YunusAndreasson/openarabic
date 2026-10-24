/**
 * WordListRow Component Tests
 *
 * The one row shared by the dictionary index and `/words-to-revisit`. Its whole
 * point is that those two surfaces cannot drift apart again, so what is worth
 * guarding is the contract callers now rely on rather than the pixels:
 *
 * - a chevron appears EXACTLY when the row leads somewhere. Both former callers
 *   got this wrong in opposite directions — the dictionary drew one on every
 *   row, the revisit sheet drew none on rows that led nowhere and then gained a
 *   destination — which is why the rule lives in the component now
 * - one trailing slot, whatever the caller puts in it
 * - the divider is opt-in, because the dictionary's separators come from
 *   FlashList and the sheet's have to come from the row
 */

import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { WordListRow } from '@/components/practice/WordListRow';
import { ThemedText } from '@/components/primitives/ThemedText';

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('react-native-gesture-handler', () => {
  const { Pressable } = require('react-native');
  return { Pressable };
});

const CHEVRON = 'mock-icon-chevron-forward';

describe('WordListRow', () => {
  const renderRow = (props: Partial<React.ComponentProps<typeof WordListRow>> = {}) =>
    render(
      <WordListRow accessibilityLabel="كتب, To write" arabic="كتب" gloss="To write" {...props} />,
    );

  test('renders the gloss and the Arabic', () => {
    const { getByText } = renderRow();

    expect(getByText('كتب')).toBeTruthy();
    expect(getByText('To write')).toBeTruthy();
  });

  test('draws a chevron when — and only when — the row leads somewhere', () => {
    expect(renderRow({ onPress: jest.fn() }).queryByTestId(CHEVRON)).toBeTruthy();
    expect(renderRow().queryByTestId(CHEVRON)).toBeNull();
  });

  test('calls onPress', () => {
    const onPress = jest.fn();
    const { getByLabelText } = renderRow({ onPress });

    fireEvent.press(getByLabelText('كتب, To write'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('announces itself as a button, so a screen reader offers the action', () => {
    // `ListRow` defaults this to 'button' and the revisit sheet used to get it
    // for free; lifting the composition out of ListRow dropped it, and both
    // word lists read out their contents then stopped.
    const { getByLabelText } = renderRow({ onPress: jest.fn() });

    expect(getByLabelText('كتب, To write').props.accessibilityRole).toBe('button');
  });

  test('is inert without onPress, rather than a control that does nothing', () => {
    const { getByLabelText } = renderRow();

    const row = getByLabelText('كتب, To write');
    expect(row.props.onPress).toBeUndefined();
    // And it does not claim to be a button it is not.
    expect(row.props.accessibilityRole).toBeUndefined();
  });

  // The row used to be a copy of ListRow on gesture-handler's Pressable, and
  // the copy skipped ListRow's press lock: a double-tap pushed the word screen
  // twice. It is ListRow now, so the lock comes with it.
  test('a double-tap opens the word once', () => {
    const onPress = jest.fn();
    const { getByLabelText } = renderRow({ onPress });

    fireEvent.press(getByLabelText('كتب, To write'));
    fireEvent.press(getByLabelText('كتب, To write'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('renders whatever the caller puts in the trailing slot', () => {
    const { getByText } = renderRow({
      trailing: <ThemedText>3× forgot</ThemedText>,
    });

    expect(getByText('3× forgot')).toBeTruthy();
  });

  test('carries the accessibility label the caller composed', () => {
    const { getByLabelText } = renderRow({
      accessibilityLabel: 'كتب, To write, Easy, memory holds for 2 weeks',
    });

    expect(getByLabelText('كتب, To write, Easy, memory holds for 2 weeks')).toBeTruthy();
  });
});
