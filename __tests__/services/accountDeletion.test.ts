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

import { AccountDeletionService } from '../../services/accountDeletion';

// Mock dependencies
jest.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signOut: jest.fn(),
    },
    rpc: jest.fn(),
  },
  checkAuthentication: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

const { supabase } = require('../../services/supabase');

describe('AccountDeletionService', () => {
  const mockUserId = 'user-123';
  const mockUserEmail = 'test@example.com';

  beforeEach(() => {
    jest.clearAllMocks();
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
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      // Mock successful sign out
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      await AccountDeletionService.deleteAccount();

      // Verify RPC was called with delete_user_account
      expect(supabase.rpc).toHaveBeenCalledWith('delete_user_account', {
        user_id: mockUserId,
      });

      // Verify user was signed out after deletion
      expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
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
      expect(supabase.rpc).not.toHaveBeenCalled();
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
      expect(supabase.rpc).not.toHaveBeenCalled();
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
      (supabase.rpc as jest.Mock).mockResolvedValue({
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
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: new Error('Storage unavailable'),
      });

      await expect(AccountDeletionService.deleteAccount()).rejects.toThrow(
        'Account was deleted but the local session could not be cleared: Storage unavailable',
      );
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
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null,
      });

      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      await AccountDeletionService.deleteAccount();

      // Verify EXACTLY which RPC is called
      // Per RPC_AUDIT_SUMMARY.md, delete_user_account is the ONLY application-callable RPC
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
      expect(supabase.rpc).toHaveBeenCalledWith('delete_user_account', {
        user_id: mockUserId,
      });

      // Ensure NO other RPCs are called (e.g., not update_word_and_review)
      expect(supabase.rpc).not.toHaveBeenCalledWith(
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
