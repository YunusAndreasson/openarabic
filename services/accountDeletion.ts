import { accountTeardown } from '@/services/accountLifecycle';
import { supabase } from '@/services/supabase';
import { handleError } from '@/utils/errorHandling';

/**
 * Service for handling account deletion operations
 * Provides methods to delete user accounts and all associated data
 */
export class AccountDeletionService {
  /**
   * Deletes the current user's account and all associated data
   * This includes:
   * - User authentication record
   * - Reading progress
   * - Study words and FSRS data
   * - Bookmarks (reading list)
   * - Feedback screenshots in Storage
   * - All other user-specific data
   *
   * Uses the current session to identify the user to delete.
   * Supports all auth types including private relay emails.
   *
   * @throws Error if deletion fails or user is not authenticated
   */
  static async deleteAccount(expectedOwner?: string | null): Promise<void> {
    // Verify user is authenticated
    const {
      data: { user },
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError || !user) {
      throw new Error('User must be authenticated to delete account');
    }

    if (expectedOwner !== undefined && user.id !== expectedOwner)
      throw new Error('Account changed before deletion');

    await accountTeardown.begin(user.id, 'delete');
  }

  /**
   * Checks if the current user is authenticated
   * @returns The authenticated user's email or null
   */
  static async getCurrentUserEmail(): Promise<string | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.email ?? null;
    } catch (error) {
      await handleError(error, {
        analyticsEventName: 'Get_User_Email_Error',
        sentrySeverity: 'warning',
        showToast: false,
      });
      return null;
    }
  }
}
