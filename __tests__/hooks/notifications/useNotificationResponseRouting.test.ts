import { describe, expect, jest, test } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';

const mockUnsubscribe = jest.fn();
const mockObserve = jest.fn<(navigate: (path: string) => void) => () => void>();

jest.mock('@/services/notificationService', () => ({
  observeNotificationResponses: (navigate: (path: string) => void) => mockObserve(navigate),
}));

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn() },
}));

import { useNotificationResponseRouting } from '@/hooks/notifications/useNotificationResponseRouting';

describe('useNotificationResponseRouting', () => {
  test('holds routing back until the navigator is ready', () => {
    mockObserve.mockReturnValue(mockUnsubscribe);
    const { rerender } = renderHook(
      ({ ready }: { ready: boolean }) => useNotificationResponseRouting(ready),
      { initialProps: { ready: false } },
    );

    expect(mockObserve).not.toHaveBeenCalled();

    rerender({ ready: true });
    expect(mockObserve).toHaveBeenCalledTimes(1);
  });

  test('navigates to the route a tap names, and unsubscribes on unmount', () => {
    mockObserve.mockReturnValue(mockUnsubscribe);
    const { unmount } = renderHook(() => useNotificationResponseRouting(true));

    const navigate = mockObserve.mock.calls[0]?.[0];
    navigate?.('/practice');
    expect(router.navigate).toHaveBeenCalledWith('/practice');

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
