-- ============================================================================
-- 009_challenge_comments.sql
--
-- User-authored comments on a challenge. The Live Activity feed becomes a
-- merge of completion events (derived) + comments (this table), sorted by
-- timestamp client-side.
--
-- RLS reuses public.is_challenge_participant(uuid) from 003 — same
-- non-recursive membership check used by completions / participants.
-- ============================================================================

-- Table -----------------------------------------------------------------------
create table if not exists public.challenge_comments (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references public.challenges(id) on delete cascade,
  clerk_user_id text not null,
  body          text not null check (char_length(body) between 1 and 1000),
  created_at    timestamptz default now() not null
);

-- Hot lookup path: newest comments per challenge.
create index if not exists challenge_comments_by_challenge_created
  on public.challenge_comments(challenge_id, created_at desc);


-- RLS -------------------------------------------------------------------------
alter table public.challenge_comments enable row level security;

-- Read: visible to anyone participating in the challenge.
drop policy if exists "comments_read_co_member" on public.challenge_comments;
create policy "comments_read_co_member" on public.challenge_comments
  for select using (
    public.is_challenge_participant(challenge_id)
  );

-- Insert: only your own row, and only if you're a participant.
drop policy if exists "comments_insert_self_participant" on public.challenge_comments;
create policy "comments_insert_self_participant" on public.challenge_comments
  for insert with check (
    clerk_user_id = public.clerk_user_id()
    and public.is_challenge_participant(challenge_id)
  );

-- Delete: only your own.
drop policy if exists "comments_delete_self" on public.challenge_comments;
create policy "comments_delete_self" on public.challenge_comments
  for delete using (clerk_user_id = public.clerk_user_id());


-- Grants (auto-expose is OFF — table needs explicit GRANTs to the Data API
-- role for PostgREST to reach it; RLS still gates which rows). ----------------
grant select, insert, delete on public.challenge_comments to authenticated;
