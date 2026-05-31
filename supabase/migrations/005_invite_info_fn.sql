-- ============================================================================
-- 005_invite_info_fn.sql
--
-- Lets an authed user who is NOT yet a participant preview a challenge by id
-- (the only thing they have, since the invite link contains the challenge id).
-- The existing RLS policy hides the row from non-participants — this
-- SECURITY DEFINER function returns a curated subset of fields needed to
-- render the "Join this challenge?" preview screen.
--
-- Returned fields are deliberately limited: no leaderboard, no completion
-- history, no participant list. The recipient sees just enough to decide
-- whether to join.
-- ============================================================================

create or replace function public.get_challenge_invite_info(p_id uuid)
returns table (
  id uuid,
  name text,
  description text,
  days_of_week int[],
  start_date date,
  end_date date,
  cover_image_url text,
  owner_clerk_id text,
  owner_display_name text,
  owner_avatar_url text,
  participant_count int,
  is_already_member boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.description,
    c.days_of_week,
    c.start_date,
    c.end_date,
    c.cover_image_url,
    c.owner_clerk_id,
    op.display_name as owner_display_name,
    op.avatar_url as owner_avatar_url,
    (
      select count(*)::int
      from public.challenge_participants p
      where p.challenge_id = c.id
    ) as participant_count,
    exists (
      select 1
      from public.challenge_participants p
      where p.challenge_id = c.id
        and p.clerk_user_id = (auth.jwt() ->> 'sub')
    ) as is_already_member
  from public.challenges c
  left join public.profiles op on op.clerk_user_id = c.owner_clerk_id
  where c.id = p_id;
$$;

grant execute on function public.get_challenge_invite_info(uuid) to authenticated;
