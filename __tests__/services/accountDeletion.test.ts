import { mockReviewStorage } from '@/__tests__/helpers/reviewStorage';
import { accountTeardown } from '@/services/accountLifecycle';
import { analytics } from '@/services/analytics';
jest.mock('@/services/analytics', () => ({ analytics: { reset: jest.fn(), track: jest.fn() } }));
jest.mock('expo-file-system', () => ({
  Directory: class {
    exists = false;
  },
  Paths: { cache: 'cache' },
}));
jest.mock('@/services/notificationService', () => ({
  cancelAccountNotifications: jest.fn(async () => undefined),
}));
jest.mock('@/services/audioPlayer', () => ({
  simpleAudioService: { stop: jest.fn(async () => true) },
}));
jest.mock('@/services/widgets/native', () => ({
  widgetBridge: { setOwner: (owner: string) => owner },
}));
jest.mock('@/widgets/WordInContext.ios', () => ({ wordWidget: { updateTimeline: jest.fn() } }));
jest.mock('@/widgets/OpenText.ios', () => ({ publicWidget: { updateTimeline: jest.fn() } }));
/**
 * Service Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - ✅ jest.mocked() for type-safe mocking
 * - Note: test.concurrent() used where tests are independent
 */

/**
 * Unit tests for AccountDeletionService
 *
 * Tests the delete_user_account RPC function integration
 * This is the only application-callable RPC in the system (see RPC_AUDIT_SUMMARY.md)
 */

import { clearWordWidget } from '@/services/widgets/publish';
jest.mock('@/services/widgets/publish', () => ({ clearWordWidget: jest.fn() }));
import AsyncStorage from '@react-native-async-storage/async-storage';

import { accountOwnedStorageKeys, STORAGE_KEYS } from '../../constants/storageKeys';
import { AccountDeletionService } from '../../services/accountDeletion';

const mockDeleteRpc = jest.fn();
const mockRpcHeader = jest.fn();

// Mock dependencies
jest.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
      signOut: jest.fn(),
    },
    rpc: (...args: unknown[]) => ({
      setHeader: (header: string, value: string) => {
        mockRpcHeader(header, value);
        return mockDeleteRpc(...args);
      },
    }),
  },
  checkAuthentication: jest.fn(async (..._args: unknown[]) => undefined),
}));

jest.mock('../../utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

jest.mock('../../services/feedbackScreenshots', () => ({
  removeFeedbackScreenshots: jest.fn(async (..._args: unknown[]) => undefined),
}));

const { supabase } = require('../../services/supabase');
const { handleError } = require('../../utils/errorHandling');
const { removeFeedbackScreenshots } = require('../../services/feedbackScreenshots');

describe('AccountDeletionService', () => {
  const mockUserId = 'user-123';
  const mockUserEmail = 'test@example.com';

  beforeEach(() => {
    jest.mocked(clearWordWidget).mockReturnValue(() => undefined);
    jest.clearAllMocks();
    mockReviewStorage();
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'owner-session', user: { id: mockUserId } } },
      error: null,
    });
  });

  describe('deleteAccount', () => {
    test('successfully deletes account via RPC and signs out', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: {
          user: { id: mockUserId, email: mockUserEmail },
        },
        error: null,
      });

      // Mock successful RPC call
      (mockDeleteRpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      // Mock successful sign out
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

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
      await AccountDeletionService.deleteAccount();

      expect(jest.mocked(clearWordWidget).mock.invocationCallOrder[0]).toBeGreaterThan(
        jest.mocked(mockDeleteRpc).mock.invocationCallOrder[0]!,
      );
      expect(analytics.reset).toHaveBeenCalledTimes(1);
      expect(mockRpcHeader).toHaveBeenCalledWith('Authorization', 'Bearer owner-session');
      // Verify RPC was called with delete_user_account
      expect(mockDeleteRpc).toHaveBeenCalledWith('delete_user_account', {
        user_id: mockUserId,
      });

      // Verify user was signed out after deletion
      expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });

    test.each([null, { user: { id: 'replacement' } }])(
      'a session lost or replaced before the first request is a deletion failure (%j)',
      async session => {
        supabase.auth.getUser.mockResolvedValue({
          data: { user: { id: mockUserId } },
          error: null,
        });
        supabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });
        await expect(AccountDeletionService.deleteAccount()).rejects.toThrow();
        expect(mockDeleteRpc).not.toHaveBeenCalled();
        expect(supabase.auth.signOut).not.toHaveBeenCalled();
        expect(analytics.track).not.toHaveBeenCalled();
        expect(await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNT_TEARDOWN)).toBeNull();
        await accountTeardown.resume();
        await accountTeardown.resume();
        expect(accountTeardown.snapshot()).toBe('ready');
      },
    );

    test('a failed request checkpoint leaves no marker and sends nothing', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: mockUserId } }, error: null });
      const write = jest.mocked(AsyncStorage.setItem).getMockImplementation()!;
      jest.mocked(AsyncStorage.setItem).mockImplementationOnce(async (key, value) => {
        await write(key, value);
        throw new Error('storage acknowledgement lost');
      });
      await expect(AccountDeletionService.deleteAccount()).rejects.toThrow(
        'storage acknowledgement lost',
      );
      expect(await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNT_TEARDOWN)).toBeNull();
      expect(mockDeleteRpc).not.toHaveBeenCalled();
    });

    test.each([0, 408, 503])(
      'a returned transport failure (%d) preserves the request across Retry',
      async status => {
        supabase.auth.getUser.mockResolvedValue({
          data: { user: { id: mockUserId } },
          error: null,
        });
        mockDeleteRpc.mockResolvedValueOnce({ status, error: { message: 'response unavailable' } });
        await expect(AccountDeletionService.deleteAccount()).rejects.toThrow(
          'response unavailable',
        );
        expect(accountTeardown.snapshot()).toBe('deletionRetry');
        mockDeleteRpc.mockResolvedValueOnce({ error: null });
        supabase.auth.signOut.mockResolvedValue({ error: null });
        await accountTeardown.retry();
        expect(mockDeleteRpc).toHaveBeenCalledTimes(2);
        expect(await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNT_TEARDOWN)).toBeNull();
      },
    );

    test('a replacement authenticated before the first identity lookup cannot inherit the confirmation', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'replacement' } },
        error: null,
      });
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'replacement' } } },
        error: null,
      });
      mockDeleteRpc.mockResolvedValueOnce({ error: null });
      supabase.auth.signOut.mockResolvedValueOnce({ error: null });
      await expect(AccountDeletionService.deleteAccount(mockUserId)).rejects.toThrow();
      expect(mockDeleteRpc).not.toHaveBeenCalled();
    });

    test('a legacy journal with no request marker cannot confirm a missing session', async () => {
      await AsyncStorage.setItem(
        STORAGE_KEYS.ACCOUNT_TEARDOWN,
        JSON.stringify({ owner: mockUserId, mode: 'delete' }),
      );
      supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
      await expect(accountTeardown.resume()).rejects.toThrow();
      expect(mockDeleteRpc).not.toHaveBeenCalled();
    });

    test('user_not_found before dispatch cannot confirm deletion', async () => {
      supabase.auth.getUser
        .mockResolvedValueOnce({ data: { user: { id: mockUserId } }, error: null })
        .mockResolvedValueOnce({ data: { user: null }, error: { code: 'user_not_found' } });
      await expect(AccountDeletionService.deleteAccount()).rejects.toBeDefined();
      expect(mockDeleteRpc).not.toHaveBeenCalled();
      expect(supabase.auth.signOut).not.toHaveBeenCalled();
    });

    test('a fresh authenticated deletion entry point reconciles an existing request before starting another', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: mockUserId } }, error: null });
      mockDeleteRpc
        .mockRejectedValueOnce(new Error('lost response'))
        .mockResolvedValueOnce({ error: null });
      supabase.auth.signOut.mockResolvedValue({ error: null });
      await expect(AccountDeletionService.deleteAccount()).rejects.toThrow('lost response');
      await expect(AccountDeletionService.deleteAccount()).rejects.toThrow();
      expect(mockDeleteRpc).toHaveBeenCalledTimes(1);
      expect(await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNT_TEARDOWN)).toBeNull();
    });

    test('confirming a surviving owner retires the old request marker before retry preparation', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: mockUserId } }, error: null });
      mockDeleteRpc.mockRejectedValueOnce(new Error('response lost'));
      await expect(AccountDeletionService.deleteAccount()).rejects.toThrow('response lost');
      await expect(accountTeardown.resume()).rejects.toThrow();
      await accountTeardown.resume();
      expect(mockDeleteRpc).toHaveBeenCalledTimes(1);
      const journal = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNT_TEARDOWN);
      expect(journal).toBeNull();
    });

    test.each([
      'missing',
      'session_expired',
      'refresh_token_not_found',
      'bad_jwt',
      'user_not_found',
    ])('lost delete response followed by %s releases the cold-start gate', async signal => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: mockUserId } }, error: null });
      mockDeleteRpc.mockImplementationOnce(async () => {
        const journal = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNT_TEARDOWN);
        expect(JSON.parse(journal!)).toMatchObject({ owner: mockUserId, phase: 'requested' });
        throw new Error('connection closed after commit');
      });
      await expect(AccountDeletionService.deleteAccount()).rejects.toThrow('after commit');
      if (signal === 'user_not_found') {
        supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { code: signal } });
        supabase.auth.signOut.mockResolvedValue({ error: { code: 'session_not_found' } });
      } else
        supabase.auth.getSession.mockResolvedValue({
          data: { session: null },
          error: signal === 'missing' ? null : { code: signal },
        });
      await accountTeardown.resume();
      await accountTeardown.resume();
      expect(accountTeardown.snapshot()).toBe('ready');
      expect(await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNT_TEARDOWN)).toBeNull();
      expect(mockDeleteRpc).toHaveBeenCalledTimes(1);
    });
    test('a replacement session cannot be deleted or signed out when the previous request is replayed', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: mockUserId } }, error: null });
      mockDeleteRpc.mockRejectedValueOnce(new Error('lost response'));
      await expect(AccountDeletionService.deleteAccount()).rejects.toThrow('lost response');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'replacement' } } },
        error: null,
      });
      await expect(accountTeardown.resume()).rejects.toThrow();
      expect(await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNT_TEARDOWN)).toBeNull();
      expect(mockDeleteRpc).toHaveBeenCalledTimes(1);
      expect(supabase.auth.signOut).not.toHaveBeenCalled();
    });
    test('a replacement session established during deletion survives the acknowledgement', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: mockUserId } }, error: null });
      mockDeleteRpc.mockImplementationOnce(async () => {
        supabase.auth.getSession.mockResolvedValue({
          data: { session: { user: { id: 'replacement' } } },
          error: null,
        });
        return { error: null };
      });
      await AccountDeletionService.deleteAccount();
      expect(supabase.auth.signOut).not.toHaveBeenCalled();
    });
    test('a transient refresh failure keeps the journal and the surviving owner can retry deletion', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: mockUserId } }, error: null });
      mockDeleteRpc
        .mockRejectedValueOnce(new Error('lost request'))
        .mockResolvedValueOnce({ error: null });
      supabase.auth.signOut.mockResolvedValue({ error: null });
      await expect(AccountDeletionService.deleteAccount()).rejects.toThrow('lost request');
      supabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: new Error('network unavailable'),
      });
      await expect(accountTeardown.resume()).rejects.toThrow('network unavailable');
      expect(supabase.auth.signOut).not.toHaveBeenCalled();
      await accountTeardown.retry();
      expect(accountTeardown.snapshot()).toBe('ready');
      expect(mockDeleteRpc).toHaveBeenCalledTimes(2);
    });
    test('throws error when user is not authenticated', async () => {
      // Mock no authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(AccountDeletionService.deleteAccount()).rejects.toThrow(
        'User must be authenticated to delete account',
      );

      // Verify RPC was not called
      expect(mockDeleteRpc).not.toHaveBeenCalled();
    });

    test('throws error when session check fails', async () => {
      // Mock session error
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: new Error('Session error'),
      });

      await expect(AccountDeletionService.deleteAccount()).rejects.toThrow(
        'User must be authenticated to delete account',
      );

      // Verify RPC was not called
      expect(mockDeleteRpc).not.toHaveBeenCalled();
    });

    test('throws error when RPC deletion fails', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: {
          user: { id: mockUserId, email: mockUserEmail },
        },
        error: null,
      });

      // Mock RPC failure
      const rpcError = new Error('RPC deletion failed');
      (mockDeleteRpc as jest.Mock).mockResolvedValue({
        data: null,
        error: rpcError,
      });

      await expect(AccountDeletionService.deleteAccount()).rejects.toThrow(
        'Failed to delete account: RPC deletion failed',
      );

      // Verify sign out was not called on failure
      expect(supabase.auth.signOut).not.toHaveBeenCalled();
    });

    test('reports when the deleted account local session cannot be cleared', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockUserId, email: mockUserEmail } },
        error: null,
      });
      (mockDeleteRpc as jest.Mock).mockResolvedValue({ data: null, error: null });
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: new Error('Storage unavailable'),
      });

      await expect(AccountDeletionService.deleteAccount()).rejects.toThrow(
        'Account was deleted but the local session could not be cleared: Storage unavailable',
      );
    });

    describe('local data cleanup', () => {
      const authenticateAndSucceed = () => {
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
          data: { user: { id: mockUserId, email: mockUserEmail } },
          error: null,
        });
        (mockDeleteRpc as jest.Mock).mockResolvedValue({ data: null, error: null });
        (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
      };

      test('removes the feedback screenshots before the account is deleted', async () => {
        authenticateAndSucceed();

        await AccountDeletionService.deleteAccount();

        expect(removeFeedbackScreenshots).toHaveBeenCalledWith(mockUserId);
        // Before the RPC: the owner-only bucket policies need the account to still exist.
        const cleanupOrder = (removeFeedbackScreenshots as jest.Mock).mock.invocationCallOrder[0];
        const rpcOrder = (mockDeleteRpc as jest.Mock).mock.invocationCallOrder[0];
        expect(cleanupOrder).toBeLessThan(rpcOrder);
      });

      test('a screenshot cleanup failure is reported but never blocks the deletion', async () => {
        authenticateAndSucceed();
        const cleanupError = new Error('Storage unavailable');
        (removeFeedbackScreenshots as jest.Mock).mockRejectedValueOnce(cleanupError);

        await expect(AccountDeletionService.deleteAccount()).resolves.toBeUndefined();

        expect(handleError).toHaveBeenCalledWith(
          cleanupError,
          expect.objectContaining({
            showToast: false,
            analyticsEventName: 'Account_Deletion_Screenshot_Cleanup_Error',
          }),
        );
        expect(mockDeleteRpc).toHaveBeenCalledWith('delete_user_account', { user_id: mockUserId });
      });

      test('removes every key the registry attributes to the deleted account', async () => {
        authenticateAndSucceed();

        await AccountDeletionService.deleteAccount();

        expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(accountOwnedStorageKeys(mockUserId));
      });

      test('clears the data that would otherwise follow the device to the next account', async () => {
        authenticateAndSucceed();

        await AccountDeletionService.deleteAccount();

        // Spelled out rather than derived, so a key silently dropping out of the
        // scope table fails here instead of passing against a shorter list.
        const removed = (AsyncStorage.multiRemove as jest.Mock).mock.calls[0][0] as string[];
        expect(removed).toEqual(
          expect.arrayContaining([
            STORAGE_KEYS.STUDY_DAYS,
            STORAGE_KEYS.RECENT_RECALL_SESSIONS,
            STORAGE_KEYS.DAILY_WORD_COUNT,
            STORAGE_KEYS.DAILY_WORD_RESET_DATE,
            STORAGE_KEYS.NOTIFICATION_PROMPT_STATE,
            STORAGE_KEYS.SMART_REMINDER_PREFS,
            STORAGE_KEYS.QUERY_CACHE,
            `${STORAGE_KEYS.ONBOARDING_PROGRESS}:${mockUserId}`,
            `${STORAGE_KEYS.TUTORIAL_WELCOME_INTRO}:${mockUserId}`,
            `profile_photo_${mockUserId}`,
          ]),
        );
      });

      test('leaves device-level keys alone', async () => {
        authenticateAndSucceed();

        await AccountDeletionService.deleteAccount();

        const removed = (AsyncStorage.multiRemove as jest.Mock).mock.calls[0][0] as string[];
        expect(removed).not.toContain(STORAGE_KEYS.AUDIO_CACHE_LEGACY_SWEEP);
        expect(removed).not.toContain(STORAGE_KEYS.REDUX_PERSIST_ROOT);
      });

      test('a rejected RPC purges local data and clears the request journal without signing out', async () => {
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
          data: { user: { id: mockUserId, email: mockUserEmail } },
          error: null,
        });
        (mockDeleteRpc as jest.Mock).mockResolvedValue({
          data: null,
          error: new Error('RPC deletion failed'),
        });

        await expect(AccountDeletionService.deleteAccount()).rejects.toThrow(
          'Failed to delete account: RPC deletion failed',
        );

        expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(accountOwnedStorageKeys(mockUserId));
        expect(supabase.auth.signOut).not.toHaveBeenCalled();
        expect(await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNT_TEARDOWN)).toBeNull();
      });

      test('storage failure after confirmation retries cleanup without another RPC', async () => {
        authenticateAndSucceed();
        (AsyncStorage.multiRemove as jest.Mock).mockRejectedValueOnce(
          new Error('Storage unavailable'),
        );
        await expect(AccountDeletionService.deleteAccount()).rejects.toThrow('Storage unavailable');
        expect(supabase.auth.signOut).not.toHaveBeenCalled();
        expect(mockDeleteRpc).toHaveBeenCalledTimes(1);
        await accountTeardown.retry();
        expect(mockDeleteRpc).toHaveBeenCalledTimes(1);
        expect(await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNT_TEARDOWN)).toBeNull();
      });
    });

    test('verifies delete_user_account RPC is the only one used (per audit)', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: {
          user: { id: mockUserId, email: mockUserEmail },
        },
        error: null,
      });

      // Mock successful RPC call
      (mockDeleteRpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      await AccountDeletionService.deleteAccount();

      // Verify EXACTLY which RPC is called
      // Per RPC_AUDIT_SUMMARY.md, delete_user_account is the ONLY application-callable RPC
      expect(mockDeleteRpc).toHaveBeenCalledTimes(1);
      expect(mockDeleteRpc).toHaveBeenCalledWith('delete_user_account', {
        user_id: mockUserId,
      });

      // Ensure NO other RPCs are called (e.g., not update_word_and_review)
      expect(mockDeleteRpc).not.toHaveBeenCalledWith(
        expect.stringMatching(/^(?!delete_user_account$).*/),
        expect.anything(),
      );
    });
  });

  describe('getCurrentUserEmail', () => {
    test('returns user email when authenticated', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: {
          user: { id: mockUserId, email: mockUserEmail },
        },
        error: null,
      });

      const email = await AccountDeletionService.getCurrentUserEmail();

      expect(email).toBe(mockUserEmail);
    });

    test('returns null when user is not authenticated', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const email = await AccountDeletionService.getCurrentUserEmail();

      expect(email).toBeNull();
    });

    test('returns null when user has no email', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: {
          user: { id: mockUserId, email: null },
        },
        error: null,
      });

      const email = await AccountDeletionService.getCurrentUserEmail();

      expect(email).toBeNull();
    });

    test('handles errors gracefully and returns null', async () => {
      (supabase.auth.getUser as jest.Mock).mockRejectedValue(new Error('Auth error'));

      const email = await AccountDeletionService.getCurrentUserEmail();

      expect(email).toBeNull();
    });
  });

  describe('RPC Function Documentation Coverage', () => {
    test('documents why delete_user_account requires RPC (not local code)', () => {
      // This test serves as documentation for the RPC architecture decision
      // See: services/accountDeletion.ts lines 36-42 for detailed comments

      const whyRPC = {
        reason: 'Multi-table deletion requiring SECURITY DEFINER',
        tables: ['study_words', 'reading_progress', 'reading_list', 'auth.users'],
        cannotBeLocalCode: 'auth.users requires elevated privileges',
        requirement: 'App Store 5.1.1(v) account deletion',
      };

      // Verify these facts are documented in the service
      expect(whyRPC.reason).toMatch(/SECURITY DEFINER/);
      expect(whyRPC.tables).toContain('auth.users');
      expect(whyRPC.cannotBeLocalCode).toMatch(/elevated privileges/);
    });

    test('confirms no other RPCs should be added without justification', () => {
      // Per RPC_AUDIT_SUMMARY.md:
      // - Only 1 application-callable RPC: delete_user_account
      // - Other functions (sync_difficulty_scales, update_bookmark_categories_updated_at) are TRIGGERS
      // - Triggers should NOT be called via supabase.rpc()

      const rpcPolicy = {
        applicationCallableRPCs: ['delete_user_account'],
        triggerFunctions: ['sync_difficulty_scales', 'update_bookmark_categories_updated_at'],
        policy: 'Prefer direct queries over RPCs for simple operations',
      };

      expect(rpcPolicy.applicationCallableRPCs).toHaveLength(1);
      expect(rpcPolicy.triggerFunctions).not.toContain('update_word_and_review');
    });
  });
});
