import { renderHook, act } from '@testing-library/react-native';

import { useNavigationWithDebounce } from '@/hooks/navigation/useNavigationWithDebounce';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

const { router } = require('expo-router');
const { handleError } = require('@/utils/errorHandling');

describe('useNavigationWithDebounce', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('navigates with push by default', () => {
    const { result } = renderHook(() => useNavigationWithDebounce());

    act(() => {
      result.current.navigateTo('/home');
    });

    expect(router.push).toHaveBeenCalledWith('/home');
  });

  it('navigates with replace option', () => {
    const { result } = renderHook(() => useNavigationWithDebounce());

    act(() => {
      result.current.navigateTo('/home', undefined, { replace: true });
    });

    expect(router.replace).toHaveBeenCalledWith('/home');
  });

  describe('error handling', () => {
    it('calls handleError when navigation throws', () => {
      (router.push as jest.Mock).mockImplementationOnce(() => {
        throw new Error('bad');
      });

      const { result } = renderHook(() => useNavigationWithDebounce());

      act(() => {
        result.current.navigateTo('/bad');
      });

      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  it('debounces rapid navigation calls', () => {
    const { result } = renderHook(() => useNavigationWithDebounce());

    act(() => {
      result.current.navigateTo('/home');
    });

    act(() => {
      jest.advanceTimersByTime(10);
    });

    act(() => {
      result.current.navigateTo('/profile');
    });

    act(() => {
      jest.advanceTimersByTime(10);
    });

    act(() => {
      result.current.navigateTo('/settings');
    });

    expect(router.push).toHaveBeenCalledTimes(1);
  });
});
