-- Columns and guard for FSRS-7, alongside FSRS-6.
--
-- NOT APPLIED. Review, then apply BEFORE shipping the app version that reads these
-- columns: that version selects and writes them whatever NEW_WORD_FSRS_MODEL says, so
-- against the current schema every study list read fails.
--
-- study_words holds current state only, so a learned word's FSRS-7 fast trace cannot
-- be rebuilt, and must not be invented. Every existing row therefore starts as FSRS-6,
-- and the app keeps it there. With the switch at its default no row ever changes model.
--
-- Additive: constant defaults add no table rewrite, older app versions keep working
-- because they name their columns, and no existing value changes.
--
-- Rollback, after reverting the app:
--   drop trigger study_words_demote_stale_fsrs7 on public.study_words;
--   drop function public.demote_stale_fsrs7();
--   Then the columns may be dropped. If the switch was ever on, words graded under
--   FSRS-7 in the meantime keep a slow-trace fsrs_stability that FSRS-6 reads as days,
--   so snapshot study_words first if an exact restore matters.

alter table public.study_words
  add column fsrs_model text not null default 'FSRS-6',
  add column fsrs_stability_fast double precision,
  add column fsrs_fast_reviewed_at timestamptz;

alter table public.study_words
  add constraint check_fsrs_model_valid
    check (fsrs_model in ('FSRS-6', 'FSRS-7')),
  add constraint check_fsrs_stability_fast_positive
    check (fsrs_stability_fast is null or fsrs_stability_fast > 0);

-- An older app version grades with FSRS-6 and does not know these columns. On an FSRS-7
-- word it writes FSRS-6 values and leaves the FSRS-7 label and fast trace behind. What
-- it wrote is a valid FSRS-6 state, so that is what the row becomes.
--
-- The tell is fsrs_fast_reviewed_at no longer matching fsrs_last_review: a current app
-- writes both with the same value on every FSRS-7 grade, and an older one moves only
-- the second.
--
-- NOT "fsrs_stability changed and fsrs_stability_fast did not". Real FSRS-7 reviews do
-- that all the time: 70,792 of 240,000 simulated reviews left the fast trace exactly
-- equal while the stability moved, so that test would demote genuine FSRS-7 words.
--
-- fsrs_state <> 0 leaves a new or reset word alone: it has no memory to protect, and
-- its first grade decides its model.
create function public.demote_stale_fsrs7()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.fsrs_model = 'FSRS-7'
    and new.fsrs_state <> 0
    and new.fsrs_fast_reviewed_at is distinct from new.fsrs_last_review
  then
    new.fsrs_model := 'FSRS-6';
    new.fsrs_stability_fast := null;
    new.fsrs_fast_reviewed_at := null;
  end if;
  return new;
end;
$$;

create trigger study_words_demote_stale_fsrs7
  before update on public.study_words
  for each row
  execute function public.demote_stale_fsrs7();
