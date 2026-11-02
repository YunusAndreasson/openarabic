-- delete_user_account: stop callers with no session.
-- The ownership check is `IF auth.uid() != user_id`. With no session auth.uid() is NULL,
-- so the comparison is NULL, the check never raises, and the delete runs with elevated rights.
-- The app only calls this signed in (services/accountDeletion.ts), so it keeps working.
-- No numeric prefix, so the Supabase CLI skips this file. Run it in the SQL editor.

begin;

revoke execute on function public.delete_user_account(uuid) from public, anon;
grant execute on function public.delete_user_account(uuid) to authenticated;

commit;

-- Verify: expect anon_can_run = false, signed_in_can_run = true.
select has_function_privilege('anon', 'public.delete_user_account(uuid)', 'execute') as anon_can_run,
       has_function_privilege('authenticated', 'public.delete_user_account(uuid)', 'execute') as signed_in_can_run;
