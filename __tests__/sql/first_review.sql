\set ON_ERROR_STOP on
-- Run with psql -X -v ON_ERROR_STOP=1 -f __tests__/sql/first_review.sql
-- in an empty, disposable PostgreSQL cluster. The fixture models old cards and
-- the two API roles before installing the migration. No external services.
set plpgsql.check_asserts = on;
create schema auth;
create role anon;
create role authenticated;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid
$$;
create table public.study_words(
  user_id uuid not null, root_id bigint not null, created_at timestamptz default now(),
  fsrs_reps int default 0, fsrs_state int default 0, fsrs_model text not null default 'FSRS-6',
  fsrs_due timestamptz, fsrs_last_review timestamptz, fsrs_stability float8,
  fsrs_stability_fast float8, fsrs_fast_reviewed_at timestamptz, fsrs_difficulty float8,
  fsrs_scheduled_days int, fsrs_learning_steps int, fsrs_lapses int,
  primary key(user_id,root_id)
);
insert into auth.users values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into public.study_words(user_id,root_id) select id,18276 from auth.users;

\ir ../../supabase/migrations/20261123_grade_first_review.sql

-- Force the acknowledgement insert to fail after the FSRS update.
create function public.test_receipt_failure() returns trigger language plpgsql as $$
begin
  if current_setting('test.fail_receipt',true) = 'on' then raise check_violation; end if;
  return new;
end;
$$;
create trigger test_receipt_failure before insert on public.first_review_attempts
for each row execute function public.test_receipt_failure();

do $$
declare
  own uuid := '00000000-0000-4000-8000-000000000001';
  other_user uuid := '00000000-0000-4000-8000-000000000002';
  attempt uuid := gen_random_uuid();
  previous_id uuid;
  expected jsonb;
  schedule jsonb;
  receipt jsonb;
  saved jsonb;
  applied integer;
begin
  assert not has_function_privilege('anon','public.grade_first_review(bigint,uuid,jsonb,text,jsonb,uuid)','EXECUTE');
  assert not has_table_privilege('authenticated','public.first_review_attempts','INSERT');
  begin
    perform public.grade_first_review(18276,attempt);
    raise exception 'missing session accepted';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub',own::text,true);
  select jsonb_build_object('owner',own,'created',created_at,'revision',review_revision)
    into expected from public.study_words where user_id=own;
  schedule := jsonb_build_object('fsrs_due',now()+interval '1 minute','fsrs_last_review',now(),
    'fsrs_reps',1,'fsrs_learning_steps',0,'fsrs_model','FSRS-6','fsrs_state',1,'fsrs_stability',1.4,
    'fsrs_lapses',0,'fsrs_scheduled_days',0,'fsrs_difficulty',6.0);

  perform set_config('test.fail_receipt','on',true);
  begin
    perform public.grade_first_review(18276,attempt,expected,'unknown',schedule);
    raise exception 'expected receipt insert to fail';
  exception when check_violation then null;
  end;
  assert (select fsrs_reps=0 and review_revision is null from public.study_words where user_id=own);
  assert public.grade_first_review(18276,attempt)->>'status'='missing';
  perform set_config('test.fail_receipt','off',true);
  saved := public.grade_first_review(18276,attempt,expected,'unknown',schedule);
  assert saved->>'status' = 'confirmed' and saved->>'complete' = 'false';
  assert public.grade_first_review(18276,attempt) = saved;
  assert public.grade_first_review(18276,attempt,expected,'unknown',schedule) = saved;
  assert public.grade_first_review(18276,gen_random_uuid(),expected,'known',schedule)->>'status' = 'conflict';
  select fsrs_reps into applied from public.study_words where user_id=own;
  assert applied=1;
  perform set_config('request.jwt.claim.sub',other_user::text,true);
  assert public.grade_first_review(18276,attempt)->>'status' = 'missing';
  assert public.grade_first_review(18276,attempt,expected,'known',schedule)->>'status' = 'conflict';
  perform set_config('request.jwt.claim.sub',own::text,true);

  previous_id := attempt;
  for n in 2..3 loop
    attempt := gen_random_uuid();
    expected := expected || jsonb_build_object('revision',saved->>'revision');
    saved := public.grade_first_review(18276,attempt,expected,'known',
      schedule || jsonb_build_object('fsrs_reps',n),previous_id);
    assert saved->>'status' = 'confirmed';
    assert (saved->>'complete')::boolean = (n=3);
    previous_id := attempt;
  end loop;
  -- A write from an older Practice client also invalidates the loaded revision.
  expected := expected || jsonb_build_object('revision',saved->>'revision');
  update public.study_words set fsrs_due=now() where user_id=own;
  receipt := public.grade_first_review(18276,gen_random_uuid(),expected,'known',schedule);
  assert receipt->>'status'='conflict';
  assert public.grade_first_review(18276,attempt) = saved;

  -- The cap is never an automatic pass on Forgot. Six reasks still require recall.
  previous_id := null;
  for n in 4..11 loop
    select expected || jsonb_build_object('revision',review_revision)
      into expected from public.study_words where user_id=own;
    attempt := gen_random_uuid();
    saved := public.grade_first_review(18276,attempt,expected,
      case when n=11 then 'vague' else 'unknown' end,
      schedule || jsonb_build_object('fsrs_reps',n),previous_id);
    assert saved->>'status'='confirmed' and (saved->>'complete')::boolean = (n=11);
    previous_id := attempt;
  end loop;
end;
$$;
