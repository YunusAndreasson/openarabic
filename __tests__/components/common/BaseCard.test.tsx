/**
 * BaseCard Component Tests
 *
 * Tests foundation card component used throughout the app.
 *
 * No style assertions here. `StyleSheet.flatten` is the identity function under
 * this jest setup, so anything asserted about a resolved style passes whatever
 * the component actually rendered. Surface, elevation and border are verified on
 * device instead; what is worth locking down in jest is the STRUCTURE each prop
 * combination produces — which branch renders, and what the accessibility tree
 * looks like.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';

import { BaseCard } from '@/components/common/BaseCard';

// Use shared mock factories
jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/hooks/animations', () =>
  require('@/__tests__/helpers/componentMocks').createAnimationHooksMock(),
);

describe('BaseCard', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders children correctly', () => {
      const { getByText } = render(
        <BaseCard>
          <Text>Card Content</Text>
        </BaseCard>,
      );
      expect(getByText('Card Content')).toBeTruthy();
    });

    test('renders with testID', () => {
      const { getByTestId } = render(
        <BaseCard testID="my-card">
          <Text>Content</Text>
        </BaseCard>,
      );
      expect(getByTestId('my-card')).toBeTruthy();
    });
  });

  describe('Axes', () => {
    // These render-without-throwing checks are the honest limit of what jest can
    // see: the axes resolve to style values, and style assertions are vacuous
    // here. They do catch a bad role -> token mapping, which would throw on the
    // lookup.
    test.each(['none', 'hairline', 'card', 'floating', 'modal'] as const)(
      'renders with %s elevation',
      elevation => {
        const { getByTestId } = render(
          <BaseCard testID="card" elevation={elevation}>
            <Text>Content</Text>
          </BaseCard>,
        );
        expect(getByTestId('card')).toBeTruthy();
      },
    );

    test.each(['card', 'elevation1', 'elevation2'] as const)('renders with %s surface', surface => {
      const { getByTestId } = render(
        <BaseCard testID="card" surface={surface}>
          <Text>Content</Text>
        </BaseCard>,
      );
      expect(getByTestId('card')).toBeTruthy();
    });

    test('renders bordered', () => {
      const { getByTestId } = render(
        <BaseCard testID="card" bordered>
          <Text>Content</Text>
        </BaseCard>,
      );
      expect(getByTestId('card')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    test('calls onPress when pressed', () => {
      const { getByTestId } = render(
        <BaseCard testID="pressable-card" onPress={mockOnPress}>
          <Text>Press Me</Text>
        </BaseCard>,
      );

      fireEvent.press(getByTestId('pressable-card'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    test('a repeat press inside the lock window fires once', () => {
      const { getByTestId } = render(
        <BaseCard testID="pressable-card" onPress={mockOnPress}>
          <Text>Press Me</Text>
        </BaseCard>,
      );

      const card = getByTestId('pressable-card');
      fireEvent.press(card);
      fireEvent.press(card);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    test('a static card renders no pressable', () => {
      const { getByTestId } = render(
        <BaseCard testID="static-card">
          <Text>Static Content</Text>
        </BaseCard>,
      );

      // The whole point of the static branch: no Pressable, and therefore none
      // of the press engine's hooks. `onPress` being absent from the host node
      // is what proves it took that branch.
      expect(getByTestId('static-card').props.onStartShouldSetResponder).toBeUndefined();
    });

    test('renders the PressableComponent it was handed', () => {
      // The escape hatch for screens whose gesture arena is owned by
      // react-native-gesture-handler — the article reader wraps its content in
      // an RNGH Pressable, and an RNGH ancestor beats any descendant still on
      // the JS responder system, so those cards took no taps at all. If this
      // prop stops reaching the tree, they go dead again in silence.
      const CustomPressable = jest.fn(({ children }: { children?: React.ReactNode }) => (
        <>{children}</>
      ));

      const { getByText } = render(
        <BaseCard onPress={mockOnPress} PressableComponent={CustomPressable}>
          <Text>Press Me</Text>
        </BaseCard>,
      );

      expect(CustomPressable).toHaveBeenCalled();
      expect(getByText('Press Me')).toBeTruthy();
    });

    test('does not fire onPress when disabled', () => {
      const { getByTestId } = render(
        <BaseCard testID="disabled-card" disabled onPress={mockOnPress}>
          <Text>Disabled</Text>
        </BaseCard>,
      );

      fireEvent.press(getByTestId('disabled-card'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    test('a pressable card defaults to the button role', () => {
      const { getByTestId } = render(
        <BaseCard testID="pressable-card" onPress={mockOnPress}>
          <Text>Press Me</Text>
        </BaseCard>,
      );

      expect(getByTestId('pressable-card').props.accessibilityRole).toBe('button');
    });

    test('an explicit role wins over the button default', () => {
      const { getByTestId } = render(
        <BaseCard
          testID="option-card"
          accessibilityRole="radio"
          accessibilityState={{ selected: true }}
          onPress={mockOnPress}
        >
          <Text>Option</Text>
        </BaseCard>,
      );

      const card = getByTestId('option-card');
      expect(card.props.accessibilityRole).toBe('radio');
      expect(card.props.accessibilityState).toMatchObject({ selected: true });
    });

    test('a static card keeps its accessibility props', () => {
      // These used to be dropped: they were only ever spread onto the
      // `Pressable`, so a labelled card with no `onPress` announced nothing.
      const { getByTestId } = render(
        <BaseCard
          testID="static-card"
          accessibilityLabel="Reading progress"
          accessibilityRole="summary"
        >
          <Text>Content</Text>
        </BaseCard>,
      );

      const card = getByTestId('static-card');
      expect(card.props.accessibilityLabel).toBe('Reading progress');
      expect(card.props.accessibilityRole).toBe('summary');
    });

    test('a static card has no implicit button role', () => {
      const { getByTestId } = render(
        <BaseCard testID="static-card">
          <Text>Content</Text>
        </BaseCard>,
      );

      expect(getByTestId('static-card').props.accessibilityRole).toBeUndefined();
    });
  });

  describe('Custom Styling', () => {
    test('accepts custom style prop', () => {
      const { getByTestId } = render(
        <BaseCard testID="card" style={{ marginTop: 20 }}>
          <Text>Styled Card</Text>
        </BaseCard>,
      );
      expect(getByTestId('card')).toBeTruthy();
    });

    test('accepts custom contentStyle prop', () => {
      const { getByText } = render(
        <BaseCard contentStyle={{ paddingHorizontal: 24 }}>
          <Text>Custom Content Style</Text>
        </BaseCard>,
      );
      expect(getByText('Custom Content Style')).toBeTruthy();
    });
  });
});
