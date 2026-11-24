-- Run after first_review.sql and the 20261124 migrations in a disposable database.
do $$
declare
 owner uuid := '00000000-0000-4000-8000-000000000001';
 intent uuid := gen_random_uuid();
 result jsonb;
begin
 perform set_config('request.jwt.claim.sub',owner::text,true);
 result := public.save_reader_word(91,intent,true);
 assert result->>'outcome' = 'saved';
 delete from public.study_words where root_id=91 and user_id=owner;
 assert public.save_reader_word(91,intent,true) = result;
 assert not exists(select from public.study_words where root_id=91 and user_id=owner);
 assert public.save_reader_word(91,intent,false)->>'outcome'='saved', 'lost acknowledgement must consume the original slot';
 assert not has_function_privilege('anon','public.save_reader_word(bigint,uuid,boolean)','EXECUTE');
 assert not has_table_privilege('authenticated','public.reader_save_receipts','INSERT');
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
 assert public.save_reader_word(91,intent,false)->>'outcome'='missing';
end;
$$;

-- Losing the receipt insert must roll back the card as well.
create trigger test_reader_receipt_failure before insert on public.reader_save_receipts
for each row execute function public.test_receipt_failure();
do $$
declare
  owner uuid := '00000000-0000-4000-8000-000000000001';
  intent uuid := gen_random_uuid();
begin
  perform set_config('request.jwt.claim.sub',owner::text,true);
  perform set_config('test.fail_receipt','on',true);
  begin
    perform public.save_reader_word(93,intent,true);
    raise exception 'injected receipt failure did not abort the add';
  exception when check_violation then null;
  end;
  assert not exists(select from public.study_words where user_id=owner and root_id=93);
  assert not exists(select from public.reader_save_receipts where user_id=owner and intent_id=intent);
  perform set_config('test.fail_receipt','off',true);
  assert public.save_reader_word(93,intent,true)->>'outcome'='saved';
  assert public.save_reader_word(93,gen_random_uuid(),false)->>'outcome'='existing';
  begin
    perform public.save_reader_word(94,intent,true);
    raise exception 'intent reused for another word';
  exception when invalid_parameter_value then null;
  end;
end;
$$;
