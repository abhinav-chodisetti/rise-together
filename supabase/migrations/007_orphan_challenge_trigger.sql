-- ============================================================================
-- 007_orphan_challenge_trigger.sql
--
-- When the last participant leaves a challenge, delete the challenge itself.
-- Without this, a challenge with zero participants stays in the table
-- forever — and worse, the creator still sees it on their list (the
-- challenges_read_participant_or_owner RLS policy keeps it visible to the
-- owner even after they've left as a participant).
--
-- ON DELETE CASCADE on the challenges PK takes care of the rest:
--   - challenge_participants (other rows, if any — shouldn't be any here)
--   - challenge_completions
--   - challenge_invitations
--
-- Runs SECURITY DEFINER so the DELETE bypasses RLS regardless of who
-- triggered the participant removal.
-- ============================================================================

create or replace function public.delete_orphan_challenge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- If any participants remain, leave the challenge alone.
  if exists (
    select 1 from public.challenge_participants
    where challenge_id = old.challenge_id
  ) then
    return old;
  end if;

  -- Otherwise delete the orphan. Safe inside a CASCADE chain too —
  -- if the challenge row was already removed by the cascade that
  -- triggered us, this DELETE just matches zero rows (no error).
  delete from public.challenges where id = old.challenge_id;
  return old;
end;
$$;

drop trigger if exists trg_delete_orphan_challenge on public.challenge_participants;

create trigger trg_delete_orphan_challenge
  after delete on public.challenge_participants
  for each row
  execute function public.delete_orphan_challenge();
