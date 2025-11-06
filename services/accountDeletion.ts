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
   * Uses the current session to identify the user to delete.
   * Supports all auth types including private relay emails.
   *
   * @throws Error if deletion fails or user is not authenticated
   */
  static async deleteAccount(): Promise<void> {
    try {
      // Verify user is authenticated
      const {
        data: { user },
        error: sessionError,
      } = await supabase.auth.getUser();

      if (sessionError || !user) {
        throw new Error('User must be authenticated to delete account');
      }

      // Delete user account via RPC function
      // WHY RPC?: Multi-table deletion requiring SECURITY DEFINER to access auth.users schema
      // - Deletes from: study_words, reading_progress, reading_list, auth.users
      // - Cannot be done with client-side queries (auth schema requires elevated privileges)
      // - RPC runs with database privileges to delete from all schemas
      // - Implements App Store requirement (5.1.1v) for account deletion
      // See: SUPABASE_BACKEND_REQUIREMENTS.md and types/database.types.ts for details
      const { error: deleteError } = await supabase.rpc('delete_user_account', {
        user_id: user.id,
      });

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
