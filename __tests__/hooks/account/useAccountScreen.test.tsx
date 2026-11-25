jest.mock('expo-file-system', () => ({
  Directory: class {
    exists = false;
  },
  Paths: { cache: 'cache' },
}));
import { Platform } from 'react-native';
const mockPublishPublic = jest.fn(async (_name: string, _word: string) => undefined as void);
jest.mock('@/services/widgets/publicHost', () => ({
  submitPublicWidget: (name: string, word: string) => mockPublishPublic(name, word),
}));
jest.mock('@/widgets/WordInContext.android', () => ({ wordWidget: { updateSnapshot: jest.fn() } }));
jest.mock('@/services/widgets/native', () => ({
  widgetBridge: { setOwner: (owner: string) => owner },
}));
jest.mock('@/widgets/WordInContext.ios', () => ({ wordWidget: { updateTimeline: jest.fn() } }));
jest.mock('@/widgets/OpenText.ios', () => ({ publicWidget: { updateTimeline: jest.fn() } }));
import { clearWordWidget } from '@/services/widgets/publish';
jest.mock('@/services/widgets/publish', () => ({ clearWordWidget: jest.fn() }));
import { MutationObserver, QueryClient, onlineManager } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { useAccountScreen } from '@/hooks/account/useAccountScreen';
import { reminderClockSet, remindersToggled } from '@/store/settingsSlice';

const mockClearCache = jest.fn(async (..._args: unknown[]) => undefined);
const mockGetCacheSize = jest.fn(async (..._args: unknown[]) => 1024);
const mockDispatch = jest.fn();
const mockEnsurePermissions = jest.fn(async (..._args: unknown[]) => true);
const mockRecordAccepted = jest.fn();
const mockFlushPersistedQueryCache = jest.fn(async (..._args: unknown[]) => undefined);
const mockStopAudio = jest.fn(async (..._args: unknown[]) => undefined);
const mockTrackSignOut = jest.fn(async (..._args: unknown[]) => undefined);
const mockAnalyticsReset = jest.fn(async (..._args: unknown[]) => undefined);
const mockSignOut = jest.fn(async (..._args: unknown[]) => ({ error: null }));
const mockGetUser = jest.fn();
const mockDeleteAllProgress = jest.fn(async (..._args: unknown[]) => undefined);
const mockRouterReplace = jest.fn();
const mockHandleError = jest.fn();

let mockReminderTime = { enabled: false, hour: 19, minute: 0 };

// A real client, so what the cache handlers keep and drop is the real thing.
let mockQueryClient: QueryClient;
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query'),
  useQueryClient: () => mockQueryClient,
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
  cancelAccountNotifications: jest.fn(async () => undefined),
  ensurePermissions: (...args: unknown[]) => mockEnsurePermissions(...args),
}));
jest.mock('@/utils/notificationPromptStorage', () => ({
  resetNotificationPromptState: jest.fn(),
  recordAccepted: (...args: unknown[]) => mockRecordAccepted(...args),
}));
jest.mock('@/utils/queryPersistence', () => ({
  flushPersistedQueryCache: (...args: unknown[]) => mockFlushPersistedQueryCache(...args),
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
      getSession: async () => ({ data: { session: { user: { id: 'user-1' } } }, error: null }),
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

  afterEach(() => {
    onlineManager.setOnline(true);
    mockQueryClient.clear();
  });

  beforeEach(() => {
    jest.mocked(clearWordWidget).mockReturnValue(() => undefined);
    jest.useRealTimers();
    jest.clearAllMocks();
    mockReminderTime = { enabled: false, hour: 19, minute: 0 };
    mockGetCacheSize.mockResolvedValue(1024);
    mockClearCache.mockResolvedValue(undefined);
    mockFlushPersistedQueryCache.mockResolvedValue(undefined);
    mockQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
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
    // The settings toggle is an unprimed ask, counted under its own source
    expect(mockEnsurePermissions).toHaveBeenCalledWith({ source: 'settings', primed: false });
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

  test('ending the session cannot leave a private RemoteViews when the Android render worker dies', async () => {
    const platform = jest.replaceProperty(Platform, 'OS', 'android');
    const host = { displayed: 'private fixture', queued: 'private fixture' };
    const renderer = jest.requireMock<{
      wordWidget: { updateSnapshot: jest.Mock<void, [face: { arabic: string }]> };
    }>('@/widgets/WordInContext.android').wordWidget;
    renderer.updateSnapshot.mockImplementation(face => {
      host.queued = face.arabic;
    });
    const publish = jest.requireActual<typeof import('@/services/widgets/publish')>(
      '@/services/widgets/publish',
    );
    jest.mocked(clearWordWidget).mockImplementation(publish.clearWordWidget);
    mockPublishPublic.mockImplementation(async (_name: string, word: string) => {
      host.displayed = word;
    });
    const view = renderHook(() => useAccountScreen());
    act(() => view.result.current.handleSignOut());
    await act(async () => {
      await alertSpy.mock.calls[0]?.[2]?.find(b => b.style === 'destructive')?.onPress?.();
    });
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    host.queued = ''; // process death before the queued rich render
    platform.restore();
    expect(host.displayed).not.toBe('private fixture');
  });

  test('stops audio and signs out only after destructive confirmation', async () => {
    const publish = jest.requireActual<typeof import('@/services/widgets/publish')>(
      '@/services/widgets/publish',
    );
    const renderer = jest.requireMock<{ wordWidget: { updateTimeline: jest.Mock } }>(
      '@/widgets/WordInContext.ios',
    );
    publish.widgetOwner('test-owner', Date.now());
    renderer.wordWidget.updateTimeline.mockImplementationOnce(() => {
      throw new Error('host timeline unavailable');
    });
    jest.mocked(clearWordWidget).mockImplementation(publish.clearWordWidget);
    const { result } = renderHook(() => useAccountScreen());

    act(() => result.current.handleSignOut());
    expect(mockSignOut).not.toHaveBeenCalled();

    const confirmationButtons = alertSpy.mock.calls[0]?.[2];
    const signOutButton = confirmationButtons?.find(button => button.style === 'destructive');
    await act(async () => {
      await signOutButton?.onPress?.();
    });

    expect(jest.mocked(clearWordWidget).mock.invocationCallOrder[0]).toBeLessThan(
      mockSignOut.mock.invocationCallOrder[0]!,
    );
    expect(mockStopAudio).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockAnalyticsReset).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).not.toHaveBeenCalled();
    // Sign Out counts a sign-out that happened, on the id it belongs to: after
    // the sign-out, before reset() makes a new one.
    const [signOutOrder] = mockSignOut.mock.invocationCallOrder;
    const [trackOrder] = mockTrackSignOut.mock.invocationCallOrder;
    const [resetOrder] = mockAnalyticsReset.mock.invocationCallOrder;
    expect(trackOrder).toBeGreaterThan(signOutOrder ?? Infinity);
    expect(resetOrder).toBeGreaterThan(trackOrder ?? Infinity);
  });

  test('a sign-out Supabase refuses is no Sign Out', async () => {
    mockSignOut.mockResolvedValue({ error: { message: 'Network down' } } as never);
    const { result } = renderHook(() => useAccountScreen());

    act(() => result.current.handleSignOut());
    const confirmationButtons = alertSpy.mock.calls[0]?.[2];
    const signOutButton = confirmationButtons?.find(button => button.style === 'destructive');
    await act(async () => {
      await signOutButton?.onPress?.();
    });

    expect(mockTrackSignOut).not.toHaveBeenCalled();
    expect(mockAnalyticsReset).not.toHaveBeenCalled();
  });

  test('resets reading progress and refreshes its query after confirmation', async () => {
    const resetQueries = jest.spyOn(mockQueryClient, 'resetQueries');
    const removeQueries = jest.spyOn(mockQueryClient, 'removeQueries');
    const { result } = renderHook(() => useAccountScreen());

    act(() => result.current.handleResetReadingProgress());
    const confirmationButtons = alertSpy.mock.calls[0]?.[2];
    const resetButton = confirmationButtons?.find(button => button.style === 'destructive');
    await act(async () => {
      await resetButton?.onPress?.();
    });

    expect(mockDeleteAllProgress).toHaveBeenCalledWith('user-1');
    // Reset, not remove-then-refetch: a refetch after removal finds nothing to
    // refetch, so the old positions stayed on screen.
    expect(resetQueries).toHaveBeenCalledWith({ queryKey: ['reading-progress-bulk', 'user-1'] });
    expect(resetQueries).toHaveBeenCalledWith({ queryKey: ['readingList', 'user-1'] });
    expect(removeQueries).not.toHaveBeenCalled();
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
    expect(mockFlushPersistedQueryCache).toHaveBeenCalledWith(mockQueryClient);
    expect(mockHandleError).not.toHaveBeenCalled();
    // The row's size line turning into "Nothing to clear" is the confirmation;
    // no "Success" dialog follows the confirmation one.
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(result.current.cacheSize).toBe(0);
  });

  // `queryClient.clear()` emptied the mutation cache as well, so clearing the
  // cache while offline threw away grades and saved words the server had not
  // seen yet — and the persisted copy that would have resumed them on restart.
  test('clearing the cache keeps writes that have not reached the server', async () => {
    mockQueryClient.setQueryData(['articles'], [{ id: 1 }]);
    onlineManager.setOnline(false);
    void new MutationObserver(mockQueryClient, {
      mutationKey: ['fsrs-words', 'grade'],
      mutationFn: async () => undefined,
    }).mutate();
    await waitFor(() =>
      expect(mockQueryClient.getMutationCache().getAll()[0]?.state.isPaused).toBe(true),
    );

    const { result } = renderHook(() => useAccountScreen());
    await waitFor(() => expect(result.current.cacheSize).toBe(1024));
    await act(async () => {
      await result.current.handleClearCache();
    });
    const clearButton = alertSpy.mock.calls[0]?.[2]?.find(button => button.style === 'destructive');
    await act(async () => {
      await clearButton?.onPress?.();
    });

    expect(mockQueryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(mockQueryClient.getMutationCache().getAll()).toHaveLength(1);
    expect(mockQueryClient.getMutationCache().getAll()[0]?.state.isPaused).toBe(true);
    // The persisted copy is rewritten from what is left, pending writes included.
    expect(mockFlushPersistedQueryCache).toHaveBeenCalledWith(mockQueryClient);
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
