/**
 * Service Mock Factories
 *
 * Provides consistent mock data factories for API responses and database entities.
 * Eliminates duplicate mock data across tests and ensures type safety.
 *
 * Usage:
 * ```typescript
 * import { createArticleMock, createReadingListMock } from '@/__tests__/helpers/serviceMocks';
 *
 * // In tests
 * mockSupabase.from('articles').select().mockResolvedValue({
 *   data: [createArticleMock(), createArticleMock({ id: 2, title: 'Test 2' })],
 *   error: null,
 * });
 * ```
 *
 * Modern Jest 29 Patterns:
 * - Type-safe factory functions
 * - Branded ID support for type safety
 */

import type { EnhancedAudioTrack } from '@/types/audio.types';
import type { ArticleId, RootId, UserId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';
import * as Notifications from 'expo-notifications';
import type { AuthError, PostgrestError, Session, User } from '@supabase/supabase-js';
import NetInfo, { type NetInfoState, type NetInfoStateType } from '@react-native-community/netinfo';
import * as sherpaDownload from 'react-native-sherpa-onnx/download';
import * as sherpaStt from 'react-native-sherpa-onnx/stt';
import type { AudioStatus } from '@/services/audioPlayer';

// ============================================================================
// ARTICLE FACTORIES
// ============================================================================

/**
 * Creates a mock article sentence
 */
export const createSentenceMock = (
  overrides: Partial<Tables<'article_sentences'>> = {},
): Tables<'article_sentences'> => ({
  id: 1,
  article_id: 1,
  position: 0,
  arabic: 'مرحبا',
  english: 'Hello',
  audio_url: 'https://example.com/sentence.mp3',
  audio_url_english: 'https://example.com/sentence-en.mp3',
  audio_url_bilingual: 'https://example.com/sentence-bilingual.mp3',
  arabic_repeat: false,
  english_repeat: false,
  ...overrides,
});

// ============================================================================
// VOCABULARY FACTORIES
// ============================================================================

// ============================================================================
// READING PROGRESS FACTORIES
// ============================================================================

/**
 * Creates a mock reading list entry
 */
export const createReadingListMock = (
  overrides: Partial<Tables<'reading_list'>> = {},
): Tables<'reading_list'> => ({
  user_id: 'test-user-id',
  article_id: 1,
  added_at: new Date().toISOString(),
  ...overrides,
});

// ============================================================================
// AUDIO TRACK FACTORIES
// ============================================================================

/**
 * Creates a mock enhanced audio track
 */
export const createEnhancedAudioTrackMock = (
  overrides: Partial<EnhancedAudioTrack> = {},
): EnhancedAudioTrack => ({
  id: 'article-1',
  audioUrl: 'https://example.com/audio.mp3',
  articleId: 1 as ArticleId,
  title: 'Test Article',
  artist: 'Test Author',
  imageUrl: 'https://example.com/image.jpg',
  ...overrides,
});

// ============================================================================
// API RESPONSE FACTORIES
// ============================================================================

// ============================================================================
// BATCH DATA FACTORIES
// ============================================================================

// ============================================================================
// USER & AUTH FACTORIES
// ============================================================================

/**
 * Creates a mock Supabase user
 */
export const createUserMock = (overrides: Partial<User> = {}): User => ({
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  role: 'authenticated',
  ...overrides,
});

/**
 * Creates a mock Supabase session.
 *
 * Typed as the real `Session` so a test cannot hand the auth hooks a shape the
 * SDK would never produce — the previous version inferred its type from the
 * literal, which let incomplete sessions through.
 */
export const createSessionMock = (overrides: Partial<Session> = {}): Session => ({
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: createUserMock(),
  ...overrides,
});

// ============================================================================
// NOTIFICATION PERMISSION FACTORIES
// ============================================================================

/**
 * Builds a complete `NotificationPermissionsStatus`.
 *
 * The real shape carries a `PermissionStatus` enum plus eleven iOS fields.
 * Tests only ever care about `status` and (sometimes) `ios.status`, so those are
 * the parameters — the rest are filled with the platform defaults so the fixture
 * satisfies the type the service actually receives.
 */
const IOS_STATUS_FOR: Record<string, Notifications.IosAuthorizationStatus> = {
  granted: Notifications.IosAuthorizationStatus.AUTHORIZED,
  denied: Notifications.IosAuthorizationStatus.DENIED,
  undetermined: Notifications.IosAuthorizationStatus.NOT_DETERMINED,
};

export interface PermissionsMockOverrides {
  /** iOS authorization detail; defaults from `status`. */
  iosStatus?: Notifications.IosAuthorizationStatus;
  /** Defaults to `status !== 'denied'`. */
  canAskAgain?: boolean;
  /** Merged into the iOS block, or `null` to model a platform that reports none. */
  ios?: Partial<NonNullable<Notifications.NotificationPermissionsStatus['ios']>> | null;
}

export const createPermissionsMock = (
  status: 'granted' | 'denied' | 'undetermined',
  overrides: PermissionsMockOverrides = {},
): Notifications.NotificationPermissionsStatus => {
  const granted = status === 'granted';
  const ios =
    overrides.ios === null
      ? undefined
      : {
          // `undetermined` must map to NOT_DETERMINED, not DENIED: `ensurePermissions`
          // switches on this and returns early for DENIED without ever asking.
          status: overrides.iosStatus ?? IOS_STATUS_FOR[status],
          allowsDisplayInNotificationCenter: granted,
          allowsDisplayOnLockScreen: granted,
          allowsDisplayInCarPlay: granted,
          allowsAlert: granted,
          allowsBadge: granted,
          allowsSound: granted,
          allowsCriticalAlerts: false,
          alertStyle: Notifications.IosAlertStyle.BANNER,
          allowsPreviews: Notifications.IosAllowsPreviews.ALWAYS,
          providesAppNotificationSettings: false,
          allowsAnnouncements: false,
          ...overrides.ios,
        };

  return {
    status: status as Notifications.PermissionStatus,
    expires: 'never',
    granted,
    canAskAgain: overrides.canAskAgain ?? status !== 'denied',
    ...(ios ? { ios } : {}),
  };
};

/**
 * Builds a scheduled-notification request as `getAllScheduledNotificationsAsync`
 * returns it. Tests match on `identifier` and `content.data.type`; the remaining
 * `NotificationContent` fields are the nulls the platform actually reports.
 */
export const createScheduledNotificationMock = (
  identifier: string,
  data: Record<string, unknown> = {},
): Notifications.NotificationRequest => ({
  identifier,
  content: {
    title: null,
    subtitle: null,
    body: null,
    data,
    sound: null,
    launchImageName: null,
    badge: null,
    attachments: [],
    categoryIdentifier: null,
    threadIdentifier: null,
    targetContentIdentifier: undefined,
    interruptionLevel: 'active',
  },
  trigger: null,
});

// ============================================================================
// AUTH + NETWORK FACTORIES
// ============================================================================

/**
 * Builds a supabase `AuthError`. `new Error(...)` is not one: the SDK's error
 * carries `code`, `status`, `__isAuthError` and `toJSON`, and code that narrows
 * on those fields behaves differently against a plain Error.
 */
export const createAuthErrorMock = (message: string, status = 400): AuthError =>
  Object.assign(new Error(message), {
    name: 'AuthError',
    code: 'unknown',
    status,
    __isAuthError: true as const,
    toJSON: () => ({ message, status }),
  }) as unknown as AuthError;

/**
 * Builds a `NetInfoState`. Only `isConnected` is ever asserted on, but the real
 * shape is a discriminated union over `type`, so the rest has to be present.
 */
export const createNetInfoStateMock = (
  isConnected: boolean,
  overrides: { type?: `${NetInfoStateType}`; isConnectionExpensive?: boolean } = {},
): NetInfoState =>
  ({
    type: overrides.type ?? (isConnected ? 'wifi' : 'none'),
    isConnected,
    isInternetReachable: isConnected,
    details: isConnected
      ? {
          // Overridable because the voice-model download gates on metered-ness,
          // not on `type`: an iOS Personal Hotspot reports `wifi` while costing
          // cellular data, and that case has to be testable.
          isConnectionExpensive: overrides.isConnectionExpensive ?? false,
          ssid: null,
          bssid: null,
          strength: null,
        }
      : null,
  }) as NetInfoState;

/**
 * Arms the bare NetInfo mock and hands back a driver for connection changes.
 *
 * Must be called from `beforeEach`: `resetMocks: true` wipes any implementation
 * set at module scope, so the manual mock deliberately ships without one.
 */
export const installNetInfoMock = (
  initial: NetInfoState = createNetInfoStateMock(true),
): {
  /** Deliver a connection change to every registered listener. */
  emit: (state: NetInfoState) => void;
  /** Change what `NetInfo.fetch()` resolves to, and deliver it as a change. */
  transitionTo: (state: NetInfoState) => void;
  listenerCount: () => number;
} => {
  const listeners = new Set<(state: NetInfoState) => void>();

  // A real import, NOT `jest.requireMock`: that returns a SEPARATE module
  // instance from the one the code under test imported, so arming it has no
  // effect and every call reads `undefined`. Cost an afternoon once.
  (NetInfo.fetch as jest.Mock).mockResolvedValue(initial);
  (NetInfo.addEventListener as jest.Mock).mockImplementation(
    (listener: (state: NetInfoState) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  );

  const emit = (state: NetInfoState): void => {
    listeners.forEach(listener => {
      listener(state);
    });
  };

  return {
    emit,
    // Both halves together, because a listener that fires while `fetch()` still
    // reports the OLD connection is a trap: the code under test re-checks on
    // wake and would defer again for reasons the test never intended.
    transitionTo: (state: NetInfoState) => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue(state);
      emit(state);
    },
    listenerCount: () => listeners.size,
  };
};

/**
 * Arms the bare sherpa-onnx mocks with a working-by-default happy path.
 * Individual tests override the pieces they are about.
 */
export const installSherpaMocks = (): {
  download: {
    ensureModelByCategory: jest.Mock;
    refreshModelsByCategory: jest.Mock;
    isModelDownloadedByCategory: jest.Mock;
    getLocalModelPathByCategory: jest.Mock;
    deleteModelByCategory: jest.Mock;
  };
  stt: { createSTT: jest.Mock };
  engine: { transcribeSamples: jest.Mock; destroy: jest.Mock };
} => {
  // Real imports for the same reason as NetInfo above.
  const download = {
    ensureModelByCategory: sherpaDownload.ensureModelByCategory as unknown as jest.Mock,
    refreshModelsByCategory: sherpaDownload.refreshModelsByCategory as unknown as jest.Mock,
    isModelDownloadedByCategory: sherpaDownload.isModelDownloadedByCategory as unknown as jest.Mock,
    getLocalModelPathByCategory: sherpaDownload.getLocalModelPathByCategory as unknown as jest.Mock,
    deleteModelByCategory: sherpaDownload.deleteModelByCategory as unknown as jest.Mock,
  };

  download.ensureModelByCategory.mockResolvedValue({ localPath: '/mock/model/path' });
  download.refreshModelsByCategory.mockResolvedValue(undefined);
  download.isModelDownloadedByCategory.mockResolvedValue(false);
  download.getLocalModelPathByCategory.mockResolvedValue('/mock/model/path');
  download.deleteModelByCategory.mockResolvedValue(undefined);

  const engine = {
    transcribeSamples: jest.fn().mockResolvedValue({ text: '' }),
    destroy: jest.fn().mockResolvedValue(undefined),
  };
  const stt = { createSTT: sherpaStt.createSTT as unknown as jest.Mock };
  stt.createSTT.mockResolvedValue(engine);

  return { download, stt, engine };
};

// ============================================================================
// AUDIO FACTORIES
// ============================================================================

/**
 * Builds a complete `AudioStatus`.
 *
 * The service's status object carries eleven fields and consumers switch on
 * several of them (`didJustFinish` gates the review prompt, `error` gates the
 * retry path). Partial literals typed their way past that by omission.
 */
export const createAudioStatusMock = (overrides: Partial<AudioStatus> = {}): AudioStatus => ({
  playing: false,
  currentTime: 0,
  duration: 0,
  currentTrack: null,
  isLoaded: false,
  isBuffering: false,
  playbackState: 'idle',
  timeControlStatus: 'paused',
  reasonForWaitingToPlay: '',
  didJustFinish: false,
  error: null,
  queue: null,
  ...overrides,
});

/**
 * Builds a `PostgrestError`. The SDK's error carries `details`, `hint`, `code`
 * and `name` alongside `message`, and `executeQuery` forwards the whole object
 * to `handleError` — a bare `{ message }` is not one.
 */
export const createPostgrestErrorMock = (
  message: string,
  overrides: Partial<PostgrestError> = {},
): PostgrestError =>
  ({
    name: 'PostgrestError',
    message,
    details: '',
    hint: '',
    code: 'PGRST000',
    ...overrides,
  }) as PostgrestError;
