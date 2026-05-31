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

import { computeScheduledStreak, toISO, todayISO } from './streak';
import { ALL_DAYS, isValidWeekdayArray, type Weekday } from './weekdays';

type StoredHabit = {
  id: string;
  name: string;
  createdAt: string;
  completedDates: string[];
  daysOfWeek: Weekday[];
  reminders: string[];
  quantity?: string;
};

export type Habit = StoredHabit & {
  streak: number;
  isCompletedToday: boolean;
};

export type NewHabitInput = {
  name: string;
  daysOfWeek: Weekday[];
  reminders: string[];
  quantity?: string;
};

type HabitsContextValue = {
  habits: Habit[];
  addHabit: (input: NewHabitInput) => Habit;
  updateHabit: (id: string, input: NewHabitInput) => void;
  toggleHabit: (id: string) => void;
  removeHabit: (id: string) => void;
  isHydrated: boolean;
};

const STORAGE_KEY = 'risetogether.habits.v1';
function pastDates(count: number): string[] {
  const dates: string[] = [];
  const cursor = new Date();
  for (let i = 0; i < count; i++) {
    dates.push(toISO(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return dates;
}

// Normalizes a persisted habit into the current StoredHabit shape. Old
// records may carry `frequency: 'daily' | 'weekly'` instead of `daysOfWeek` —
// both map to every day, matching the prior behavior (weekly never actually
// skipped days). Returns null if the record is too malformed to recover.
function normalizeStoredHabit(value: unknown): StoredHabit | null {
  if (!value || typeof value !== 'object') return null;
  const h = value as Record<string, unknown>;
  if (typeof h.id !== 'string' || typeof h.name !== 'string') return null;
  if (typeof h.createdAt !== 'string') return null;
  if (!Array.isArray(h.completedDates)) return null;

  const daysOfWeek: Weekday[] = isValidWeekdayArray(h.daysOfWeek)
    ? [...new Set(h.daysOfWeek)].sort((a, b) => a - b)
    : [...ALL_DAYS];

  return {
    id: h.id,
    name: h.name,
    createdAt: h.createdAt,
    completedDates: (h.completedDates as unknown[]).filter(
      (d): d is string => typeof d === 'string',
    ),
    daysOfWeek,
    reminders: Array.isArray(h.reminders)
      ? (h.reminders as unknown[]).filter((r): r is string => typeof r === 'string')
      : [],
    quantity: typeof h.quantity === 'string' ? h.quantity : undefined,
  };
}

function seedHabits(): StoredHabit[] {
  const created = todayISO();
  return [
    {
      id: '1',
      name: 'Morning Meditation',
      createdAt: created,
      completedDates: pastDates(12),
      daysOfWeek: [...ALL_DAYS],
      reminders: ['07:00 AM'],
    },
    {
      id: '2',
      name: 'Write in Journal',
      createdAt: created,
      completedDates: pastDates(4),
      daysOfWeek: [...ALL_DAYS],
      reminders: ['08:15 AM'],
    },
  ];
}

const HabitsContext = createContext<HabitsContextValue | undefined>(undefined);

export function HabitsProvider({ children }: { children: ReactNode }) {
  const [storedHabits, setStoredHabits] = useState<StoredHabit[]>([]);
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
              const normalized = parsed
                .map(normalizeStoredHabit)
                .filter((h): h is StoredHabit => h !== null);
              setStoredHabits(normalized);
            } else {
              setStoredHabits(seedHabits());
            }
          } catch {
            setStoredHabits(seedHabits());
          }
        } else {
          setStoredHabits(seedHabits());
        }
        setIsHydrated(true);
      })
      .catch(() => {
        if (cancelled) return;
        setStoredHabits(seedHabits());
        setIsHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storedHabits)).catch(() => {});
  }, [storedHabits, isHydrated]);

  const addHabit = useCallback((input: NewHabitInput): Habit => {
    const stored: StoredHabit = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: input.name.trim(),
      createdAt: todayISO(),
      completedDates: [],
      daysOfWeek: [...new Set(input.daysOfWeek)].sort((a, b) => a - b),
      reminders: input.reminders,
      quantity: input.quantity?.trim() || undefined,
    };
    setStoredHabits((prev) => [...prev, stored]);
    return { ...stored, streak: 0, isCompletedToday: false };
  }, []);

  const toggleHabit = useCallback((id: string) => {
    const today = todayISO();
    setStoredHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const done = h.completedDates.includes(today);
        return {
          ...h,
          completedDates: done
            ? h.completedDates.filter((d) => d !== today)
            : [...h.completedDates, today],
        };
      }),
    );
  }, []);

  const updateHabit = useCallback((id: string, input: NewHabitInput) => {
    setStoredHabits((prev) =>
      prev.map((h) =>
        h.id === id
          ? {
              ...h,
              name: input.name.trim(),
              daysOfWeek: [...new Set(input.daysOfWeek)].sort((a, b) => a - b),
              reminders: input.reminders,
              quantity: input.quantity?.trim() || undefined,
            }
          : h,
      ),
    );
  }, []);

  const removeHabit = useCallback((id: string) => {
    setStoredHabits((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const habits = useMemo<Habit[]>(() => {
    const today = todayISO();
    return storedHabits.map((h) => ({
      ...h,
      streak: computeScheduledStreak(h.completedDates, today, h.daysOfWeek),
      isCompletedToday: h.completedDates.includes(today),
    }));
  }, [storedHabits]);

  const value = useMemo<HabitsContextValue>(
    () => ({ habits, addHabit, updateHabit, toggleHabit, removeHabit, isHydrated }),
    [habits, addHabit, updateHabit, toggleHabit, removeHabit, isHydrated],
  );

  return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>;
}

export function useHabits(): HabitsContextValue {
  const ctx = useContext(HabitsContext);
  if (!ctx) {
    throw new Error('useHabits must be used inside <HabitsProvider>');
  }
  return ctx;
}
