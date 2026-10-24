import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { useAccountScreen } from '@/hooks/account/useAccountScreen';
import { reminderClockSet, remindersToggled } from '@/store/settingsSlice';

const mockClearCache = jest.fn(async (..._args: unknown[]) => undefined);
const mockGetCacheSize = jest.fn(async (..._args: unknown[]) => 1024);
const mockDispatch = jest.fn();
const mockEnsurePermissions = jest.fn(async (..._args: unknown[]) => true);
const mockRecordAccepted = jest.fn();
const mockClearPersistedQueryCache = jest.fn(async (..._args: unknown[]) => undefined);
const mockStopAudio = jest.fn(async (..._args: unknown[]) => undefined);
const mockTrackSignOut = jest.fn(async (..._args: unknown[]) => undefined);
const mockAnalyticsReset = jest.fn(async (..._args: unknown[]) => undefined);
const mockSignOut = jest.fn(async (..._args: unknown[]) => ({ error: null }));
const mockGetUser = jest.fn();
const mockDeleteAllProgress = jest.fn(async (..._args: unknown[]) => undefined);
const mockQueryClear = jest.fn();
const mockRemoveQueries = jest.fn();
const mockRefetchQueries = jest.fn(async (..._args: unknown[]) => undefined);
const mockRouterReplace = jest.fn();
const mockHandleError = jest.fn();

let mockReminderTime = { enabled: false, hour: 19, minute: 0 };

jest.mock('@tanstack/react-query', () => ({
  queryOptions: (options: unknown) => options,
  skipToken: Symbol('skipToken'),
  useQueryClient: () => ({
    clear: (...args: unknown[]) => mockQueryClear(...args),
    removeQueries: (...args: unknown[]) => mockRemoveQueries(...args),
    refetchQueries: (...args: unknown[]) => mockRefetchQueries(...args),
  }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: (...args: unknown[]) => mockRouterReplace(...args) },
}));

jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'qa@example.com' } }),
}));

const mockShowToast = jest.fn();
jest.mock('@/components/providers', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

jest.mock('@/hooks/audio/useAudioCache', () => ({
  useAudioCache: () => ({ clearCache: mockClearCache, getCacheSize: mockGetCacheSize }),
}));

// The global react-redux stub has a fixed state and a dispatch that drops
// actions, so the reminder setting and its dispatch are mocked at the hooks.
jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: { settings: { reminderTime: unknown } }) => unknown) =>
    selector({ settings: { reminderTime: mockReminderTime } }),
}));

jest.mock('@/services/notificationService', () => ({
  ensurePermissions: (...args: unknown[]) => mockEnsurePermissions(...args),
}));
jest.mock('@/utils/notificationPromptStorage', () => ({
  recordAccepted: (...args: unknown[]) => mockRecordAccepted(...args),
}));
jest.mock('@/utils/queryPersistence', () => ({
  clearPersistedQueryCache: (...args: unknown[]) => mockClearPersistedQueryCache(...args),
}));
jest.mock('@/services/audioPlayer', () => ({
  simpleAudioService: { stop: (...args: unknown[]) => mockStopAudio(...args) },
}));
jest.mock('@/services/analytics', () => ({
  analytics: {
    track: jest.fn(),
    trackSignOut: (...args: unknown[]) => mockTrackSignOut(...args),
    reset: (...args: unknown[]) => mockAnalyticsReset(...args),
  },
}));
jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  },
}));
jest.mock('@/services/readingProgress', () => ({
  ReadingProgressService: {
    deleteAllProgress: (...args: unknown[]) => mockDeleteAllProgress(...args),
  },
}));
jest.mock('@/utils/errorHandling', () => ({
  handleError: (...args: unknown[]) => mockHandleError(...args),
}));
jest.mock('@/utils/haptics', () => ({ lightFeedback: jest.fn(), errorFeedback: jest.fn() }));

describe('useAccountScreen', () => {
  let alertSpy: jest.SpiedFunction<typeof Alert.alert>;

  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    mockReminderTime = { enabled: false, hour: 19, minute: 0 };
    mockGetCacheSize.mockResolvedValue(1024);
    mockClearCache.mockResolvedValue(undefined);
    mockClearPersistedQueryCache.mockResolvedValue(undefined);
    mockEnsurePermissions.mockResolvedValue(true);
    mockStopAudio.mockResolvedValue(undefined);
    mockTrackSignOut.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'qa@example.com' } },
      error: null,
    });
    mockAnalyticsReset.mockResolvedValue(undefined);
    mockDeleteAllProgress.mockResolvedValue(undefined);
    mockRefetchQueries.mockResolvedValue(undefined);
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  test('loads and exposes the audio cache size', async () => {
    const { result } = renderHook(() => useAccountScreen());

    await waitFor(() => expect(result.current.cacheSize).toBe(1024));
  });

  test('does not enable reminders when notification permission is denied', async () => {
    mockEnsurePermissions.mockResolvedValue(false);
    const { result } = renderHook(() => useAccountScreen());

    await act(async () => {
      await result.current.handleReminderToggle(true);
    });

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(Array),
    );
  });

  test('enables reminders and records acceptance when permission is granted', async () => {
    const { result } = renderHook(() => useAccountScreen());

    await act(async () => {
      await result.current.handleReminderToggle(true);
    });

    expect(mockRecordAccepted).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(remindersToggled(true));
  });

  test('turns reminders off without asking for permission', async () => {
    mockReminderTime = { enabled: true, hour: 19, minute: 0 };
    const { result } = renderHook(() => useAccountScreen());

    await act(async () => {
      await result.current.handleReminderToggle(false);
    });

    expect(mockEnsurePermissions).not.toHaveBeenCalled();
    expect(mockRecordAccepted).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(remindersToggled(false));
  });

  test('sets the reminder time as its own event', () => {
    const { result } = renderHook(() => useAccountScreen());

    act(() => result.current.handleTimeSet(7, 45));

    expect(mockDispatch).toHaveBeenCalledWith(reminderClockSet({ hour: 7, minute: 45 }));
    expect(result.current.formatReminderTime(7, 5)).toBe('07:05');
  });

  test('stops audio and signs out only after destructive confirmation', async () => {
    const { result } = renderHook(() => useAccountScreen());

    act(() => result.current.handleSignOut());
    expect(mockSignOut).not.toHaveBeenCalled();

    const confirmationButtons = alertSpy.mock.calls[0]?.[2];
    const signOutButton = confirmationButtons?.find(button => button.style === 'destructive');
    await act(async () => {
      await signOutButton?.onPress?.();
    });

    expect(mockStopAudio).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockAnalyticsReset).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).toHaveBeenCalledWith('/auth');
  });

  test('resets reading progress and refreshes its query after confirmation', async () => {
    const { result } = renderHook(() => useAccountScreen());

    act(() => result.current.handleResetReadingProgress());
    const confirmationButtons = alertSpy.mock.calls[0]?.[2];
    const resetButton = confirmationButtons?.find(button => button.style === 'destructive');
    await act(async () => {
      await resetButton?.onPress?.();
    });

    expect(mockDeleteAllProgress).toHaveBeenCalledWith('user-1');
    expect(mockRemoveQueries).toHaveBeenCalledTimes(2);
    expect(mockRefetchQueries).toHaveBeenCalledTimes(1);
    // Confirmed with a toast, not a second dialog after the confirmation one.
    expect(mockShowToast).toHaveBeenCalledWith(
      'Reading progress reset',
      undefined,
      expect.any(String),
    );
    expect(alertSpy).toHaveBeenCalledTimes(1);
  });

  test('clears audio, in-memory query, and persisted query caches after confirmation', async () => {
    const { result } = renderHook(() => useAccountScreen());
    await waitFor(() => expect(result.current.cacheSize).toBe(1024));

    await act(async () => {
      await result.current.handleClearCache();
    });
    const confirmationButtons = alertSpy.mock.calls[0]?.[2];
    const clearButton = confirmationButtons?.find(button => button.style === 'destructive');
    await act(async () => {
      await clearButton?.onPress?.();
    });

    expect(mockClearCache).toHaveBeenCalledTimes(1);
    expect(mockQueryClear).toHaveBeenCalledTimes(1);
    expect(mockClearPersistedQueryCache).toHaveBeenCalledTimes(1);
    expect(mockHandleError).not.toHaveBeenCalled();
    // The row's size line turning into "Nothing to clear" is the confirmation;
    // no "Success" dialog follows the confirmation one.
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(result.current.cacheSize).toBe(0);
  });

  test('does nothing at all when there is no cache to clear', async () => {
    mockGetCacheSize.mockResolvedValue(0);
    const { result } = renderHook(() => useAccountScreen());
    await waitFor(() => expect(mockGetCacheSize).toHaveBeenCalled());

    await act(async () => {
      await result.current.handleClearCache();
    });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockClearCache).not.toHaveBeenCalled();
  });
});
