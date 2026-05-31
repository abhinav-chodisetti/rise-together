-- ============================================================================
-- 008_photo_proof.sql
--
-- Adds optional photo-proof verification mode to challenges:
--   - challenges.verification ('honor' | 'photo'), default 'honor'
--   - challenge_completions.photo_url (storage PATH, not a public URL)
--   - private Storage bucket `challenge-proofs`
--   - storage.objects policies: authed-write-own-folder, authed-read
--
-- Photos live in a PRIVATE bucket. The client mints short-lived signed URLs
-- via supabase.storage.createSignedUrls() — standard practice for user
-- photos of people. A path that leaks doesn't grant access by itself.
-- ============================================================================

-- 1. Schema changes -----------------------------------------------------------

alter table public.challenges
  add column if not exists verification text not null default 'honor';

alter table public.challenges
  drop constraint if exists challenges_verification_valid;
alter table public.challenges
  add constraint challenges_verification_valid
  check (verification in ('honor', 'photo'));

alter table public.challenge_completions
  add column if not exists photo_url text;


-- 2. Storage bucket -----------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('challenge-proofs', 'challenge-proofs', false)
on conflict (id) do nothing;


-- 3. Storage policies ---------------------------------------------------------

-- Authed users can upload into a folder named with their Clerk user id.
drop policy if exists "challenge_proofs_authed_upload_own" on storage.objects;
create policy "challenge_proofs_authed_upload_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'challenge-proofs'
  and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
);

-- Authed users can read objects in the bucket (signing happens through the
-- authed client; the path itself only reaches co-members via the
-- RLS-protected completion row that holds it).
drop policy if exists "challenge_proofs_authed_read" on storage.objects;
create policy "challenge_proofs_authed_read"
on storage.objects for select to authenticated
using (bucket_id = 'challenge-proofs');

-- Owner can delete their own objects (for undo / GC later).
drop policy if exists "challenge_proofs_delete_own" on storage.objects;
create policy "challenge_proofs_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'challenge-proofs'
  and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
);
