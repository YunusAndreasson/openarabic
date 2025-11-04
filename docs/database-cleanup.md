# Database Cleanup: Remove Unused RPC Functions

This document describes RPC functions that can be safely removed from the Supabase database after the client-side migration is complete and verified.

## Overview

As part of the RPC function migration, we've moved functionality from PostgreSQL RPC functions to client-side code. The following database functions are no longer used by the application and can be removed.

## Prerequisites

Before removing these functions:

1. ✅ Verify the new client-side implementation is working in production
2. ✅ Monitor for any errors related to reading progress updates
3. ✅ Confirm no other services or scripts are using these functions
4. ✅ Wait at least 1-2 weeks after deployment to ensure stability

## Required Database Schema

### Unique Constraint

The `reading_progress` table requires a unique constraint on `(user_id, article_id)` for the client-side upsert to work:

```sql
-- Already applied via migration: add_reading_progress_unique_constraint
ALTER TABLE public.reading_progress
ADD CONSTRAINT reading_progress_user_article_unique
UNIQUE (user_id, article_id);
```

**Status:** ✅ Already applied (2025-11-04)

This constraint was required because the Supabase `upsert` with `onConflict` parameter requires a unique constraint or primary key on the specified columns.

### Generated Column: progress_percentage

The `progress_percentage` column is a `GENERATED ALWAYS` column in PostgreSQL:

```sql
-- Column definition (automatically calculated)
progress_percentage INTEGER GENERATED ALWAYS AS (
  CASE
    WHEN total_sentences > 0 THEN
      LEAST(100, GREATEST(0,
        FLOOR(((LEAST(last_sentence_read, total_sentences - 1) + 1) * 100) / total_sentences))
      ))
    ELSE 0
  END
) STORED
```

**Important:**

- ✅ The database automatically calculates `progress_percentage` based on `last_sentence_read` and `total_sentences`
- ❌ **DO NOT** include `progress_percentage` in INSERT/UPDATE operations
- ❌ Attempting to insert a value will cause: `"cannot insert a non-DEFAULT value into column 'progress_percentage'"`

**Status:** ✅ Client-side code updated to exclude `progress_percentage` from upsert operations (2025-11-04)

## Functions to Remove

### 1. `upsert_reading_progress`

**Status:** No longer used by the application
**Replaced by:** Client-side Supabase upsert in `services/readingProgress.ts`

**Current Implementation:**

```sql
CREATE OR REPLACE FUNCTION public.upsert_reading_progress(
  p_user_id uuid,
  p_article_id bigint,
  p_last_sentence_read integer,
  p_total_sentences integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO reading_progress (user_id, article_id, last_sentence_read, total_sentences)
  VALUES (p_user_id, p_article_id, p_last_sentence_read, p_total_sentences)
  ON CONFLICT (user_id, article_id)
  DO UPDATE SET
    last_sentence_read = p_last_sentence_read,
    total_sentences = p_total_sentences,
    updated_at = NOW();
END;
$function$;
```

**Removal SQL:**

```sql
-- Remove the function
DROP FUNCTION IF EXISTS public.upsert_reading_progress(
  uuid,
  bigint,
  integer,
  integer
);

-- Verify removal
SELECT
  routine_name,
  routine_schema
FROM information_schema.routines
WHERE routine_name = 'upsert_reading_progress'
  AND routine_schema = 'public';
-- Should return no rows
```

**Verification:**

- Check that the function no longer appears in Supabase dashboard → Database → Functions
- Verify no code references exist in the codebase (already confirmed)
- Test that reading progress updates still work correctly (client-side implementation)

### 2. `get_bookmark_categories_with_counts` (Optional)

**Status:** Already broken and unused
**Note:** This function was never working and is not used anywhere in the codebase

**Removal SQL:**

```sql
-- Remove the function (if it exists)
DROP FUNCTION IF EXISTS public.get_bookmark_categories_with_counts(text);

-- Verify removal
SELECT
  routine_name,
  routine_schema
FROM information_schema.routines
WHERE routine_name = 'get_bookmark_categories_with_counts'
  AND routine_schema = 'public';
-- Should return no rows
```

**Note:** This function may already be removed or may not exist. This is safe to run regardless.

## Functions to Keep

The following RPC functions should **NOT** be removed as they are still actively used:

### `update_word_and_review`

- **Status:** ✅ Still in use
- **Used by:** `services/studyWordsFSRS.ts`
- **Reason:** Provides atomic updates and inserts review records. Critical for FSRS algorithm integrity.

### `delete_user_account`

- **Status:** ✅ Still in use
- **Used by:** `services/accountDeletion.ts`
- **Reason:** Required for App Store compliance. Handles multi-table deletion with proper security.

## Removal Procedure

### Step 1: Pre-Removal Verification

```sql
-- Check current function usage in logs (if available)
-- Review Supabase logs for any calls to these functions in the last 30 days
```

### Step 2: Backup (Optional but Recommended)

```sql
-- Export function definitions before removal (for rollback if needed)
SELECT
  routine_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('upsert_reading_progress', 'get_bookmark_categories_with_counts');
```

Save the output for reference.

### Step 3: Remove Functions

Execute the removal SQL commands above in the Supabase SQL Editor.

### Step 4: Post-Removal Verification

1. **Verify Function Removal:**

   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_schema = 'public'
     AND routine_name IN ('upsert_reading_progress', 'get_bookmark_categories_with_counts');
   -- Should return no rows
   ```

2. **Test Application Functionality:**
   - Open an article and read through it
   - Verify reading progress is saved correctly
   - Check that progress percentage displays correctly
   - Verify no errors in application logs

3. **Monitor for Errors:**
   - Check Supabase logs for any function-not-found errors
   - Monitor application error tracking (Sentry) for related issues
   - Watch for any user reports of reading progress issues

## Rollback Plan

If issues arise after removal:

1. **Restore Function:**

   ```sql
   -- Restore upsert_reading_progress (if needed)
   CREATE OR REPLACE FUNCTION public.upsert_reading_progress(
     p_user_id uuid,
     p_article_id bigint,
     p_last_sentence_read integer,
     p_total_sentences integer
   )
   RETURNS void
   LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path TO 'public'
   AS $function$
   BEGIN
     INSERT INTO reading_progress (user_id, article_id, last_sentence_read, total_sentences)
     VALUES (p_user_id, p_article_id, p_last_sentence_read, p_total_sentences)
     ON CONFLICT (user_id, article_id)
     DO UPDATE SET
       last_sentence_read = p_last_sentence_read,
       total_sentences = p_total_sentences,
       updated_at = NOW();
   END;
   $function$;
   ```

2. **Revert Code:**
   - Temporarily revert `services/readingProgress.ts` to use RPC call
   - This should only be necessary if critical issues are discovered

## Timeline Recommendations

- **Week 1-2:** Deploy client-side implementation
- **Week 3-4:** Monitor for issues, verify functionality
- **Week 5+:** If no issues, proceed with database cleanup

## Impact Assessment

### Low Risk

- `upsert_reading_progress` - Simple operation, well-tested client-side replacement
- `get_bookmark_categories_with_counts` - Already broken/unused

### No Impact

- Application code already uses client-side implementation
- No schema changes required
- No data migration needed

## Related Documentation

- Migration Plan: See commit history for RPC function migration
- Client Implementation: `services/readingProgress.ts`
- Type Definitions: `types/database.types.ts` (already updated)

## Checklist

Before executing removal:

- [ ] Client-side implementation deployed to production
- [ ] At least 1-2 weeks of stable operation
- [ ] No errors in logs related to reading progress
- [ ] Manual testing confirms reading progress works correctly
- [ ] Verified no other services use these functions
- [ ] Backup function definitions (optional but recommended)
- [ ] Reviewed rollback plan
- [ ] Scheduled during low-traffic period (optional)

## Notes

- The database functions can remain in the database indefinitely without causing issues
- Removal is optional and primarily for database cleanliness
- No urgency to remove - functions can stay if preferred
- If unsure, err on the side of caution and keep functions longer
