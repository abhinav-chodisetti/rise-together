import { useUser } from '@clerk/expo';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  deriveChallenges,
  type ChallengeRow,
  type ProfileLookup,
} from './challenges-derive';
import type { Challenge } from './challenges-types';
import { todayISO } from './streak';
import { useSupabase } from './supabase';
import { type Weekday } from './weekdays';

// Re-export the UI types so screens have one place to import from.
export type {
  ActivityItem,
  ActivityType,
  Challenge,
  ChallengeStatus,
  LeaderboardEntry,
  LeaderboardStatus,
} from './challenges-types';

export type NewChallengeInput = {
  name: string;
  description?: string;
  coverImageUri?: string | null;
  daysOfWeek: Weekday[];
  durationDays: number;
  startDate: Date;
  goal?: string;
  /** 'honor' = manual checkbox, 'photo' = camera/library on each check-in. */
  verification: 'honor' | 'photo';
  // Personal to the creator; not yet persisted server-side.
  reminderMinutes: number[];
};

type ChallengesContextValue = {
  challenges: Challenge[];
  addChallenge: (input: NewChallengeInput) => Promise<Challenge>;
  joinChallenge: (challengeId: string) => Promise<Challenge>;
  leaveChallenge: (challengeId: string) => Promise<void>;
  markComplete: (challengeId: string, photoPath?: string | null) => Promise<void>;
  unmarkComplete: (challengeId: string) => Promise<void>;
  postComment: (challengeId: string, body: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  transferAdmin: (challengeId: string, newOwnerClerkId: string) => Promise<void>;
  endChallenge: (challengeId: string) => Promise<void>;
  deleteChallenge: (challengeId: string) => Promise<void>;
  getChallengeById: (id: string) => Challenge | undefined;
  refresh: () => Promise<void>;
  isHydrated: boolean;
  loadError: string | null;
};

const ChallengesContext = createContext<ChallengesContextValue | undefined>(undefined);

const CHALLENGE_SELECT = `
  id, name, description, goal, verification, days_of_week, start_date, end_date,
  owner_clerk_id, cover_image_url, created_at,
  challenge_participants ( clerk_user_id, joined_at ),
  challenge_completions ( clerk_user_id, completed_date, completed_at, photo_url ),
  challenge_comments ( id, clerk_user_id, body, created_at ),
  challenge_events ( id, type, actor_clerk_id, payload, created_at )
`;

function toLocalISODate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function collectUserIds(rows: ChallengeRow[]): string[] {
  const ids = new Set<string>();
  for (const r of rows) {
    (r.challenge_participants ?? []).forEach((p) => ids.add(p.clerk_user_id));
    (r.challenge_completions ?? []).forEach((c) => ids.add(c.clerk_user_id));
  }
  return [...ids];
}

function collectPhotoPaths(rows: ChallengeRow[]): string[] {
  const paths = new Set<string>();
  for (const r of rows) {
    for (const c of r.challenge_completions ?? []) {
      if (c.photo_url) paths.add(c.photo_url);
    }
  }
  return [...paths];
}

export function ChallengesProvider({ children }: { children: ReactNode }) {
  const supabase = useSupabase();
  const { user } = useUser();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetches + derives + returns. Doesn't touch React state — callers do that.
  const loadChallengesList = useCallback(async (): Promise<Challenge[]> => {
    const { data: rows, error } = await supabase.from('challenges').select(CHALLENGE_SELECT);
    if (error) throw new Error(error.message);
    const allRows = (rows ?? []) as ChallengeRow[];

    const userIds = collectUserIds(allRows);
    const profileMap = new Map<string, ProfileLookup>();
    if (userIds.length > 0) {
      const { data: profileRows, error: pErr } = await supabase
        .from('profiles')
        .select('clerk_user_id, display_name, avatar_url')
        .in('clerk_user_id', userIds);
      if (pErr) throw new Error(pErr.message);
      for (const p of profileRows ?? []) {
        profileMap.set(p.clerk_user_id, {
          display_name: p.display_name,
          avatar_url: p.avatar_url,
        });
      }
    }

    // Mint signed URLs for proof photos. Private bucket → every render needs
    // a fresh signed URL. 1h expiry; we re-fetch on every load anyway.
    const photoPaths = collectPhotoPaths(allRows);
    const photoUrlMap = new Map<string, string>();
    if (photoPaths.length > 0) {
      const { data: signed, error: sErr } = await supabase.storage
        .from('challenge-proofs')
        .createSignedUrls(photoPaths, 3600);
      if (sErr) {
        // Non-fatal: photos just won't render. Log + continue.
        console.warn('[challenges] proof signed-url batch failed:', sErr.message);
      } else {
        for (const entry of signed ?? []) {
          if (entry.path && entry.signedUrl) photoUrlMap.set(entry.path, entry.signedUrl);
        }
      }
    }

    return deriveChallenges(allRows, profileMap, photoUrlMap, user?.id ?? null);
  }, [supabase, user?.id]);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setLoadError(null);
      const list = await loadChallengesList();
      setChallenges(list);
    } catch (e) {
      console.warn('[challenges] load failed:', e);
      setLoadError(e instanceof Error ? e.message : 'Failed to load challenges');
      setChallenges([]);
    } finally {
      setIsHydrated(true);
    }
  }, [loadChallengesList]);

  useEffect(() => {
    if (!user) {
      setChallenges([]);
      setLoadError(null);
      setIsHydrated(true);
      return;
    }
    refresh();
  }, [refresh, user?.id]);

  const addChallenge = useCallback(
    async (input: NewChallengeInput): Promise<Challenge> => {
      if (!user) throw new Error('Not signed in');
      const startISO = toLocalISODate(input.startDate);
      // A "30-day" challenge spans 30 days inclusive of start_date.
      const endDate = new Date(input.startDate);
      endDate.setDate(endDate.getDate() + Math.max(1, input.durationDays) - 1);
      const endISO = toLocalISODate(endDate);

      const { data: created, error: insertError } = await supabase
        .from('challenges')
        .insert({
          name: input.name.trim(),
          description: input.description?.trim() || null,
          days_of_week: [...new Set(input.daysOfWeek)].sort((a, b) => a - b),
          start_date: startISO,
          end_date: endISO,
          owner_clerk_id: user.id,
          cover_image_url: input.coverImageUri ?? null,
          goal: input.goal?.trim() || null,
          verification: input.verification,
        })
        .select('id')
        .single();
      if (insertError) throw new Error(insertError.message);

      const { error: partError } = await supabase
        .from('challenge_participants')
        .insert({ challenge_id: created.id, clerk_user_id: user.id });
      if (partError) {
        // Compensating delete: a challenge without its owner-participant row
        // is orphaned and unreachable. Roll back the challenge insert so the
        // creator can retry cleanly. Best-effort — if this delete itself
        // fails the original error still surfaces.
        await supabase.from('challenges').delete().eq('id', created.id);
        throw new Error(partError.message);
      }

      const list = await loadChallengesList();
      setChallenges(list);
      const found = list.find((c) => c.id === created.id);
      if (!found) {
        throw new Error('Created challenge is not visible after refresh — RLS misconfigured?');
      }
      return found;
    },
    [supabase, user, loadChallengesList],
  );

  const joinChallenge = useCallback(
    async (challengeId: string): Promise<Challenge> => {
      if (!user) throw new Error('Not signed in');

      const { error: insertError } = await supabase
        .from('challenge_participants')
        .insert({ challenge_id: challengeId, clerk_user_id: user.id });
      // 23505 = unique_violation — already a participant. Treat as success.
      if (insertError && insertError.code !== '23505') {
        throw new Error(insertError.message);
      }

      const list = await loadChallengesList();
      setChallenges(list);
      const found = list.find((c) => c.id === challengeId);
      if (!found) {
        throw new Error(
          "Joined but the challenge isn't visible — it may have been deleted.",
        );
      }
      return found;
    },
    [supabase, user, loadChallengesList],
  );

  const leaveChallenge = useCallback(
    async (challengeId: string): Promise<void> => {
      if (!user) throw new Error('Not signed in');

      // RLS `participants_leave_self` enforces clerk_user_id = jwt.sub, so
      // even without the explicit .eq we'd only be able to delete our own
      // row. Keeping the .eq makes the intent obvious to readers.
      const { error } = await supabase
        .from('challenge_participants')
        .delete()
        .eq('challenge_id', challengeId)
        .eq('clerk_user_id', user.id);
      if (error) throw new Error(error.message);

      // Completions stay in the table — RLS hides them while not a member;
      // if the user rejoins later their streak/data resumes.
      const list = await loadChallengesList();
      setChallenges(list);
    },
    [supabase, user, loadChallengesList],
  );

  const markComplete = useCallback(
    async (challengeId: string, photoPath?: string | null): Promise<void> => {
      if (!user) throw new Error('Not signed in');

      const { error } = await supabase.from('challenge_completions').insert({
        challenge_id: challengeId,
        clerk_user_id: user.id,
        completed_date: todayISO(),
        photo_url: photoPath ?? null,
      });
      // 23505 = unique_violation — already completed today. Treat as success.
      if (error && error.code !== '23505') throw new Error(error.message);

      const list = await loadChallengesList();
      setChallenges(list);
    },
    [supabase, user, loadChallengesList],
  );

  const unmarkComplete = useCallback(
    async (challengeId: string): Promise<void> => {
      if (!user) throw new Error('Not signed in');

      const { error } = await supabase
        .from('challenge_completions')
        .delete()
        .eq('challenge_id', challengeId)
        .eq('clerk_user_id', user.id)
        .eq('completed_date', todayISO());
      if (error) throw new Error(error.message);

      const list = await loadChallengesList();
      setChallenges(list);
    },
    [supabase, user, loadChallengesList],
  );

  const postComment = useCallback(
    async (challengeId: string, body: string): Promise<void> => {
      if (!user) throw new Error('Not signed in');
      const trimmed = body.trim();
      if (trimmed.length === 0) return; // no-op on empty

      const { error } = await supabase.from('challenge_comments').insert({
        challenge_id: challengeId,
        clerk_user_id: user.id,
        body: trimmed,
      });
      if (error) throw new Error(error.message);

      const list = await loadChallengesList();
      setChallenges(list);
    },
    [supabase, user, loadChallengesList],
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<void> => {
      if (!user) throw new Error('Not signed in');

      // RLS comments_delete_self also enforces self-only; the .eq is for
      // intent + safety against accidental wide deletes.
      const { error } = await supabase
        .from('challenge_comments')
        .delete()
        .eq('id', commentId)
        .eq('clerk_user_id', user.id);
      if (error) throw new Error(error.message);

      const list = await loadChallengesList();
      setChallenges(list);
    },
    [supabase, user, loadChallengesList],
  );

  const transferAdmin = useCallback(
    async (challengeId: string, newOwnerClerkId: string): Promise<void> => {
      if (!user) throw new Error('Not signed in');
      if (newOwnerClerkId === user.id) {
        throw new Error("You're already the admin.");
      }
      // RLS challenges_update_owner gates this to current-owner-only.
      const { error } = await supabase
        .from('challenges')
        .update({ owner_clerk_id: newOwnerClerkId })
        .eq('id', challengeId);
      if (error) throw new Error(error.message);

      // Record the transfer in the event log so it shows up in Live Activity.
      // Non-fatal — log + continue if it fails (the transfer itself succeeded).
      const { error: eventErr } = await supabase.from('challenge_events').insert({
        challenge_id: challengeId,
        type: 'transfer_admin',
        actor_clerk_id: user.id,
        payload: { to_clerk_id: newOwnerClerkId },
      });
      if (eventErr) {
        console.warn('[challenges] transfer event insert failed:', eventErr.message);
      }

      const list = await loadChallengesList();
      setChallenges(list);
    },
    [supabase, user, loadChallengesList],
  );

  const endChallenge = useCallback(
    async (challengeId: string): Promise<void> => {
      if (!user) throw new Error('Not signed in');
      // Set end_date to today. RLS challenges_update_owner gates this to
      // the current owner; WITH CHECK from 010 is satisfied because
      // owner_clerk_id is unchanged.
      const today = todayISO();
      const { error } = await supabase
        .from('challenges')
        .update({ end_date: today })
        .eq('id', challengeId);
      if (error) throw new Error(error.message);

      // Record the event so it shows up in Live Activity. Non-fatal.
      const { error: eventErr } = await supabase.from('challenge_events').insert({
        challenge_id: challengeId,
        type: 'ended_early',
        actor_clerk_id: user.id,
        payload: {},
      });
      if (eventErr) {
        console.warn('[challenges] end-early event insert failed:', eventErr.message);
      }

      const list = await loadChallengesList();
      setChallenges(list);
    },
    [supabase, user, loadChallengesList],
  );

  const deleteChallenge = useCallback(
    async (challengeId: string): Promise<void> => {
      if (!user) throw new Error('Not signed in');
      // RLS challenges_delete_owner gates this to current-owner-only.
      // ON DELETE CASCADE handles participants/completions/comments/invitations.
      const { error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', challengeId);
      if (error) throw new Error(error.message);

      const list = await loadChallengesList();
      setChallenges(list);
    },
    [supabase, user, loadChallengesList],
  );

  const getChallengeById = useCallback(
    (id: string) => challenges.find((c) => c.id === id),
    [challenges],
  );

  const value = useMemo<ChallengesContextValue>(
    () => ({
      challenges,
      addChallenge,
      joinChallenge,
      leaveChallenge,
      markComplete,
      unmarkComplete,
      postComment,
      deleteComment,
      transferAdmin,
      endChallenge,
      deleteChallenge,
      getChallengeById,
      refresh,
      isHydrated,
      loadError,
    }),
    [
      challenges,
      addChallenge,
      joinChallenge,
      leaveChallenge,
      markComplete,
      unmarkComplete,
      postComment,
      deleteComment,
      transferAdmin,
      endChallenge,
      deleteChallenge,
      getChallengeById,
      refresh,
      isHydrated,
      loadError,
    ],
  );

  return <ChallengesContext.Provider value={value}>{children}</ChallengesContext.Provider>;
}

export function useChallenges(): ChallengesContextValue {
  const ctx = useContext(ChallengesContext);
  if (!ctx) {
    throw new Error('useChallenges must be used inside <ChallengesProvider>');
  }
  return ctx;
}
