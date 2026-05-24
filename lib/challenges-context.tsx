import AsyncStorage from '@react-native-async-storage/async-storage';
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
  MOCK_CHALLENGES,
  type Challenge,
  type ChallengeStatus,
  type LeaderboardEntry,
} from './mock-challenges';

type Frequency = 'daily' | 'weekly';

export type NewChallengeInput = {
  name: string;
  description?: string;
  coverImageUri?: string | null;
  frequency: Frequency;
  durationDays: number;
  /** Local-time Date for when the challenge begins. */
  startDate: Date;
  goal?: string;
  /** Self-reminders (minutes since midnight, 0-1439). Personal to creator. */
  reminderMinutes: number[];
  /** Email addresses to invite once the backend is wired. */
  invitedEmails: string[];
};

type ChallengesContextValue = {
  challenges: Challenge[];
  addChallenge: (input: NewChallengeInput) => Challenge;
  getChallengeById: (id: string) => Challenge | undefined;
  isHydrated: boolean;
};

const STORAGE_KEY = 'risetogether.challenges.v1';

function startOfLocalDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysBetween(from: Date, to: Date): number {
  const a = startOfLocalDay(from).getTime();
  const b = startOfLocalDay(to).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function newChallengeFromInput(input: NewChallengeInput): Challenge {
  const today = new Date();
  const daysUntilStart = Math.max(0, daysBetween(today, input.startDate));
  const isStarted = daysUntilStart === 0;

  const status: ChallengeStatus = isStarted ? 'active' : 'joined';

  const creatorEntry: LeaderboardEntry = {
    id: 'me',
    rank: 1,
    name: 'You',
    isCurrentUser: true,
    streak: 0,
    avatarColor: '#6C5CE7',
    status: 'pending',
  };

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name.trim(),
    status,
    daysRemaining: isStarted ? input.durationDays : undefined,
    startsInDays: isStarted ? undefined : daysUntilStart,
    participantCount: 1,
    progressPercent: 0,
    avatarColors: ['#6C5CE7'],
    coverImageUri: input.coverImageUri ?? undefined,
    dayCurrent: 0,
    dayTotal: input.durationDays,
    groupConsistency: 0,
    detailHeaderAvatars: ['#6C5CE7'],
    detailOthersCount: 0,
    leaderboard: [creatorEntry],
    activity: [],
  };
}

const ChallengesContext = createContext<ChallengesContextValue | undefined>(undefined);

export function ChallengesProvider({ children }: { children: ReactNode }) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        if (cancelled) return;
        if (json) {
          try {
            const parsed: unknown = JSON.parse(json);
            if (Array.isArray(parsed)) {
              setChallenges(parsed as Challenge[]);
            } else {
              setChallenges(MOCK_CHALLENGES);
            }
          } catch {
            setChallenges(MOCK_CHALLENGES);
          }
        } else {
          setChallenges(MOCK_CHALLENGES);
        }
        setIsHydrated(true);
      })
      .catch(() => {
        if (cancelled) return;
        setChallenges(MOCK_CHALLENGES);
        setIsHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(challenges)).catch(() => {});
  }, [challenges, isHydrated]);

  const addChallenge = useCallback((input: NewChallengeInput): Challenge => {
    const created = newChallengeFromInput(input);
    setChallenges((prev) => [created, ...prev]);
    return created;
  }, []);

  const getChallengeById = useCallback(
    (id: string) => challenges.find((c) => c.id === id),
    [challenges],
  );

  const value = useMemo<ChallengesContextValue>(
    () => ({ challenges, addChallenge, getChallengeById, isHydrated }),
    [challenges, addChallenge, getChallengeById, isHydrated],
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
