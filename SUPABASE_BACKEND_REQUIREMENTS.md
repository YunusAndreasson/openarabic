# Supabase Backend Requirements for App Store Compliance

This document outlines the backend changes required in Supabase to complete the app store compliance implementation.

## Overview

The frontend app now has account deletion functionality and FSRS improvements that require backend support. This document provides the SQL code needed to implement these features in Supabase.

---

## 🔴 CRITICAL (Required for App Store Approval)

### 1. Account Deletion RPC Function

**Purpose:** Allow users to delete their accounts and all associated data as required by Apple App Store Guidelines 5.1.1(v) and Google Play Store policy.

**Location in Code:** `services/accountDeletion.ts:47`

**SQL Implementation:**

```sql
-- Create RPC function to delete user account and all associated data
CREATE OR REPLACE FUNCTION delete_user_account(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the requesting user is the account owner
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot delete another user''s account';
  END IF;

  -- Delete user data (should cascade via foreign keys or RLS)
  -- Order matters: delete child records first, then parent records

  -- 1. Delete vocabulary/study data
  DELETE FROM reviews WHERE user_id = user_id;
  DELETE FROM study_words WHERE user_id = user_id;

  -- 2. Delete reading data
  DELETE FROM reading_progress WHERE user_id = user_id;
  DELETE FROM reading_list WHERE user_id = user_id;

  -- 3. Delete any other user-specific data tables you have
  -- Add more DELETE statements here for any other tables

  -- 4. Delete auth user (this will also remove the user from auth.users)
  DELETE FROM auth.users WHERE id = user_id;

  -- Log the deletion for audit purposes (optional)
  -- INSERT INTO user_deletion_log (user_id, deleted_at)
  -- VALUES (user_id, NOW());

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION delete_user_account IS 'Deletes a user account and all associated data. Can only be called by the account owner.';
```

**Testing:**

```sql
-- Test the function (replace with a test user ID)
-- WARNING: This will actually delete the user!
SELECT delete_user_account('test-user-uuid-here');

-- Verify deletion
SELECT * FROM auth.users WHERE id = 'test-user-uuid-here'; -- Should return no rows
SELECT * FROM study_words WHERE user_id = 'test-user-uuid-here'; -- Should return no rows
SELECT * FROM reading_progress WHERE user_id = 'test-user-uuid-here'; -- Should return no rows
```

**Security Considerations:**

1. ✅ `SECURITY DEFINER` - Function runs with creator's privileges (can delete from auth.users)
2. ✅ Authorization check - Verifies `auth.uid()` matches `user_id` parameter
3. ✅ SET search_path - Prevents search_path injection attacks
4. ⚠️ Irreversible - No undo, ensure proper confirmation in frontend (already implemented)

**Rollback Plan:**

If you need to reverse this deployment:

```sql
-- Remove the function
DROP FUNCTION IF EXISTS delete_user_account(UUID);
```

---

## 🟢 COMPLETED (Code Quality Improvement)

### 2. ~~Update FSRS RPC Function~~ → Replaced with Direct UPDATE

**Decision:** **NO RPC function needed** - Implemented direct Supabase UPDATE instead.

**Rationale:**

- Single-table UPDATE doesn't require RPC complexity
- Simpler architecture - no database migration needed
- Faster to deploy - just code changes
- Better developer experience - full TypeScript type safety
- RLS policies already handle authorization
- Sufficient performance for single UPDATE operations

**Location:** `services/studyWordsFSRS.ts:170`

**Implementation Date:** 2025-11-06

**TypeScript Implementation (Direct UPDATE):**

```typescript
// services/studyWordsFSRS.ts:170-205
async updateWordAndReview(
  userId: string,
  rootId: number,
  update: FSRSWordUpdate,
): Promise<boolean> {
  // Direct UPDATE - simpler than RPC, no database migration needed
  // RLS policies ensure user can only update their own words
  const data = await executeAuthenticatedQuery(
    userId,
    () =>
      supabase
        .from('study_words')
        .update({
          fsrs_due: update.fsrs_due,
          fsrs_stability: update.fsrs_stability,
          fsrs_difficulty: update.fsrs_difficulty,
          fsrs_scheduled_days: update.fsrs_scheduled_days,
          fsrs_learning_steps: update.fsrs_learning_steps,
          fsrs_reps: update.fsrs_reps,
          fsrs_lapses: update.fsrs_lapses,
          fsrs_state: update.fsrs_state,
          fsrs_last_review: update.fsrs_last_review,
        })
        .eq('user_id', userId)
        .eq('root_id', rootId)
        .select(),
    {
      toastMessage: STRINGS.FAILED_TO_UPDATE_WORD_AND_REVIEW,
      analyticsEventName: 'Update_Word_And_Review_Error',
      analyticsProperties: { rootId },
      showToast: false,
    },
  );

  return Boolean(data && data.length > 0);
}
```

**Benefits of Direct UPDATE:**

- ✅ No database migration required
- ✅ Full TypeScript type safety
- ✅ Simpler debugging (all code in TypeScript)
- ✅ Faster deployment (just code changes)
- ✅ RLS policies handle authorization
- ✅ Single UPDATE is atomic by default

---

## 📋 Implementation Checklist

### Critical (Do First)

- [ ] Deploy `delete_user_account` RPC function to Supabase
- [ ] Grant execute permissions to authenticated users
- [ ] Test account deletion with a test user
- [ ] Verify all user data is deleted from all tables
- [ ] Test the frontend account deletion flow end-to-end
- [ ] Verify user is redirected to auth screen after deletion
- [ ] Test with different auth methods (Email, Apple, Google)

### Optional (Do Later)

- [ ] Review existing `update_word_and_review` function
- [ ] Update RPC function to remove `p_fsrs_elapsed_days`
- [ ] Test FSRS functionality still works
- [ ] Update frontend to remove `p_fsrs_elapsed_days: 0`
- [ ] Consider removing `fsrs_elapsed_days` column from database
- [ ] Update database types with `npx supabase gen types typescript`

---

## 🧪 Testing Guide

### Test Account Deletion

1. **Create a test user:**

   ```bash
   # In app, sign up with test email
   test-delete@example.com
   ```

2. **Add test data:**
   - Add some words to study
   - Read some articles
   - Bookmark some articles
   - Create reading progress

3. **Delete account:**
   - Go to Account screen
   - Tap "Delete Account"
   - Enter email for confirmation
   - Confirm deletion

4. **Verify deletion:**

   ```sql
   -- Check auth.users (should be gone)
   SELECT * FROM auth.users WHERE email = 'test-delete@example.com';

   -- Check study_words (should be empty)
   SELECT * FROM study_words WHERE user_id = 'test-user-uuid';

   -- Check reading_progress (should be empty)
   SELECT * FROM reading_progress WHERE user_id = 'test-user-uuid';

   -- Check reading_list (should be empty)
   SELECT * FROM reading_list WHERE user_id = 'test-user-uuid';
   ```

5. **Try to sign in again:**
   - Should fail (user no longer exists)

### Test Different Auth Methods

Repeat the above test with:

- [ ] Email/Password authentication
- [ ] Apple Sign In
- [ ] Google Sign In

---

## 🚨 Common Issues & Solutions

### Issue 1: Permission Denied

**Error:** `permission denied for table auth.users`

**Solution:** The function needs `SECURITY DEFINER` to access `auth.users`:

```sql
ALTER FUNCTION delete_user_account(UUID) SECURITY DEFINER;
```

### Issue 2: Foreign Key Constraints

**Error:** `update or delete on table "users" violates foreign key constraint`

**Solution:** Either:

1. Delete child records first (in the function, as shown above)
2. Or add `ON DELETE CASCADE` to foreign keys:

```sql
ALTER TABLE study_words
DROP CONSTRAINT study_words_user_id_fkey,
ADD CONSTRAINT study_words_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;
```

### Issue 3: RLS Policies Blocking Deletion

**Error:** Rows are not being deleted even though function runs

**Solution:** Use `SECURITY DEFINER` (already included) or temporarily disable RLS:

```sql
-- Inside the function, before deletions:
SET LOCAL role = postgres; -- Bypass RLS

-- Or better: Ensure RLS policies allow deletion by the owner
CREATE POLICY "Users can delete their own data"
  ON study_words FOR DELETE
  USING (auth.uid() = user_id);
```

---

## 📊 Monitoring & Audit

### Optional: Create Audit Log

```sql
-- Create audit table (optional)
CREATE TABLE IF NOT EXISTS user_deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_by UUID REFERENCES auth.users(id),
  reason TEXT
);

-- Add to delete_user_account function:
INSERT INTO user_deletion_log (user_id, deleted_by, reason)
VALUES (user_id, auth.uid(), 'User-initiated account deletion');
```

### Monitor Deletions

```sql
-- Check recent account deletions
SELECT
  user_id,
  deleted_at,
  reason
FROM user_deletion_log
ORDER BY deleted_at DESC
LIMIT 10;
```

---

## 🔐 Security Considerations

1. **Authorization:** Function verifies `auth.uid()` matches the user being deleted
2. **Audit Trail:** Consider logging deletions for compliance
3. **Data Retention:** Ensure you're compliant with GDPR/CCPA requirements
4. **Soft Delete Alternative:** Consider soft deletes if you need to retain data for legal reasons

---

## 📞 Support

If you encounter issues:

1. Check Supabase logs: Dashboard → Logs → Database
2. Check function errors: Dashboard → Database → Functions
3. Test with SQL Editor: Dashboard → SQL Editor
4. Check RLS policies: Dashboard → Authentication → Policies

---

## ✅ Deployment Checklist

Before deploying to production:

- [ ] Test on staging/dev environment first
- [ ] Backup database before making changes
- [ ] Deploy during low-traffic period
- [ ] Monitor error logs after deployment
- [ ] Test account deletion with test users
- [ ] Verify no impact on existing users
- [ ] Update mobile app to latest version
- [ ] Submit updated app to App Store & Play Store

---

## 📝 Related Documentation

- [Apple App Store Review Guidelines 5.1.1(v)](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage)
- [Google Play Policy on Account Deletion](https://support.google.com/googleplay/android-developer/answer/13316080)
- [Supabase RPC Functions](https://supabase.com/docs/guides/database/functions)
- [Supabase Auth Admin API](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)

---

**Last Updated:** 2025-11-03
**Author:** Claude Code
**Status:** Ready for Implementation
