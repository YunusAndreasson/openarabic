begin;
-- Old releases submit complete FSRS grades directly. Match the predecessor
-- under the row lock, independently of which client made the previous write.
create function public.guard_practice_grade() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.fsrs_reps = coalesce(old.fsrs_reps,0)+1 then return new; end if;
  if new.fsrs_state=0 and new.fsrs_reps=0 and new.fsrs_lapses=0 and
     new.fsrs_learning_steps=0 and new.fsrs_scheduled_days=0 then return new; end if;
  -- An identical retry after a lost response changes no scheduler data.
  if (to_jsonb(new)-'review_revision') = (to_jsonb(old)-'review_revision') then return new; end if;
  raise serialization_failure using message='Study word changed before this grade';
end;
$$;
revoke all on function public.guard_practice_grade() from public,anon,authenticated;
create trigger guard_practice_grade before update of fsrs_reps on public.study_words
for each row execute function public.guard_practice_grade();
commit;
