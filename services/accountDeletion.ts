import { STRINGS } from '@/constants/strings';
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
   * - All other user-specific data
   *
   * @param userEmail - The user's email address for verification
   * @throws Error if deletion fails or email doesn't match
   */
  static async deleteAccount(userEmail: string): Promise<void> {
    try {
      // Verify user is authenticated
      const {
        data: { user },
        error: sessionError,
      } = await supabase.auth.getUser();

      if (sessionError || !user) {
        throw new Error('User must be authenticated to delete account');
      }

      // Verify email matches (case-insensitive)
      const currentEmail = user.email?.toLowerCase();
      const providedEmail = userEmail.toLowerCase().trim();

      if (!currentEmail || currentEmail !== providedEmail) {
        throw new Error(STRINGS.DELETE_ACCOUNT_EMAIL_MISMATCH);
      }

      // Delete user account (this will cascade delete all related data via Supabase RLS policies)
      // Note: Supabase's deleteUser() removes the auth user and triggers RLS policies
      // to cascade delete all user data in related tables
      // TODO: Backend - Create RPC function 'delete_user_account(user_id UUID)' in Supabase
      const { error: deleteError } = await supabase.rpc(
        // @ts-expect-error - RPC function not yet in database types
        'delete_user_account',
        {
          user_id: user.id,
        },
      );

      if (deleteError) {
        throw new Error(`Failed to delete account: ${deleteError.message}`);
      }

      // Sign out after successful deletion
      await supabase.auth.signOut();
    } catch (error) {
      // Handle and track the error
      await handleError(error instanceof Error ? error : new Error(String(error)), {
        toastMessage: STRINGS.FAILED_TO_DELETE_ACCOUNT,
        analyticsEventName: 'Account_Deletion_Error',
        sentrySeverity: 'error',
        showToast: true,
      });

      // Re-throw to allow caller to handle
      throw error;
    }
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
      await handleError(error instanceof Error ? error : new Error(String(error)), {
        analyticsEventName: 'Get_User_Email_Error',
        sentrySeverity: 'warning',
        showToast: false,
      });
      return null;
    }
  }
}
