export type ChallengeStatus = 'active' | 'joined';
export type LeaderboardStatus = 'done' | 'pending';
export type ActivityType = 'done' | 'milestone' | 'started';

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  isCurrentUser: boolean;
  streak: number;
  avatarColor: string;
  status: LeaderboardStatus;
}

export interface ActivityItem {
  id: string;
  text: string;
  timeAgo: string;
  type: ActivityType;
}

export interface Challenge {
  id: string;
  name: string;
  status: ChallengeStatus;
  daysRemaining?: number;
  startsInDays?: number;
  participantCount: number;
  progressPercent: number;
  /** Placeholder accent colors for the small avatar stack on the list card. */
  avatarColors: string[];
  /** Optional cover image URI (local file:// from picker or remote URL). */
  coverImageUri?: string;

  // Detail-screen-only fields
  dayCurrent: number;
  dayTotal: number;
  groupConsistency: number;
  /** Larger avatar stack shown in the purple hero card. */
  detailHeaderAvatars: string[];
  detailOthersCount: number;
  leaderboard: LeaderboardEntry[];
  activity: ActivityItem[];
}

export const MOCK_CHALLENGES: Challenge[] = [
  {
    id: '1',
    name: '10K Steps Daily',
    status: 'active',
    daysRemaining: 7,
    participantCount: 12,
    progressPercent: 65,
    avatarColors: ['#E8C5A0', '#6C757D'],
    dayCurrent: 12,
    dayTotal: 30,
    groupConsistency: 84,
    detailHeaderAvatars: ['#E8C5A0', '#D4A574', '#3D3D3D'],
    detailOthersCount: 8,
    leaderboard: [
      {
        id: 'sarah',
        rank: 1,
        name: 'Sarah Jenkins',
        isCurrentUser: false,
        streak: 15,
        avatarColor: '#E8C5A0',
        status: 'done',
      },
      {
        id: 'me',
        rank: 2,
        name: 'Alex Rivera',
        isCurrentUser: true,
        streak: 12,
        avatarColor: '#3D3D3D',
        status: 'done',
      },
      {
        id: 'marcus',
        rank: 3,
        name: 'Marcus Chen',
        isCurrentUser: false,
        streak: 9,
        avatarColor: '#5A6B7C',
        status: 'pending',
      },
      {
        id: 'elena',
        rank: 4,
        name: 'Elena Rodriguez',
        isCurrentUser: false,
        streak: 8,
        avatarColor: '#2E4A6E',
        status: 'done',
      },
    ],
    activity: [
      {
        id: 'a1',
        text: 'Sarah Jenkins just completed her goal!',
        timeAgo: '2 mins ago',
        type: 'done',
      },
      {
        id: 'a2',
        text: 'You hit your 12-day streak milestone! 🔥',
        timeAgo: '1 hour ago',
        type: 'milestone',
      },
      {
        id: 'a3',
        text: 'Marcus Chen started his daily session',
        timeAgo: '3 hours ago',
        type: 'started',
      },
    ],
  },
  {
    id: '2',
    name: 'Morning Zen',
    status: 'active',
    daysRemaining: 14,
    participantCount: 5,
    progressPercent: 40,
    avatarColors: ['#D4A574'],
    dayCurrent: 6,
    dayTotal: 21,
    groupConsistency: 62,
    detailHeaderAvatars: ['#D4A574', '#9B7E4F'],
    detailOthersCount: 3,
    leaderboard: [
      {
        id: 'me',
        rank: 1,
        name: 'Alex Rivera',
        isCurrentUser: true,
        streak: 6,
        avatarColor: '#3D3D3D',
        status: 'done',
      },
      {
        id: 'priya',
        rank: 2,
        name: 'Priya Sharma',
        isCurrentUser: false,
        streak: 5,
        avatarColor: '#D4A574',
        status: 'pending',
      },
      {
        id: 'jordan',
        rank: 3,
        name: 'Jordan Lee',
        isCurrentUser: false,
        streak: 4,
        avatarColor: '#7A8B9E',
        status: 'done',
      },
    ],
    activity: [
      {
        id: 'a1',
        text: 'Jordan Lee just completed their morning session',
        timeAgo: '12 mins ago',
        type: 'done',
      },
      {
        id: 'a2',
        text: 'Priya Sharma joined Morning Zen',
        timeAgo: '2 days ago',
        type: 'started',
      },
    ],
  },
  {
    id: '3',
    name: 'Hydration Hero',
    status: 'joined',
    startsInDays: 2,
    participantCount: 6,
    progressPercent: 0,
    avatarColors: ['#A8B5C7', '#E8E1D9'],
    dayCurrent: 0,
    dayTotal: 14,
    groupConsistency: 0,
    detailHeaderAvatars: ['#A8B5C7', '#E8E1D9', '#5A6B7C'],
    detailOthersCount: 3,
    leaderboard: [
      {
        id: 'me',
        rank: 1,
        name: 'Alex Rivera',
        isCurrentUser: true,
        streak: 0,
        avatarColor: '#3D3D3D',
        status: 'pending',
      },
      {
        id: 'taylor',
        rank: 2,
        name: 'Taylor Kim',
        isCurrentUser: false,
        streak: 0,
        avatarColor: '#A8B5C7',
        status: 'pending',
      },
    ],
    activity: [
      {
        id: 'a1',
        text: 'Taylor Kim joined Hydration Hero',
        timeAgo: '5 hours ago',
        type: 'started',
      },
    ],
  },
];

export function getChallengeById(id: string): Challenge | undefined {
  return MOCK_CHALLENGES.find((c) => c.id === id);
}
