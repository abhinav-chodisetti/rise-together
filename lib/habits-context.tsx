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

export type Frequency = 'daily' | 'weekly';

type StoredHabit = {
  id: string;
  name: string;
  createdAt: string;
  completedDates: string[];
  frequency: Frequency;
  reminders: string[];
  quantity?: string;
};

export type Habit = StoredHabit & {
  streak: number;
  isCompletedToday: boolean;
};

export type NewHabitInput = {
  name: string;
  frequency: Frequency;
  reminders: string[];
  quantity?: string;
};

type HabitsContextValue = {
  habits: Habit[];
  addHabit: (input: NewHabitInput) => Habit;
  toggleHabit: (id: string) => void;
  removeHabit: (id: string) => void;
  isHydrated: boolean;
};

const STORAGE_KEY = 'risetogether.habits.v1';

function toISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function todayISO(): string {
  return toISO(new Date());
}

function pastDates(count: number): string[] {
  const dates: string[] = [];
  const cursor = new Date();
  for (let i = 0; i < count; i++) {
    dates.push(toISO(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return dates;
}

// Counts consecutive days the habit was completed, walking backward from
// today. If today isn't done yet, we start from yesterday — the day isn't
// over, so the user hasn't broken the streak. As soon as we hit a missing
// day, we stop counting.
function computeStreak(completedDates: string[], today: string): number {
  const dateSet = new Set(completedDates);
  const cursor = new Date(today);
  if (!dateSet.has(toISO(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (dateSet.has(toISO(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function seedHabits(): StoredHabit[] {
  const created = todayISO();
  return [
    {
      id: '1',
      name: 'Morning Meditation',
      createdAt: created,
      completedDates: pastDates(12),
      frequency: 'daily',
      reminders: ['07:00 AM'],
    },
    {
      id: '2',
      name: 'Write in Journal',
      createdAt: created,
      completedDates: pastDates(4),
      frequency: 'daily',
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
            setStoredHabits(JSON.parse(json));
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
      frequency: input.frequency,
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

  const removeHabit = useCallback((id: string) => {
    setStoredHabits((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const habits = useMemo<Habit[]>(() => {
    const today = todayISO();
    return storedHabits.map((h) => ({
      ...h,
      streak: computeStreak(h.completedDates, today),
      isCompletedToday: h.completedDates.includes(today),
    }));
  }, [storedHabits]);

  const value = useMemo<HabitsContextValue>(
    () => ({ habits, addHabit, toggleHabit, removeHabit, isHydrated }),
    [habits, addHabit, toggleHabit, removeHabit, isHydrated],
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
