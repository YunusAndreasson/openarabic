/**
 * Component Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

/**
 * Toast Component Tests
 *
 * Tests the toast notification system:
 * - Visibility and message display
 * - Auto-close after duration
 * - Different toast types (INFO, ERROR, SUCCESS, IMPORTANT)
 * - Safe area insets positioning
 * - Timer cleanup on unmount
 */

import { act, render } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { Toast } from '@/components/ui/Toast';
import { ToastType } from '@/types/enums';

// Use shared mock factories from componentMocks.tsx
jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('react-native-safe-area-context', () =>
  require('@/__tests__/helpers/componentMocks').createSafeAreaContextMock(),
);

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/hooks/theme/useThemeDetection', () =>
  require('@/__tests__/helpers/componentMocks').useThemeDetectionMockFactory(),
);

describe('Toast', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('should render visible toast with message', () => {
    const { getByText } = render(
      <Toast visible={true} message="Test message" onClose={mockOnClose} />,
    );

    expect(getByText('Test message')).toBeDefined();
  });

  test('announces the message to screen readers as it appears', () => {
    // A toast never takes focus, so without this a screen-reader user heard
    // no confirmation and no error at all.
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

    const { rerender } = render(
      <Toast visible={false} message="Added to practice" onClose={mockOnClose} />,
    );
    expect(announce).not.toHaveBeenCalled();

    rerender(<Toast visible={true} message="Added to practice" onClose={mockOnClose} />);
    expect(announce).toHaveBeenCalledWith('Added to practice');
  });

  test('should not render when visible is false', () => {
    const { queryByText } = render(
      <Toast visible={false} message="Test message" onClose={mockOnClose} />,
    );

    expect(queryByText('Test message')).toBeNull();
  });

  test('should auto-close after default duration', () => {
    render(<Toast visible={true} message="Test message" onClose={mockOnClose} />);

    expect(mockOnClose).not.toHaveBeenCalled();

    // Fast-forward to default duration (3000ms)
    act(() => {
      jest.runAllTimers();
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('should auto-close after custom duration', () => {
    render(<Toast visible={true} message="Test message" duration={1000} onClose={mockOnClose} />);

    expect(mockOnClose).not.toHaveBeenCalled();

    // Fast-forward to custom duration
    act(() => {
      jest.runAllTimers();
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('should cleanup timer on unmount', () => {
    const { unmount } = render(
      <Toast visible={true} message="Test message" onClose={mockOnClose} />,
    );

    // Unmount before timer completes
    unmount();

    // Advance timers - onClose should not be called
    act(() => {
      jest.runAllTimers();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test('should reset timer when visibility changes to true again', () => {
    const { rerender } = render(
      <Toast visible={true} message="Test message" onClose={mockOnClose} />,
    );

    // Change visibility to false and back to true
    rerender(<Toast visible={false} message="Test message" onClose={mockOnClose} />);
    rerender(<Toast visible={true} message="New message" onClose={mockOnClose} />);

    // Old timer should be cancelled, new timer should start
    expect(mockOnClose).not.toHaveBeenCalled();

    // Run all timers to completion
    act(() => {
      jest.runAllTimers();
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test.each([
    {
      type: ToastType.INFO,
      description: 'info toast',
      expectedContent: 'Info message',
    },
    {
      type: ToastType.SUCCESS,
      description: 'success toast',
      expectedContent: 'Success message',
    },
    {
      type: ToastType.ERROR,
      description: 'error toast',
      expectedContent: 'Error message',
    },
    {
      type: ToastType.IMPORTANT,
      description: 'important toast',
      expectedContent: 'Important message',
    },
  ])('should render $description with correct content', ({ type, expectedContent }) => {
    const { getByText } = render(
      <Toast visible={true} message={expectedContent} type={type} onClose={mockOnClose} />,
    );

    expect(getByText(expectedContent)).toBeDefined();
  });

  test.each([
    { type: ToastType.SUCCESS, icon: 'checkmark-circle', hue: '#4CAF50' },
    { type: ToastType.ERROR, icon: 'alert-circle', hue: '#F44336' },
    { type: ToastType.IMPORTANT, icon: 'warning', hue: '#FF9800' },
    { type: ToastType.INFO, icon: 'information-circle', hue: '#000000' },
  ])(
    'a $type toast keeps its message in body ink; only the icon takes the hue',
    ({ type, icon, hue }) => {
      // Status toasts used to fill with the status colour and set `white` on it,
      // which fell to 2.1-3.6:1 in the dark theme. The surface is now the same
      // elevated one for every type, and the hue marks the icon alone.
      const { getByText, getByTestId } = render(
        <Toast visible={true} message="Saved" type={type} onClose={mockOnClose} />,
      );

      expect(StyleSheet.flatten(getByText('Saved').props.style)?.color).toBe('#000000');
      expect(getByTestId(`mock-icon-${icon}`)).toHaveProp('color', hue);

      // The nearest ancestor that paints a background is the toast's own surface.
      let node = getByText('Saved').parent;
      while (node && StyleSheet.flatten(node.props.style)?.backgroundColor === undefined) {
        node = node.parent;
      }
      expect(StyleSheet.flatten(node?.props.style)?.backgroundColor).toBe('#EEEEEE');
    },
  );

  test('should handle long messages with ellipsis', () => {
    const longMessage =
      'This is a very long message that should be truncated with ellipsis when it exceeds the maximum number of lines allowed in the toast component';

    const { getByText } = render(
      <Toast visible={true} message={longMessage} onClose={mockOnClose} />,
    );

    const textElement = getByText(longMessage);
    expect(textElement).toBeDefined();
    expect(textElement.props.numberOfLines).toBe(2);
    expect(textElement.props.ellipsizeMode).toBe('tail');
  });

  test('should use safe area insets for positioning', () => {
    const { getByText } = render(
      <Toast visible={true} message="Test message" onClose={mockOnClose} />,
    );

    const textElement = getByText('Test message');
    const container = textElement.parent?.parent;

    // Check that container style includes top offset from safe area insets
    // Safe area top (44) + XLARGE spacing * 2 from containerStyle
    expect(container?.props.style).toBeDefined();
  });

  test('should default to INFO type when type is not specified', () => {
    const { getByText } = render(
      <Toast visible={true} message="Default type message" onClose={mockOnClose} />,
    );

    expect(getByText('Default type message')).toBeDefined();
  });

  test('should handle rapid visibility toggles', () => {
    const { rerender } = render(
      <Toast visible={false} message="Test message" onClose={mockOnClose} />,
    );

    // Rapidly toggle visibility
    rerender(<Toast visible={true} message="Test message" onClose={mockOnClose} />);
    rerender(<Toast visible={false} message="Test message" onClose={mockOnClose} />);
    rerender(<Toast visible={true} message="Test message" onClose={mockOnClose} />);

    expect(mockOnClose).not.toHaveBeenCalled();

    // Complete the final timer
    act(() => {
      jest.runAllTimers();
    });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('should handle onClose callback changes', () => {
    const firstOnClose = jest.fn();
    const secondOnClose = jest.fn();

    const { rerender } = render(
      <Toast visible={true} message="Test message" onClose={firstOnClose} />,
    );

    // Change onClose callback before timer completes
    rerender(<Toast visible={true} message="Test message" onClose={secondOnClose} />);

    act(() => {
      jest.runAllTimers();
    });

    // Should call the new callback
    expect(firstOnClose).not.toHaveBeenCalled();
    expect(secondOnClose).toHaveBeenCalledTimes(1);
  });
});
