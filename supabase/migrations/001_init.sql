-- ============================================================================
-- 001_init.sql  —  initial schema for RiseTogether
--
-- Domains:
--   1. profiles               — display name + avatar per Clerk user
--   2. challenges + ...       — social-accountability challenges (4 tables)
--   3. feedback               — Send Feedback inbox
--
-- Auth model: Clerk owns identity. Supabase trusts Clerk JWTs via the
-- third-party-auth integration. Every user-owned row carries clerk_user_id;
-- RLS scopes reads/writes on auth.jwt() ->> 'sub'.
--
-- To apply: paste into Supabase Dashboard → SQL Editor → Run.
-- Re-running will error on duplicate object names — drop the relevant
-- objects first or wrap in a transaction during dev iteration.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper: current Clerk user id from the JWT. Use in RLS policies for
-- readability.
-- ---------------------------------------------------------------------------
create or replace function public.clerk_user_id() returns text
language sql stable as $$
  select auth.jwt() ->> 'sub';
$$;


-- ============================================================================
-- TABLES
-- ============================================================================

-- profiles --------------------------------------------------------------------
create table public.profiles (
  clerk_user_id text primary key,
  display_name  text not null,
  avatar_url    text,
  updated_at    timestamptz default now() not null
);

-- challenges ------------------------------------------------------------------
create table public.challenges (
  id              uuid primary key default gen_random_uuid(),
  owner_clerk_id  text not null,
  name            text not null,
  description     text,
  type            text not null default 'daily_checkin',
  goal            text,
  frequency       text not null check (frequency in ('daily','weekly')),
  start_date      date not null,
  end_date        date,
  cover_image_url text,
  created_at      timestamptz default now() not null
);

-- challenge_participants ------------------------------------------------------
create table public.challenge_participants (
  challenge_id   uuid not null references public.challenges(id) on delete cascade,
  clerk_user_id  text not null,
  joined_at      timestamptz default now() not null,
  primary key (challenge_id, clerk_user_id)
);

-- challenge_completions -------------------------------------------------------
create table public.challenge_completions (
  challenge_id   uuid not null references public.challenges(id) on delete cascade,
  clerk_user_id  text not null,
  completed_date date not null,
  completed_at   timestamptz default now() not null,
  primary key (challenge_id, clerk_user_id, completed_date)
);

-- challenge_invitations -------------------------------------------------------
create table public.challenge_invitations (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references public.challenges(id) on delete cascade,
  token         text not null unique,
  invitee_email text,
  status        text not null default 'pending'
                check (status in ('pending','accepted','declined','expired')),
  created_at    timestamptz default now() not null,
  expires_at    timestamptz
);

-- feedback --------------------------------------------------------------------
create table public.feedback (
  id             uuid primary key default gen_random_uuid(),
  clerk_user_id  text not null,
  message        text not null check (char_length(message) between 1 and 5000),
  app_version    text,
  platform       text,
  created_at     timestamptz default now() not null
);


-- ============================================================================
-- INDEXES
-- ============================================================================

create index challenge_participants_by_user
  on public.challenge_participants(clerk_user_id);

create index challenge_completions_by_challenge_date
  on public.challenge_completions(challenge_id, completed_date desc);

create index feedback_by_created
  on public.feedback(created_at desc);

-- challenge_invitations.token already has a unique index from the table def.


-- ============================================================================
-- ROW-LEVEL SECURITY
-- ============================================================================

-- profiles --------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_read_any_authed" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_upsert_self" on public.profiles
  for insert with check (clerk_user_id = public.clerk_user_id());

create policy "profiles_update_self" on public.profiles
  for update using (clerk_user_id = public.clerk_user_id());


-- challenges ------------------------------------------------------------------
alter table public.challenges enable row level security;

create policy "challenges_read_participant_or_owner" on public.challenges
  for select using (
    owner_clerk_id = public.clerk_user_id()
    or exists (
      select 1 from public.challenge_participants p
      where p.challenge_id = challenges.id
        and p.clerk_user_id = public.clerk_user_id()
    )
  );

create policy "challenges_insert_self_owner" on public.challenges
  for insert with check (owner_clerk_id = public.clerk_user_id());

create policy "challenges_update_owner" on public.challenges
  for update using (owner_clerk_id = public.clerk_user_id());

create policy "challenges_delete_owner" on public.challenges
  for delete using (owner_clerk_id = public.clerk_user_id());


-- challenge_participants ------------------------------------------------------
alter table public.challenge_participants enable row level security;

create policy "participants_read_co_member" on public.challenge_participants
  for select using (
    exists (
      select 1 from public.challenge_participants self
      where self.challenge_id = challenge_participants.challenge_id
        and self.clerk_user_id = public.clerk_user_id()
    )
    or exists (
      select 1 from public.challenges c
      where c.id = challenge_participants.challenge_id
        and c.owner_clerk_id = public.clerk_user_id()
    )
  );

-- v1: anyone who knows the challenge id can join themselves. The challenge
-- id is a uuid — unguessable unless shared via the invitation link. v2 can
-- tighten this with an accept_invitation() security-definer function.
create policy "participants_insert_self" on public.challenge_participants
  for insert with check (clerk_user_id = public.clerk_user_id());

create policy "participants_leave_self" on public.challenge_participants
  for delete using (clerk_user_id = public.clerk_user_id());


-- challenge_completions -------------------------------------------------------
alter table public.challenge_completions enable row level security;

create policy "completions_read_co_member" on public.challenge_completions
  for select using (
    exists (
      select 1 from public.challenge_participants p
      where p.challenge_id = challenge_completions.challenge_id
        and p.clerk_user_id = public.clerk_user_id()
    )
  );

create policy "completions_insert_self_participant" on public.challenge_completions
  for insert with check (
    clerk_user_id = public.clerk_user_id()
    and exists (
      select 1 from public.challenge_participants p
      where p.challenge_id = challenge_completions.challenge_id
        and p.clerk_user_id = public.clerk_user_id()
    )
  );

create policy "completions_delete_self" on public.challenge_completions
  for delete using (clerk_user_id = public.clerk_user_id());


-- challenge_invitations -------------------------------------------------------
alter table public.challenge_invitations enable row level security;

-- The token is the secret (same model as a magic-link). Any authed user who
-- knows the token can read the row to evaluate the invitation.
create policy "invitations_read_authed" on public.challenge_invitations
  for select using (auth.role() = 'authenticated');

create policy "invitations_insert_owner" on public.challenge_invitations
  for insert with check (
    exists (
      select 1 from public.challenges c
      where c.id = challenge_invitations.challenge_id
        and c.owner_clerk_id = public.clerk_user_id()
    )
  );

create policy "invitations_update_authed" on public.challenge_invitations
  for update using (auth.role() = 'authenticated');


-- feedback --------------------------------------------------------------------
alter table public.feedback enable row level security;

-- Authed users can insert their own row. Nothing reads via anon — only the
-- service-role key (used from the Supabase dashboard) can read this table.
create policy "feedback_insert_self" on public.feedback
  for insert with check (clerk_user_id = public.clerk_user_id());


-- ============================================================================
-- REALTIME
-- ============================================================================

-- Leaderboard hot path: clients will subscribe to new completions as they
-- happen (Phase 2 work — schema-level prep now).
alter publication supabase_realtime add table public.challenge_completions;
