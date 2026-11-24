-- Proposed migration. The ordinary Practice writer and older clients must also
-- advance the revision. Existing rows start at NULL without a table rewrite.
begin;

alter table public.study_words add column review_revision uuid;
create function public.stamp_review_revision() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.review_revision := gen_random_uuid();
  return new;
end;
$$;
create trigger stamp_review_revision before insert or update on public.study_words
for each row execute function public.stamp_review_revision();

create table public.first_review_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  root_id bigint not null,
  attempt_id uuid not null,
  receipt jsonb not null,
  primary key (user_id, root_id, attempt_id)
);
alter table public.first_review_attempts enable row level security;
revoke all on public.first_review_attempts from public, anon, authenticated;

-- The client computes the schedule with the same pinned FSRS engine as Practice.
-- The server owns revision checks, the drill, and the immutable acknowledgement.
-- Definer access lets the function write receipts while clients cannot forge them.
-- p_expected is a precondition. No argument grants access to another owner.
create function public.grade_first_review(
  p_root bigint, p_attempt uuid, p_expected jsonb default null,
  p_grade text default null, p_update jsonb default null, p_previous uuid default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  card public.study_words%rowtype;
  proposed public.study_words%rowtype;
  prior jsonb;
  result jsonb;
  streak integer := 0;
  reasks integer := 0;
  finished boolean;
begin
  if owner_id is null then raise insufficient_privilege; end if;
  if p_root is null or p_attempt is null then raise invalid_parameter_value; end if;

  select receipt into result from public.first_review_attempts
    where user_id = owner_id and root_id = p_root and attempt_id = p_attempt;
  if found then return result; end if;
  if p_grade is null then return jsonb_build_object('status','missing'); end if;

  select * into card from public.study_words
    where user_id = owner_id and root_id = p_root for update;
  -- A concurrent copy may have committed while this call waited for the lock.
  select receipt into result from public.first_review_attempts
    where user_id = owner_id and root_id = p_root and attempt_id = p_attempt;
  if found then return result; end if;

  if card.user_id is null or (p_expected->>'owner')::uuid is distinct from owner_id
     or not (p_expected ? 'revision')
     or (p_expected->>'revision')::uuid is distinct from card.review_revision
     or card.created_at is distinct from (p_expected->>'created')::timestamptz then
    return jsonb_build_object('status','conflict');
  end if;
  if p_previous is not null then
    select receipt into prior from public.first_review_attempts
      where user_id = owner_id and root_id = p_root and attempt_id = p_previous;
    if prior is null or (prior->>'complete')::boolean
       or (prior->>'revision')::uuid is distinct from card.review_revision then
      return jsonb_build_object('status','conflict');
    end if;
    streak := (prior->>'streak')::integer;
    reasks := (prior->>'reasks')::integer;
  end if;

  proposed := jsonb_populate_record(null::public.study_words, p_update);
  if p_grade not in ('unknown','vague','known') or
     proposed.fsrs_reps is distinct from coalesce(card.fsrs_reps,0) + 1 or
     proposed.fsrs_last_review is null or proposed.fsrs_due is null or
     proposed.fsrs_due < proposed.fsrs_last_review or
     proposed.fsrs_stability is null or proposed.fsrs_difficulty is null or
     proposed.fsrs_state is null or proposed.fsrs_learning_steps is null or
     proposed.fsrs_scheduled_days is null or proposed.fsrs_lapses is null then
    raise invalid_parameter_value using message = 'Invalid review schedule';
  end if;

  -- The Practice criterion is two successive recalls after a miss and the cap
  -- is six reasks. In the guided review every Forgot goes back to recall;
  -- once the cap is reached the next successful recall can finish the drill.
  finished := p_grade <> 'unknown' and
              (p_previous is null or streak + 1 >= 2 or reasks >= 6);
  streak := case when p_grade = 'unknown' then 0 else streak + 1 end;
  if not finished then reasks := reasks + 1; end if;

  update public.study_words set
    fsrs_due = proposed.fsrs_due, fsrs_last_review = proposed.fsrs_last_review,
    fsrs_model = proposed.fsrs_model, fsrs_state = proposed.fsrs_state,
    fsrs_stability = proposed.fsrs_stability, fsrs_stability_fast = proposed.fsrs_stability_fast,
    fsrs_fast_reviewed_at = proposed.fsrs_fast_reviewed_at,
    fsrs_difficulty = proposed.fsrs_difficulty, fsrs_scheduled_days = proposed.fsrs_scheduled_days,
    fsrs_learning_steps = proposed.fsrs_learning_steps, fsrs_lapses = proposed.fsrs_lapses,
    fsrs_reps = proposed.fsrs_reps
    where user_id = owner_id and root_id = p_root returning * into card;

  result := jsonb_build_object('status','confirmed','attempt',p_attempt,'root',p_root,
    'grade',p_grade,'reviewed',card.fsrs_last_review,'due',card.fsrs_due,
    'revision',card.review_revision,'complete',finished,'reasks',reasks,'streak',streak);
  insert into public.first_review_attempts values (owner_id,p_root,p_attempt,result);
  return result;
end;
$$;
revoke all on function public.grade_first_review(bigint,uuid,jsonb,text,jsonb,uuid)
  from public, anon, authenticated;
grant execute on function public.grade_first_review(bigint,uuid,jsonb,text,jsonb,uuid) to authenticated;
commit;
