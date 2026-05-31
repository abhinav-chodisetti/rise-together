// UI-shape types for the Challenges feature. These are what screens consume.
// Raw Supabase row shapes live in `challenges-derive.ts`; this file is the
// boundary between data and presentation.

import type { Weekday } from './weekdays';

export type ChallengeStatus = 'active' | 'joined';
export type LeaderboardStatus = 'done' | 'pending';
export type ActivityType =
  | 'done'
  | 'milestone'
  | 'joined'
  | 'finished'
  | 'comment'
  | 'transfer'
  | 'ended';
export type ChallengeVerification = 'honor' | 'photo';

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  isCurrentUser: boolean;
  streak: number;
  avatarColor: string;
  avatarUrl: string | null;
  status: LeaderboardStatus;
}

export interface ActivityItem {
  id: string;
  text: string;
  timeAgo: string;
  type: ActivityType;
  photoUrl?: string;
  // Comment-specific fields (only set when type === 'comment').
  body?: string;
  authorId?: string;
  authorName?: string;
  authorAvatarUrl?: string | null;
  /** ISO timestamp used to merge-sort completion events + comments. */
  sortKey?: string;
}

export interface Challenge {
  id: string;
  name: string;
  description?: string;
  goal?: string;
  verification: ChallengeVerification;
  ownerClerkId: string;
  status: ChallengeStatus;
  daysRemaining?: number;
  startsInDays?: number;
  participantCount: number;
  progressPercent: number;
  avatarColors: string[];
  coverImageUri?: string;

  // Raw schedule dates — used by the Info sheet to show absolute Start/End.
  startDate: string;
  endDate?: string;

  daysOfWeek: Weekday[];
  isRestDayToday: boolean;
  completedToday: boolean;

  dayCurrent: number;
  dayTotal: number;
  groupConsistency: number;
  detailHeaderAvatars: string[];
  detailOthersCount: number;
  leaderboard: LeaderboardEntry[];
  activity: ActivityItem[];
}
