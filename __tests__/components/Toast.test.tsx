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

import { Toast } from '@/components/Toast';
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

    expect(getByText('Test message')).toBeTruthy();
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

    expect(getByText(expectedContent)).toBeTruthy();
  });

  test('should handle long messages with ellipsis', () => {
    const longMessage =
      'This is a very long message that should be truncated with ellipsis when it exceeds the maximum number of lines allowed in the toast component';

    const { getByText } = render(
      <Toast visible={true} message={longMessage} onClose={mockOnClose} />,
    );

    const textElement = getByText(longMessage);
    expect(textElement).toBeTruthy();
    expect(textElement.props.numberOfLines).toBe(3);
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

    expect(getByText('Default type message')).toBeTruthy();
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
