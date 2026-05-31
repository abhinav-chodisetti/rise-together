// Pure transforms from Supabase row shapes → Challenge UI objects.
// No I/O, no React. Tested by feeding fixtures in and asserting the output.

import type {
  ActivityItem,
  Challenge,
  ChallengeStatus,
  LeaderboardEntry,
  LeaderboardStatus,
} from './challenges-types';
import { computeScheduledStreak, todayISO } from './streak';
import { ALL_DAYS, isValidWeekdayArray, type Weekday } from './weekdays';

// ----- Raw Supabase row shapes -----

export interface ChallengeRow {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  verification: 'honor' | 'photo';
  days_of_week: number[];
  start_date: string;
  end_date: string | null;
  owner_clerk_id: string;
  cover_image_url: string | null;
  created_at: string;
  challenge_participants: ParticipantRow[] | null;
  challenge_completions: CompletionRow[] | null;
  challenge_comments: CommentRow[] | null;
  challenge_events: EventRow[] | null;
}

export interface ParticipantRow {
  clerk_user_id: string;
  joined_at: string;
}

export interface CompletionRow {
  clerk_user_id: string;
  completed_date: string;
  completed_at: string;
  photo_url: string | null;
}

export interface CommentRow {
  id: string;
  clerk_user_id: string;
  body: string;
  created_at: string;
}

export interface EventRow {
  id: string;
  type: 'transfer_admin' | 'ended_early';
  actor_clerk_id: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface ProfileLookup {
  display_name: string;
  avatar_url: string | null;
}

// ----- Avatar color (deterministic per user) -----

// Deterministic per-user avatar tints. Kept palette-agnostic (warm earth
// neutrals) so they don't clash with whatever app palette is active.
const PASTEL_PALETTE = [
  '#E8C5A0',
  '#D4A574',
  '#B58E86',
  '#A97F78',
  '#C9A39C',
  '#9B7E4F',
  '#7A6258',
  '#5A6B7C',
  '#3D3D3D',
  '#E8E1D9',
];

function hashStringToInt(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function avatarColorFor(clerkUserId: string): string {
  return PASTEL_PALETTE[hashStringToInt(clerkUserId) % PASTEL_PALETTE.length];
}

// ----- Date helpers -----

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function diffDays(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// Counts how many `scheduled` weekdays fall in [start, today] inclusive.
// Walks day-by-day with an iteration cap so a runaway date never hangs.
function countScheduledDays(start: Date, today: Date, scheduled: Set<number>): number {
  if (today.getTime() < start.getTime()) return 0;
  const cursor = startOfDay(start);
  const end = startOfDay(today);
  let n = 0;
  for (let i = 0; i < 4000; i++) {
    if (scheduled.has(cursor.getDay())) n++;
    if (cursor.getTime() >= end.getTime()) break;
    cursor.setDate(cursor.getDate() + 1);
  }
  return n;
}

// Streak thresholds that trigger a milestone event the first time a user
// crosses each one. Kept short — too many makes the feed noisy.
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365] as const;

function countScheduledDaysBetween(
  startISO: string,
  endISO: string,
  scheduled: Set<number>,
): number {
  if (endISO < startISO) return 0;
  const cursor = parseLocalDate(startISO);
  const end = parseLocalDate(endISO);
  let n = 0;
  for (let i = 0; i < 4000; i++) {
    if (scheduled.has(cursor.getDay())) n++;
    if (cursor.getTime() >= end.getTime()) break;
    cursor.setDate(cursor.getDate() + 1);
  }
  return n;
}

function relativeTimeAgo(isoTimestamp: string, now: Date): string {
  const then = new Date(isoTimestamp);
  const seconds = Math.max(0, Math.round((now.getTime() - then.getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return then.toLocaleDateString();
}

// ----- Main entry -----

export function deriveChallenges(
  rows: ChallengeRow[],
  profiles: Map<string, ProfileLookup>,
  photoUrls: Map<string, string>,
  currentUserId: string | null,
  now: Date = new Date(),
): Challenge[] {
  return rows.map((row) => deriveChallenge(row, profiles, photoUrls, currentUserId, now));
}

function deriveChallenge(
  row: ChallengeRow,
  profiles: Map<string, ProfileLookup>,
  photoUrls: Map<string, string>,
  currentUserId: string | null,
  now: Date,
): Challenge {
  const today = startOfDay(now);
  const startDate = parseLocalDate(row.start_date);
  const endDate = row.end_date ? parseLocalDate(row.end_date) : null;

  const hasStarted = startDate.getTime() <= today.getTime();
  const status: ChallengeStatus = hasStarted ? 'active' : 'joined';

  // Day math: 1-indexed; today = Day 1 if today === start_date. A 30-day
  // challenge has end_date = start_date + 29 days, so dayTotal = diff + 1.
  const dayTotal = endDate ? Math.max(1, diffDays(startDate, endDate) + 1) : 0;
  const daySinceStart = hasStarted ? diffDays(startDate, today) : 0;
  const dayCurrent = endDate
    ? Math.min(Math.max(1, daySinceStart + 1), dayTotal)
    : daySinceStart + 1;
  const daysRemaining = endDate ? Math.max(0, dayTotal - daySinceStart - 1) : undefined;
  const startsInDays = !hasStarted ? Math.max(0, diffDays(today, startDate)) : undefined;

  // Schedule: validate the array from Supabase; fall back to every day if the
  // row is malformed (shouldn't happen — check constraint enforces it).
  const daysOfWeek: Weekday[] = isValidWeekdayArray(row.days_of_week)
    ? ([...new Set(row.days_of_week)].sort((a, b) => a - b) as Weekday[])
    : [...ALL_DAYS];
  const scheduledSet = new Set<number>(daysOfWeek);
  const isRestDayToday = !scheduledSet.has(today.getDay());

  const participants = row.challenge_participants ?? [];
  const completions = row.challenge_completions ?? [];
  const participantIds = participants.map((p) => p.clerk_user_id);
  const participantCount = participantIds.length;

  const todayIso = todayISO();
  const completedTodayIds = new Set(
    completions.filter((c) => c.completed_date === todayIso).map((c) => c.clerk_user_id),
  );
  const completedToday = currentUserId ? completedTodayIds.has(currentUserId) : false;

  const progressPercent =
    participantCount > 0
      ? Math.min(100, Math.round((completedTodayIds.size / participantCount) * 100))
      : 0;

  // Group consistency: actual / possible. Possible = participants × scheduled
  // days that have elapsed (inclusive of today if it's scheduled). Rest days
  // aren't possible completions, so they don't dilute the percentage.
  const scheduledDaysElapsed = countScheduledDays(startDate, today, scheduledSet);
  const possibleCompletions = participantCount * scheduledDaysElapsed;
  const groupConsistency =
    possibleCompletions > 0
      ? Math.min(100, Math.round((completions.length / possibleCompletions) * 100))
      : 0;

  const avatarColors = participantIds.map(avatarColorFor);
  const detailHeaderAvatars = avatarColors.slice(0, 3);
  const detailOthersCount = Math.max(0, participantCount - detailHeaderAvatars.length);

  // Per-user completion list for streak math
  const completionsByUser = new Map<string, string[]>();
  for (const c of completions) {
    const arr = completionsByUser.get(c.clerk_user_id) ?? [];
    arr.push(c.completed_date);
    completionsByUser.set(c.clerk_user_id, arr);
  }

  const leaderboard: LeaderboardEntry[] = participantIds
    .map((uid): Omit<LeaderboardEntry, 'rank'> => {
      const profile = profiles.get(uid);
      const entryStatus: LeaderboardStatus = completedTodayIds.has(uid) ? 'done' : 'pending';
      return {
        id: uid,
        name: profile?.display_name ?? 'Unknown',
        isCurrentUser: uid === currentUserId,
        streak: computeScheduledStreak(completionsByUser.get(uid) ?? [], todayIso, daysOfWeek),
        avatarColor: avatarColorFor(uid),
        avatarUrl: profile?.avatar_url ?? null,
        status: entryStatus,
      };
    })
    .sort((a, b) => b.streak - a.streak || a.name.localeCompare(b.name))
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  // Activity feed = completion events (auto) + comments (authored), merged
  // by timestamp desc, capped at 30 entries.
  const completionItems: ActivityItem[] = completions.map((c) => {
    const profile = profiles.get(c.clerk_user_id);
    const name = c.clerk_user_id === currentUserId ? 'You' : profile?.display_name ?? 'Someone';
    return {
      id: `completion-${c.clerk_user_id}-${c.completed_date}`,
      text: `${name} just completed today's check`,
      timeAgo: relativeTimeAgo(c.completed_at, now),
      type: 'done',
      photoUrl: c.photo_url ? photoUrls.get(c.photo_url) : undefined,
      sortKey: c.completed_at,
    };
  });

  const comments = row.challenge_comments ?? [];
  const commentItems: ActivityItem[] = comments.map((c) => {
    const profile = profiles.get(c.clerk_user_id);
    const name = c.clerk_user_id === currentUserId ? 'You' : profile?.display_name ?? 'Someone';
    return {
      id: `comment-${c.id}`,
      text: name, // header label rendered alongside the body
      body: c.body,
      authorId: c.clerk_user_id,
      authorName: name,
      authorAvatarUrl: profile?.avatar_url ?? null,
      timeAgo: relativeTimeAgo(c.created_at, now),
      type: 'comment',
      sortKey: c.created_at,
    };
  });

  // Joins ---------------------------------------------------------------------
  const joinedItems: ActivityItem[] = participants.map((p) => {
    const profile = profiles.get(p.clerk_user_id);
    const name = p.clerk_user_id === currentUserId ? 'You' : profile?.display_name ?? 'Someone';
    return {
      id: `joined-${p.clerk_user_id}-${p.joined_at}`,
      text: `${name} joined the challenge`,
      timeAgo: relativeTimeAgo(p.joined_at, now),
      type: 'joined',
      sortKey: p.joined_at,
    };
  });

  // Streak milestones --------------------------------------------------------
  // Walk each user's completions in date order; when a completion makes the
  // as-of streak hit a threshold for the first time for that user, emit one
  // milestone item tagged with that completion's timestamp.
  const milestoneItems: ActivityItem[] = [];
  const completionsByUserSorted = new Map<string, CompletionRow[]>();
  for (const c of completions) {
    const arr = completionsByUserSorted.get(c.clerk_user_id) ?? [];
    arr.push(c);
    completionsByUserSorted.set(c.clerk_user_id, arr);
  }
  for (const [uid, comps] of completionsByUserSorted) {
    const sorted = [...comps].sort((a, b) => a.completed_date.localeCompare(b.completed_date));
    const crossed = new Set<number>();
    for (let i = 0; i < sorted.length; i++) {
      const c = sorted[i];
      const upTo = sorted.slice(0, i + 1).map((x) => x.completed_date);
      const streakHere = computeScheduledStreak(upTo, c.completed_date, daysOfWeek);
      if (STREAK_MILESTONES.includes(streakHere as never) && !crossed.has(streakHere)) {
        crossed.add(streakHere);
        const profile = profiles.get(uid);
        const name = uid === currentUserId ? 'You' : profile?.display_name ?? 'Someone';
        milestoneItems.push({
          id: `milestone-${uid}-${streakHere}-${c.completed_date}`,
          text: `${name} hit a ${streakHere}-day streak!`,
          timeAgo: relativeTimeAgo(c.completed_at, now),
          type: 'milestone',
          sortKey: c.completed_at,
        });
      }
    }
  }

  // Finished events ----------------------------------------------------------
  // A participant "finishes" the challenge when their streak as of end_date
  // covers every scheduled day in the range — i.e., perfect attendance.
  const finishedItems: ActivityItem[] = [];
  if (row.end_date) {
    const endISO = row.end_date;
    const todayHasReachedEnd = todayIso >= endISO;
    if (todayHasReachedEnd) {
      const scheduledTotal = countScheduledDaysBetween(row.start_date, endISO, scheduledSet);
      for (const [uid, comps] of completionsByUserSorted) {
        const dates = comps.map((c) => c.completed_date);
        const streakAtEnd = computeScheduledStreak(dates, endISO, daysOfWeek);
        if (scheduledTotal > 0 && streakAtEnd >= scheduledTotal) {
          // Anchor sort to the user's latest completion on/before end_date.
          const lastCompletion = [...comps]
            .filter((c) => c.completed_date <= endISO)
            .sort((a, b) => b.completed_at.localeCompare(a.completed_at))[0];
          const profile = profiles.get(uid);
          const name = uid === currentUserId ? 'You' : profile?.display_name ?? 'Someone';
          finishedItems.push({
            id: `finished-${uid}-${endISO}`,
            text: `${name} finished the challenge with perfect attendance!`,
            timeAgo: relativeTimeAgo(lastCompletion?.completed_at ?? endISO, now),
            type: 'finished',
            sortKey: lastCompletion?.completed_at ?? endISO,
          });
        }
      }
    }
  }

  // Challenge events (admin transfers, etc.) -------------------------------
  const events = row.challenge_events ?? [];
  const eventItems: ActivityItem[] = events.flatMap((ev): ActivityItem[] => {
    const actorProfile = profiles.get(ev.actor_clerk_id);
    const actorName =
      ev.actor_clerk_id === currentUserId
        ? 'You'
        : actorProfile?.display_name ?? 'Someone';

    if (ev.type === 'transfer_admin') {
      const toId =
        ev.payload && typeof (ev.payload as Record<string, unknown>).to_clerk_id === 'string'
          ? ((ev.payload as Record<string, unknown>).to_clerk_id as string)
          : null;
      if (!toId) return [];
      const targetProfile = profiles.get(toId);
      const targetName =
        toId === currentUserId ? 'you' : targetProfile?.display_name ?? 'someone';
      return [
        {
          id: `event-${ev.id}`,
          text: `${actorName} made ${targetName} the admin`,
          timeAgo: relativeTimeAgo(ev.created_at, now),
          type: 'transfer',
          sortKey: ev.created_at,
        },
      ];
    }

    if (ev.type === 'ended_early') {
      return [
        {
          id: `event-${ev.id}`,
          text: `${actorName} ended the challenge early`,
          timeAgo: relativeTimeAgo(ev.created_at, now),
          type: 'ended',
          sortKey: ev.created_at,
        },
      ];
    }

    return [];
  });

  const activity: ActivityItem[] = [
    ...completionItems,
    ...commentItems,
    ...joinedItems,
    ...milestoneItems,
    ...finishedItems,
    ...eventItems,
  ]
    .sort((a, b) => (b.sortKey ?? '').localeCompare(a.sortKey ?? ''))
    .slice(0, 30);

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    goal: row.goal ?? undefined,
    verification: row.verification,
    ownerClerkId: row.owner_clerk_id,
    status,
    daysRemaining,
    startsInDays,
    participantCount,
    progressPercent,
    avatarColors,
    coverImageUri: row.cover_image_url ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    daysOfWeek,
    isRestDayToday,
    completedToday,
    dayCurrent,
    dayTotal,
    groupConsistency,
    detailHeaderAvatars,
    detailOthersCount,
    leaderboard,
    activity,
  };
}
