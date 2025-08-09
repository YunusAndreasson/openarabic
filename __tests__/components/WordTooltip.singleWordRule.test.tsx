import { render } from '@testing-library/react-native';
import React from 'react';

import { WordTooltip } from '@/components/article/WordTooltip';
import * as Animations from '@/hooks/animations/useTransformAnimation';

// Reanimated mock doesn't include springify chain – stub animations to plain objects
// Use global reanimated mock from jest.setup.js

describe('WordTooltip - single word rule', () => {
  it.skip('does not color-code when English is a single word', () => {
    // Stub transform animations used by WordTooltip so test doesn't depend on reanimated builder chain
    jest.spyOn(Animations, 'useTransformAnimation').mockReturnValue({
      value: { value: 1 },
      animatedStyle: {},
      startAnimation: () => {},
      reverseAnimation: () => {},
      setValue: () => {},
      reset: () => {},
      entering: {} as any,
      exiting: {} as any,
      transformType: 'scale',
    });
    const { getByTestId, UNSAFE_getAllByType } = render(
      <WordTooltip
        visible
        text="house"
        arabicWord="والبيت"
        layout={{ x: 0, y: 50, width: 40, height: 20 }}
      />
    );

    // Tooltip should render
    expect(getByTestId('word-tooltip')).toBeTruthy();

    // Expect only a single ThemedText with default color (no nested colored segments)
    // Using UNSAFE_getAllByType to count nested ThemedText components
    const textInstances = UNSAFE_getAllByType(require('@/components/ThemedText').ThemedText);
    // There should be exactly one text node when color-coding is not applied
    expect(textInstances.length).toBe(1);
  });
});
