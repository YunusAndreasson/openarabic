-- The verified session on the device was A. The request reached PostgreSQL as B.
do $$
declare
  requested uuid := '00000000-0000-4000-8000-000000000001';
  active_user uuid := '00000000-0000-4000-8000-000000000002';
  intent uuid := gen_random_uuid();
begin
  perform set_config('request.jwt.claim.sub',active_user::text,true);
  begin
    if to_regprocedure('public.save_reader_word(bigint,uuid,boolean,uuid)') is null then
      -- Baseline: the old client validated A locally and sent these three arguments as B.
      perform public.save_reader_word(99,intent,true);
      assert exists(select from public.study_words where user_id=active_user and root_id=99);
    else
      perform public.save_reader_word(99,intent,true,requested);
    end if;
    raise exception 'cross-account save succeeded';
  exception when insufficient_privilege then null;
  end;
  assert not exists(select from public.reader_save_receipts where intent_id=intent);
  assert not exists(select from public.study_words where root_id=99);
  perform set_config('request.jwt.claim.sub',requested::text,true);
  assert public.save_reader_word(99,intent,true,requested)->>'outcome'='saved';
  delete from public.study_words where root_id=99;
  assert public.save_reader_word(99,intent,false,requested)->>'outcome'='saved';
  assert not has_function_privilege('anon','public.save_reader_word(bigint,uuid,boolean,uuid)','EXECUTE');
end;
$$;
