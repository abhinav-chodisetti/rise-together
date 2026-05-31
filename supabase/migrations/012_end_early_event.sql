-- ============================================================================
-- 012_end_early_event.sql
--
-- Adds a new `ended_early` event type to challenge_events. Fired when the
-- admin ends a challenge before its scheduled end_date via Settings →
-- End Challenge. Distinct from natural completion (handled by derive based
-- on the per-user perfect-attendance check).
-- ============================================================================

alter table public.challenge_events
  drop constraint if exists challenge_events_type_check;

alter table public.challenge_events
  add constraint challenge_events_type_check
  check (type in ('transfer_admin', 'ended_early'));
