-- ============================================================================
-- 003_rls_fix.sql  —  break the RLS infinite-recursion on challenge_participants
--
-- The problem: 001_init.sql wrote policies that check "am I a participant?"
-- by doing an EXISTS subquery on challenge_participants itself. RLS re-applies
-- to the inner query → infinite recursion → Postgres bails out.
--
-- The fix: wrap the membership check in a SECURITY DEFINER function so the
-- inner lookup runs as the table owner and bypasses RLS. Same function is
-- reused by every policy that needs "am I a participant".
--
-- To apply: Supabase Dashboard → SQL Editor → paste → Run.
-- Idempotent — uses `if exists` / `create or replace`.
-- ============================================================================

-- 1. Drop the recursive policies. -------------------------------------------
drop policy if exists "challenges_read_participant_or_owner" on public.challenges;
drop policy if exists "participants_read_co_member"          on public.challenge_participants;
drop policy if exists "completions_read_co_member"           on public.challenge_completions;
drop policy if exists "completions_insert_self_participant"  on public.challenge_completions;


-- 2. SECURITY DEFINER membership helper. ------------------------------------
-- Runs as the function owner (postgres) → bypasses RLS on the inner select.
-- Safe to expose: returns a boolean about the *calling* user only, no info
-- leak about other users.
create or replace function public.is_challenge_participant(p_challenge_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.challenge_participants
    where challenge_id = p_challenge_id
      and clerk_user_id = (auth.jwt() ->> 'sub')
  );
$$;

grant execute on function public.is_challenge_participant(uuid) to authenticated;


-- 3. Recreate the policies using the non-recursive helper. ------------------

-- challenges: you can see a challenge if you own it or you're a participant.
create policy "challenges_read_participant_or_owner" on public.challenges
  for select using (
    owner_clerk_id = public.clerk_user_id()
    or public.is_challenge_participant(id)
  );

-- challenge_participants: you can see the roster of any challenge you're in,
-- and the owner can see their challenge's roster.
create policy "participants_read_co_member" on public.challenge_participants
  for select using (
    public.is_challenge_participant(challenge_id)
    or exists (
      select 1 from public.challenges c
      where c.id = challenge_participants.challenge_id
        and c.owner_clerk_id = public.clerk_user_id()
    )
  );

-- challenge_completions: you can see completions for challenges you're in.
create policy "completions_read_co_member" on public.challenge_completions
  for select using (
    public.is_challenge_participant(challenge_id)
  );

-- challenge_completions: you can only insert your own completion, and only
-- if you're a participant of the challenge.
create policy "completions_insert_self_participant" on public.challenge_completions
  for insert with check (
    clerk_user_id = public.clerk_user_id()
    and public.is_challenge_participant(challenge_id)
  );
