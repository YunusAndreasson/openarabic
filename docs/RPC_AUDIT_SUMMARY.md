# RPC Function Audit Summary

**Date**: 2025-11-06
**Task**: Validate all RPC functions in Supabase - verify they're used and justified vs local code

---

## Executive Summary

Audited all RPC functions in the Supabase database. Found 3 functions remaining after cleanup:

- ✅ **1 Application-callable RPC** (`delete_user_account`) - justified and required
- ✅ **2 Database trigger functions** - justified for data integrity
- ❌ **1 Obsolete RPC deleted** (`update_word_and_review`) - replaced with direct UPDATE

**Result**: All remaining functions are justified. No further deletions needed.

---

## Functions Analyzed

### 1. `delete_user_account` ✅ KEEP

**Type**: Application-callable RPC
**Status**: ACTIVE and REQUIRED

**Used in**: `services/accountDeletion.ts:43`

**Purpose**: Multi-table account deletion

- Deletes from: `study_words`, `reading_progress`, `reading_list`, `auth.users`
- Requires `SECURITY DEFINER` to access `auth.users` schema
- Implements App Store requirement (5.1.1v) for account deletion

**Why RPC is Required**:

- Client-side code cannot access `auth.users` table (restricted schema)
- RPC runs with database privileges via `SECURITY DEFINER`
- Performs atomic multi-table deletion with proper authorization checks

**Cannot be moved to local code**: Correct - requires elevated database privileges

**Justification**: ✅ Essential for App Store compliance and secure multi-schema deletion

---

### 2. `sync_difficulty_scales` ✅ KEEP

**Type**: Database trigger function
**Status**: ACTIVE (automatic database operation)

**Used in**: Internal database trigger (not called from application)
**Data Type**: `trigger` (from `information_schema.routines`)

**Purpose**: Automatically syncs difficulty scales across related tables when data changes

**Why Database Trigger**:

- Fires automatically on INSERT/UPDATE/DELETE operations
- Ensures data consistency at database level
- Cannot be handled reliably in application code (race conditions, missed updates)

**Cannot be moved to local code**: Correct - requires database-level automation for consistency

**Justification**: ✅ Essential for data integrity, runs automatically without app intervention

**Important**: This is NOT an RPC function - do not call via `supabase.rpc()`

---

### 3. `update_bookmark_categories_updated_at` ✅ KEEP

**Type**: Database trigger function
**Status**: ACTIVE (automatic database operation)

**Used in**: Internal database trigger (not called from application)
**Data Type**: `trigger` (from `information_schema.routines`)

**Purpose**: Automatically updates `updated_at` timestamp when bookmark categories change

**Why Database Trigger**:

- Fires automatically on UPDATE operations
- Ensures timestamps are always accurate without manual tracking
- Standard pattern for timestamp management in databases

**Cannot be moved to local code**: Correct - automatic timestamp updates require trigger

**Justification**: ✅ Standard database pattern for timestamp automation

**Important**: This is NOT an RPC function - do not call via `supabase.rpc()`

---

### 4. `update_word_and_review` ❌ DELETED

**Type**: Application-callable RPC (obsolete)
**Status**: DELETED on 2025-11-06

**Previously used**: Nowhere (obsolete before deletion)
**Last active use**: Before 2025-11-06 refactor

**Why it was deleted**:

- Replaced with direct UPDATE query in `services/studyWordsFSRS.ts:170`
- Single-table UPDATE doesn't require RPC complexity
- RLS policies already handle authorization
- Simpler architecture: direct queries > RPC for simple operations

**Deletion details**:

- Original signature used incorrect types (TEXT vs UUID, NUMERIC vs REAL)
- Final signature: `(p_user_id UUID, p_root_id INTEGER, p_fsrs_due TIMESTAMPTZ, ...)`
- Deleted via SQL: `DROP FUNCTION IF EXISTS update_word_and_review(...)`

**Replacement**: Direct Supabase UPDATE in TypeScript

```typescript
supabase
  .from('study_words')
  .update({ fsrs_due, fsrs_stability, ... })
  .eq('user_id', userId)
  .eq('root_id', rootId)
```

**Benefits of replacement**:

- ✅ No database migration needed
- ✅ Full TypeScript type safety
- ✅ Simpler debugging (all code in TypeScript)
- ✅ Faster deployment (just code changes)
- ✅ RLS policies handle authorization

**Justification for deletion**: ✅ Correctly removed - unnecessary complexity for simple UPDATE

---

## Audit Methodology

### Phase 1: Inventory

- Queried `information_schema.routines` to list all functions
- Found 3 functions: `delete_user_account`, `sync_difficulty_scales`, `update_bookmark_categories_updated_at`
- Plus 1 obsolete: `update_word_and_review`

### Phase 2: Usage Analysis

- Searched entire codebase for each function name
- Used `grep -r` across all `.ts`, `.tsx`, `.js`, `.py`, `.sql` files
- Checked for `.rpc('function_name')` calls

### Phase 3: Type Classification

- Queried `information_schema.routines` to get `data_type` and `type_udt_name`
- Distinguished between:
  - **RPC functions** (callable via `supabase.rpc()`)
  - **Trigger functions** (automatic database operations)

### Phase 4: Justification Analysis

For each function, evaluated:

1. Is it used in application code?
2. Does it require database-level privileges (SECURITY DEFINER)?
3. Does it perform multi-table operations?
4. Could it be replaced with client-side code?
5. Is it justified as an RPC/trigger vs local code?

---

## Key Findings

### Application-Callable RPCs: 1

- Only `delete_user_account` is called from application via `supabase.rpc()`
- All other database functions are triggers (internal automation)

### Database Triggers: 2

- `sync_difficulty_scales` - data consistency
- `update_bookmark_categories_updated_at` - timestamp automation
- These appear in `Functions` type but are NOT exposed via `.rpc()`

### Architecture Decision: Direct Queries > RPCs

- Prefer direct Supabase queries for simple operations
- Use RPCs only when:
  - Multi-schema access required (e.g., auth.users)
  - Complex transactions with business logic
  - Operations requiring elevated privileges

### Documentation Added

- **`types/database.types.ts`**: Added comprehensive comments explaining RPC vs trigger distinction
- **`services/accountDeletion.ts`**: Added "WHY RPC?" comment explaining SECURITY DEFINER requirement

---

## Cleanup Actions Taken

### Deleted from Database

- ❌ `update_word_and_review` RPC function (replaced with direct UPDATE)

### Deleted from Codebase

- ❌ `types/database.types.ts`: Removed `update_word_and_review` type definition

### Archived for Reference

Moved to `docs/rpc-cleanup-2025-11-06/`:

- Diagnostic scripts (diagnose_streak.py, diagnose_streak_v2.py)
- SQL deletion scripts
- Verification scripts
- Cleanup instructions

---

## Recommendations

### For Future Development

1. **Prefer Direct Queries Over RPCs**
   - Use `supabase.from('table').update()` for simple operations
   - Reserve RPCs for privileged operations only

2. **When to Use RPCs**
   - ✅ Multi-schema operations (e.g., accessing `auth.users`)
   - ✅ Complex transactions requiring atomicity
   - ✅ Operations needing `SECURITY DEFINER` privileges
   - ❌ Simple CRUD operations (use direct queries)

3. **Trigger Function Best Practices**
   - ✅ Use for data consistency (e.g., syncing related tables)
   - ✅ Use for automatic timestamp updates
   - ✅ Document in `database.types.ts` that they're NOT callable via `.rpc()`
   - ❌ Don't call trigger functions from application code

4. **Documentation Standards**
   - Document "WHY RPC?" in code comments when using `supabase.rpc()`
   - Explain what privilege escalation or multi-schema access is needed
   - Reference requirement documents (e.g., App Store guidelines)

---

## Testing & Verification

### Tests Updated

- ✅ `__tests__/services/studyWordsFSRS.test.ts` - Updated mocks for direct UPDATE
- ✅ `__tests__/integration/streakTracking.test.ts` - Comprehensive streak testing (1-30 days)

### Verification Performed

- ✅ Confirmed `delete_user_account` still exists via `supabase.rpc()` call
- ✅ Confirmed `update_word_and_review` returns 404 (deleted)
- ✅ Verified trigger functions exist via `information_schema.routines`
- ✅ All tests passing (10/10 unit, 7/7 integration)

---

## References

- **Implementation**: `services/studyWordsFSRS.ts:170` (direct UPDATE replacement)
- **Types**: `types/database.types.ts:464` (RPC function definitions)
- **Documentation**: `SUPABASE_BACKEND_REQUIREMENTS.md` (backend requirements)
- **Service**: `services/accountDeletion.ts:43` (delete_user_account usage)
- **Cleanup artifacts**: `docs/rpc-cleanup-2025-11-06/` (archived scripts)

---

## Conclusion

The RPC function audit confirmed that the database architecture is sound:

- **1 application-callable RPC** properly justified for App Store compliance
- **2 trigger functions** correctly used for data integrity
- **1 obsolete RPC** successfully removed and replaced with simpler code

All remaining functions serve clear purposes and cannot be effectively moved to local code. The codebase now has better documentation explaining the distinction between RPCs and triggers.

**Status**: ✅ Audit complete. No further cleanup needed.

---

**Last Updated**: 2025-11-06
**Author**: Claude Code
**Related Work**: Streak tracking fix, direct UPDATE migration
