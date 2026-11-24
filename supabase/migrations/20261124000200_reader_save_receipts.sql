begin;
create table public.reader_save_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  intent_id uuid not null,
  root_id bigint not null,
  added boolean not null,
  primary key(user_id,intent_id)
);
alter table public.reader_save_receipts enable row level security;
revoke all on public.reader_save_receipts from public,anon,authenticated;

-- A lookup can acknowledge an already-present card, even at the daily limit.
-- Only a caller that has reserved a slot may request creation. No card FK:
-- removing a study word must not remove the acknowledgement.
create function public.save_reader_word(p_root bigint,p_intent uuid,p_insert boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  receipt public.reader_save_receipts%rowtype;
  inserted boolean := false;
begin
  if owner_id is null then raise insufficient_privilege; end if;
  if p_root is null or p_root <= 0 or p_intent is null then raise invalid_parameter_value; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text || p_intent::text, 0));
  select * into receipt from public.reader_save_receipts where user_id=owner_id and intent_id=p_intent;
  if found then
    if receipt.root_id <> p_root then raise invalid_parameter_value; end if;
    inserted := receipt.added;
  else
    if p_insert then
      insert into public.study_words(user_id,root_id,created_at,fsrs_model,fsrs_state,fsrs_due,
        fsrs_last_review,fsrs_reps,fsrs_lapses,fsrs_learning_steps,fsrs_scheduled_days,fsrs_stability,fsrs_difficulty)
      values(owner_id,p_root,now(),'FSRS-6',0,now(),now(),0,0,0,0,0.4,6.5)
      on conflict(user_id,root_id) do nothing;
      inserted := found;
    elsif not exists(select from public.study_words where user_id=owner_id and root_id=p_root) then
      return jsonb_build_object('outcome','missing');
    end if;
    insert into public.reader_save_receipts values(owner_id,p_intent,p_root,inserted);
  end if;
  return jsonb_build_object('outcome',case when inserted then 'saved' else 'existing' end);
end;
$$;
revoke all on function public.save_reader_word(bigint,uuid,boolean) from public,anon,authenticated;
grant execute on function public.save_reader_word(bigint,uuid,boolean) to authenticated;
commit;
