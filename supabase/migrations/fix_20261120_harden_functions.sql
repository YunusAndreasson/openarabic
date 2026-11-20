-- Function hardening from the 2026-11-20 security review.
-- No numeric prefix, so the Supabase CLI skips this file. Run it in the SQL editor.
--
-- 1. delete_user_account: the ownership check was `IF auth.uid() != user_id`. When auth.uid()
--    is NULL the comparison is NULL and the check never raises (fix_20261031 closed this for
--    anon by revoking EXECUTE; this closes it in the function itself). Body otherwise unchanged;
--    CREATE OR REPLACE keeps the grants from fix_20261031.
-- 2. sync_difficulty_scales is a SECURITY DEFINER trigger function, and anon/authenticated could
--    call it at /rest/v1/rpc/sync_difficulty_scales. Triggers do not check EXECUTE when they
--    fire, so revoking it changes nothing for the study_words trigger.
-- 3. set_updated_at had a role-mutable search_path (advisor lint 0011). It only calls
--    pg_catalog functions, so an empty search_path is safe.

begin;

create or replace function public.delete_user_account(user_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  -- Verify the requesting user is the account owner (NULL-safe: no session means no delete)
  if auth.uid() is distinct from user_id then
    raise exception 'Unauthorized: Cannot delete another user''s account';
  end if;

  -- Delete user data, child records first
  delete from study_words where study_words.user_id = delete_user_account.user_id;
  delete from reading_progress where reading_progress.user_id = delete_user_account.user_id;
  delete from reading_list where reading_list.user_id = delete_user_account.user_id;

  -- Delete the auth user
  delete from auth.users where id = delete_user_account.user_id;
end;
$function$;

revoke execute on function public.sync_difficulty_scales() from public, anon, authenticated;

alter function public.set_updated_at() set search_path = '';

commit;

-- Verify: expect anon_delete=false, auth_delete=true, anon_sync=false, auth_sync=false,
-- body_null_safe=true, set_updated_at_path={search_path=""}.
select has_function_privilege('anon', 'public.delete_user_account(uuid)', 'execute') as anon_delete,
       has_function_privilege('authenticated', 'public.delete_user_account(uuid)', 'execute') as auth_delete,
       has_function_privilege('anon', 'public.sync_difficulty_scales()', 'execute') as anon_sync,
       has_function_privilege('authenticated', 'public.sync_difficulty_scales()', 'execute') as auth_sync,
       pg_get_functiondef('public.delete_user_account(uuid)'::regprocedure) like '%is distinct from user_id%' as body_null_safe,
       (select proconfig from pg_proc where oid = 'public.set_updated_at()'::regprocedure) as set_updated_at_path;
