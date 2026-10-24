/**
 * GlyphButton: an icon with no surface, as a button — the close glyph on a
 * card, the eye in a password field. It replaced three hand-rolled copies, one
 * of which (the reader's word-tap hint) gave no press feedback at all.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import React from 'react';
import { Pressable } from 'react-native';

import { GlyphButton } from '@/components/ui/GlyphButton';

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

describe('GlyphButton', () => {
  test('is a labelled button that runs its action', () => {
    const onPress = jest.fn();
    render(<GlyphButton accessibilityLabel="Dismiss" icon="close" onPress={onPress} />);

    const button = screen.getByLabelText('Dismiss');
    expect(button).toHaveProp('accessibilityRole', 'button');

    fireEvent.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('takes a target bigger than the glyph', () => {
    render(<GlyphButton accessibilityLabel="Dismiss" icon="close" onPress={jest.fn()} />);

    expect(screen.getByLabelText('Dismiss').props.hitSlop).toBeTruthy();
  });

  test('renders through the Pressable it is given (the reader passes gesture-handler’s)', () => {
    const Custom = jest.fn((props: React.ComponentProps<typeof Pressable>) => (
      <Pressable {...props} />
    ));

    render(
      <GlyphButton
        accessibilityLabel="Dismiss"
        icon="close"
        PressableComponent={Custom}
        onPress={jest.fn()}
      />,
    );

    expect(Custom).toHaveBeenCalled();
  });
});
