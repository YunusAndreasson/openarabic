do $$
declare
 owner uuid := '00000000-0000-4000-8000-000000000001';
 base public.study_words%rowtype;
 receipt jsonb;
 schedule jsonb;
begin
 perform set_config('request.jwt.claim.sub',owner::text,true);
 insert into public.study_words(user_id,root_id) values(owner,92) returning * into base;
 schedule:=jsonb_build_object('fsrs_model','FSRS-6','fsrs_state',1,'fsrs_stability',1,'fsrs_difficulty',5,'fsrs_due',now()+interval '1 day','fsrs_last_review',now(),'fsrs_learning_steps',1,'fsrs_lapses',0,'fsrs_scheduled_days',1,'fsrs_reps',1);
 receipt:=public.grade_first_review(92,gen_random_uuid(),jsonb_build_object('owner',owner,'revision',base.review_revision,'created',base.created_at),'known',schedule);
 assert receipt->>'status'='confirmed';
 begin
  update public.study_words set fsrs_due=now()+interval '5 days',fsrs_reps=1 where root_id=92 and user_id=owner;
  raise exception 'stale Practice write overwrote a confirmed grade';
 exception when serialization_failure then null;
 end;
 update public.study_words set fsrs_state=0, fsrs_reps=0, fsrs_lapses=0, fsrs_learning_steps=0,fsrs_scheduled_days=0 where root_id=92 and user_id=owner;
end;
$$;
