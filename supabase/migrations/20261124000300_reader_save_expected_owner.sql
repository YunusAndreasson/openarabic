begin;

-- Keep the deployed three-argument contract. The new overload checks the
-- journal precondition using the same request identity as the receipt writer.
create function public.save_reader_word(
  p_root bigint, p_intent uuid, p_insert boolean, p_expected_owner uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_expected_owner is null or auth.uid() is distinct from p_expected_owner then
    raise insufficient_privilege using message = 'Reader save account changed';
  end if;
  return public.save_reader_word(p_root, p_intent, p_insert);
end;
$$;

revoke all on function public.save_reader_word(bigint,uuid,boolean,uuid) from public,anon,authenticated;
grant execute on function public.save_reader_word(bigint,uuid,boolean,uuid) to authenticated;
commit;
