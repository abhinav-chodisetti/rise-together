-- ============================================================================
-- 010_transfer_admin_check.sql
--
-- Fixes a bug in 001_init.sql's `challenges_update_owner` policy:
-- it had only `USING` and no `WITH CHECK`. Postgres falls back to using the
-- USING clause as the WITH CHECK, so the owner could never change
-- owner_clerk_id to anyone other than themselves — the new row's
-- owner_clerk_id has to still equal `clerk_user_id()`, which fails the
-- moment we transfer admin.
--
-- Fix: explicit USING (current owner can attempt) + WITH CHECK (new owner
-- must be a current participant of this challenge). The membership check
-- runs through a SECURITY DEFINER helper so it isn't RLS-gated.
-- ============================================================================

-- Helper: does this clerk_user_id participate in this challenge?
create or replace function public.is_participant_of(
  p_challenge_id uuid,
  p_clerk_user_id text
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.challenge_participants
    where challenge_id = p_challenge_id
      and clerk_user_id = p_clerk_user_id
  );
$$;

grant execute on function public.is_participant_of(uuid, text) to authenticated;

-- Replace the broken UPDATE policy.
drop policy if exists "challenges_update_owner" on public.challenges;

create policy "challenges_update_owner" on public.challenges
  for update
  using (owner_clerk_id = public.clerk_user_id())
  with check (
    public.is_participant_of(challenges.id, challenges.owner_clerk_id)
  );
