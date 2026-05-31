-- ============================================================================
-- 002_grants.sql  —  expose the 001_init tables to the Data API
--
-- Why this exists: the project has "Automatically expose new tables: OFF",
-- which is a deliberate safety choice — new tables fail closed until we
-- explicitly grant CRUD to the `authenticated` role. RLS is still the
-- security boundary; GRANTs just open the door for PostgREST to attempt
-- the query at all.
--
-- Principle of least privilege: each table is granted only the verbs that
-- have a matching RLS policy in 001_init.sql. `feedback` intentionally has
-- no SELECT grant — only the service-role key (used from the dashboard)
-- can read it.
--
-- To apply: Supabase Dashboard → SQL Editor → paste → Run.
-- ============================================================================

-- Schema access (idempotent in practice — re-granting is harmless).
grant usage on schema public to authenticated;

-- Helper function in 001_init needs to be callable by authed users.
grant execute on function public.clerk_user_id() to authenticated;


-- profiles --------------------------------------------------------------------
grant select, insert, update on public.profiles to authenticated;

-- challenges ------------------------------------------------------------------
grant select, insert, update, delete on public.challenges to authenticated;

-- challenge_participants ------------------------------------------------------
grant select, insert, delete on public.challenge_participants to authenticated;

-- challenge_completions -------------------------------------------------------
grant select, insert, delete on public.challenge_completions to authenticated;

-- challenge_invitations -------------------------------------------------------
grant select, insert, update on public.challenge_invitations to authenticated;

-- feedback --------------------------------------------------------------------
-- INSERT only on purpose. No SELECT for the API role — only service-role
-- can read this table (i.e. you, viewing in the dashboard).
grant insert on public.feedback to authenticated;
