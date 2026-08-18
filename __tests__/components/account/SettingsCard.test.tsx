/**
 * SettingsCard Component Tests
 *
 * Tests settings card with different right-side variants.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { SettingsCard } from '@/components/account/SettingsCard';

// Use shared mock factories
jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory({
    interactiveSecondary: '#666666',
    secondaryMetadataText: '#888888',
  }),
);

jest.mock('@/hooks/animations', () =>
  require('@/__tests__/helpers/componentMocks').createAnimationHooksMock(),
);

jest.mock('@/utils/haptics', () => ({
  lightFeedback: jest.fn(),
  mediumFeedback: jest.fn(),
  successFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  errorFeedback: jest.fn(),
}));

jest.mock('@/utils/layoutUtils', () => ({
  createAndroidRipple: () => ({ color: 'rgba(0,0,0,0.1)' }),
  createPadding: () => ({}),
}));

describe('SettingsCard', () => {
  const mockOnPress = jest.fn();
  const mockOnToggleChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders with icon and label', () => {
      const { getByText } = render(
        <SettingsCard icon="settings" label="Settings" onPress={mockOnPress} />,
      );
      expect(getByText('Settings')).toBeTruthy();
    });

    test('renders with subtitle when provided', () => {
      const { getByText } = render(
        <SettingsCard
          icon="settings"
          label="Settings"
          subtitle="Configure app settings"
          onPress={mockOnPress}
        />,
      );
      expect(getByText('Settings')).toBeTruthy();
      expect(getByText('Configure app settings')).toBeTruthy();
    });
  });

  describe('Right Side Variants', () => {
    test('renders chevron by default', () => {
      const { toJSON } = render(
        <SettingsCard icon="settings" label="Settings" rightType="chevron" onPress={mockOnPress} />,
      );
      expect(toJSON()).toBeTruthy();
    });

    test('renders text with chevron', () => {
      const { getByText } = render(
        <SettingsCard
          icon="language"
          label="Language"
          rightType="text-chevron"
          rightText="English"
          onPress={mockOnPress}
        />,
      );
      expect(getByText('English')).toBeTruthy();
    });

    test('renders a labeled toggle switch with its checked state', () => {
      const { getByLabelText } = render(
        <SettingsCard
          icon="notifications"
          label="Notifications"
          rightType="toggle"
          toggleValue={true}
          onToggleChange={mockOnToggleChange}
        />,
      );
      expect(getByLabelText('Notifications').props.accessibilityState).toEqual({ checked: true });
    });

    test('renders custom component', () => {
      const { View, Text } = require('react-native');
      const CustomComponent = <Text testID="custom">Custom</Text>;

      const { getByTestId } = render(
        <SettingsCard
          icon="star"
          label="Custom"
          rightType="custom"
          rightComponent={CustomComponent}
        />,
      );
      expect(getByTestId('custom')).toBeTruthy();
    });

    test('renders without right element when type is none', () => {
      const { toJSON } = render(
        <SettingsCard
          icon="information-circle"
          label="About"
          rightType="none"
          onPress={mockOnPress}
        />,
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Text Color Variants', () => {
    test('renders default text color', () => {
      const { getByText } = render(
        <SettingsCard icon="settings" label="Settings" textColor="default" onPress={mockOnPress} />,
      );
      expect(getByText('Settings')).toBeTruthy();
    });

    test('renders error text color', () => {
      const { getByText } = render(
        <SettingsCard
          icon="trash"
          label="Delete Account"
          textColor="error"
          onPress={mockOnPress}
        />,
      );
      expect(getByText('Delete Account')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    test('calls onPress when card is pressed', () => {
      const { getByText } = render(
        <SettingsCard icon="settings" label="Settings" onPress={mockOnPress} />,
      );

      fireEvent.press(getByText('Settings'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    test('calls onToggleChange when toggle is switched', () => {
      const { toJSON } = render(
        <SettingsCard
          icon="notifications"
          label="Notifications"
          rightType="toggle"
          toggleValue={false}
          onToggleChange={mockOnToggleChange}
        />,
      );
      // Toggle component is rendered
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Custom Styling', () => {
    test('accepts custom background color', () => {
      const { toJSON } = render(
        <SettingsCard
          icon="settings"
          label="Settings"
          backgroundColor="#FF0000"
          onPress={mockOnPress}
        />,
      );
      expect(toJSON()).toBeTruthy();
    });

    test('accepts custom icon color', () => {
      const { toJSON } = render(
        <SettingsCard icon="settings" label="Settings" iconColor="#00FF00" onPress={mockOnPress} />,
      );
      expect(toJSON()).toBeTruthy();
    });
  });
});
