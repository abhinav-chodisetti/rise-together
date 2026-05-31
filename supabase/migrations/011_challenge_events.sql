-- ============================================================================
-- 011_challenge_events.sql
--
-- A generic event log for challenge-level moments that aren't captured by
-- completions or comments. v1 ships with a single event type
-- (`transfer_admin`) but the table is shaped to extend — add more
-- type values to the CHECK constraint as new event types land.
--
-- The Live Activity feed becomes a merge of completions ∪ comments ∪ events.
--
-- RLS reuses public.is_challenge_participant(uuid) from 003.
-- ============================================================================

create table if not exists public.challenge_events (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references public.challenges(id) on delete cascade,
  type          text not null check (type in ('transfer_admin')),
  actor_clerk_id text not null,
  payload       jsonb not null default '{}'::jsonb,
  created_at    timestamptz default now() not null
);

create index if not exists challenge_events_by_challenge_created
  on public.challenge_events(challenge_id, created_at desc);


-- RLS -------------------------------------------------------------------------
alter table public.challenge_events enable row level security;

drop policy if exists "events_read_co_member" on public.challenge_events;
create policy "events_read_co_member" on public.challenge_events
  for select using (public.is_challenge_participant(challenge_id));

-- Insert: actor must be the caller AND a participant of the challenge.
-- (No update / delete — events are immutable history.)
drop policy if exists "events_insert_self_participant" on public.challenge_events;
create policy "events_insert_self_participant" on public.challenge_events
  for insert with check (
    actor_clerk_id = public.clerk_user_id()
    and public.is_challenge_participant(challenge_id)
  );


-- Grants (auto-expose is OFF — new tables need explicit GRANTs). --------------
grant select, insert on public.challenge_events to authenticated;
