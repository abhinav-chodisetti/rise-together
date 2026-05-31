-- ============================================================================
-- 013_photo_proof_read_tighten.sql
--
-- 008's storage.objects read policy on the `challenge-proofs` bucket grants
-- select to ANY authed user (gated only on bucket_id). Combined with paths
-- that follow a predictable scheme (<clerk_user_id>/<challenge_id>-<ts>.jpg),
-- the "path is the secret" defense is too weak.
--
-- Replace it with a membership-aware policy:
--   1. owner of the folder (own uploads), OR
--   2. the path appears in a challenge_completions row this caller is
--      allowed to read (i.e. a co-member of the same challenge).
-- Idempotent: drops the old policy by name and recreates.
-- ============================================================================

drop policy if exists "challenge_proofs_authed_read" on storage.objects;

create policy "challenge_proofs_authed_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'challenge-proofs'
  and (
    (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
    or exists (
      select 1
      from public.challenge_completions cc
      where cc.photo_url = name
        and public.is_challenge_participant(cc.challenge_id)
    )
  )
);
