-- ============================================================================
-- 004_challenge_days_of_week.sql
--
-- Replace the placeholder `frequency` column on challenges with a real
-- per-day-of-week schedule, mirroring what we did for habits. The old
-- frequency values ('daily' / 'weekly') were never load-bearing — both
-- behaved as "every day counts" — so we backfill every existing row with
-- all 7 days via the column default, no data loss.
--
-- Weekday convention: JS Date.getDay() — 0=Sun … 6=Sat.
-- ============================================================================

alter table public.challenges
  add column if not exists days_of_week int[] not null
  default '{0,1,2,3,4,5,6}';

-- Non-empty, within 0..6. Trust the app code to dedupe before insert.
alter table public.challenges
  drop constraint if exists challenges_days_of_week_valid;
alter table public.challenges
  add constraint challenges_days_of_week_valid
  check (
    cardinality(days_of_week) > 0
    and days_of_week <@ ARRAY[0, 1, 2, 3, 4, 5, 6]
  );

-- Frequency column was a placeholder — drop it. No app code reads it after
-- this migration.
alter table public.challenges drop column if exists frequency;
