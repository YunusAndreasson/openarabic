-- Storage bucket for screenshots attached to in-app feedback (components/account/FeedbackForm.tsx,
-- services/feedbackScreenshots.ts). The app uploaded to `feedback-screenshots` from the start, but
-- the bucket was never created, so every attachment failed and feedback arrived without it.
--
-- Private: a screenshot can show the learner's email and study data. Each object lives under
-- `<auth.uid()>/`, and only that user can upload, read (for the signed link sent with the
-- feedback) or delete it (account deletion clears the folder). The owner reads them through the
-- signed link in the Sentry feedback event or in the dashboard. Signed-out users cannot upload;
-- the form hides the attachment for them.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feedback-screenshots',
  'feedback-screenshots',
  false,
  10485760, -- 10 MB; the picker re-encodes at quality 0.8
  array['image/jpeg', 'image/png', 'image/heic', 'image/webp']
)
on conflict (id) do nothing;

create policy "feedback screenshots are uploaded by their owner"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'feedback-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "feedback screenshots are readable by their owner"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'feedback-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "feedback screenshots are deletable by their owner"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'feedback-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;

-- Verify: expect public=false, the 10 MB limit, and 3 policies.
select b.id, b.public, b.file_size_limit, b.allowed_mime_types,
       (select count(*) from pg_policy p
         where p.polrelid = 'storage.objects'::regclass
           and p.polname like 'feedback screenshots are %') as policies
from storage.buckets b
where b.id = 'feedback-screenshots';
