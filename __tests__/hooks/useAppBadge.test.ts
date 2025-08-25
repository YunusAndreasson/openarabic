import { act, renderHook } from '@testing-library/react-native';

import { useAppBadge } from '@/hooks/useAppBadge';

// Mock notification service
const mockSetAppBadgeCount = jest.fn();
const mockClearAppBadge = jest.fn();
const mockCanUseBadge = jest.fn();

jest.mock('@/services/notificationService', () => ({
  setAppBadgeCount: mockSetAppBadgeCount,
  clearAppBadge: mockClearAppBadge,
  canUseBadge: mockCanUseBadge,
}));

// Mock store selector to return due words count
const mockUseDueWordsCount = jest.fn();
jest.mock('@/store/selectors/vocabularySelectors', () => ({
  useDueWordsCount: mockUseDueWordsCount,
}));

describe('useAppBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanUseBadge.mockResolvedValue(true);
    mockSetAppBadgeCount.mockResolvedValue(true);
    mockClearAppBadge.mockResolvedValue(true);
  });

  it('updates badge when due words count changes', async () => {
    mockUseDueWordsCount.mockReturnValue(5);

    renderHook(() => useAppBadge());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockCanUseBadge).toHaveBeenCalled();
    expect(mockSetAppBadgeCount).toHaveBeenCalledWith(5);
  });

  it('clears badge when due words count is zero', async () => {
    mockUseDueWordsCount.mockReturnValue(0);

    renderHook(() => useAppBadge());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockCanUseBadge).toHaveBeenCalled();
    expect(mockClearAppBadge).toHaveBeenCalled();
    expect(mockSetAppBadgeCount).not.toHaveBeenCalled();
  });

  it('does not update badge when badge permission not available', async () => {
    mockCanUseBadge.mockResolvedValue(false);
    mockUseDueWordsCount.mockReturnValue(5);

    renderHook(() => useAppBadge());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockCanUseBadge).toHaveBeenCalled();
    expect(mockSetAppBadgeCount).not.toHaveBeenCalled();
    expect(mockClearAppBadge).not.toHaveBeenCalled();
  });

  it('handles changes in due words count', async () => {
    mockUseDueWordsCount.mockReturnValueOnce(3).mockReturnValueOnce(7);

    const { rerender } = renderHook(() => useAppBadge());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockSetAppBadgeCount).toHaveBeenCalledWith(3);

    rerender();

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockSetAppBadgeCount).toHaveBeenCalledWith(7);
  });

  it('handles transition from non-zero to zero due words', async () => {
    mockUseDueWordsCount.mockReturnValueOnce(3).mockReturnValueOnce(0);

    const { rerender } = renderHook(() => useAppBadge());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockSetAppBadgeCount).toHaveBeenCalledWith(3);

    rerender();

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockClearAppBadge).toHaveBeenCalled();
  });

  it('handles errors in badge operations gracefully', async () => {
    mockCanUseBadge.mockRejectedValue(new Error('Permission check failed'));
    mockUseDueWordsCount.mockReturnValue(5);

    expect(() => renderHook(() => useAppBadge())).not.toThrow();

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockCanUseBadge).toHaveBeenCalled();
    expect(mockSetAppBadgeCount).not.toHaveBeenCalled();
  });
});