import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { HabitForm } from '../../components/HabitForm';
import { useHabits } from '../../lib/habits-context';

export default function EditHabitScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { habits, updateHabit, removeHabit, isHydrated } = useHabits();

  const habit = habits.find((h) => h.id === id);

  // Safety net: if the habit is gone (deleted from elsewhere, stale deep link,
  // or removed via the in-screen Delete button below), navigate back instead of
  // rendering a blank screen. Gated on isHydrated so we don't flash-back on
  // cold start before AsyncStorage has loaded.
  const didBackRef = useRef(false);
  useEffect(() => {
    if (isHydrated && !habit && !didBackRef.current) {
      didBackRef.current = true;
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    }
  }, [isHydrated, habit, router]);

  if (!habit) {
    return null;
  }

  const onSave = (input: Parameters<typeof updateHabit>[1]) => {
    updateHabit(habit.id, input);
    router.back();
  };

  const onDelete = () => {
    Alert.alert(
      'Delete this habit?',
      `"${habit.name}" and its streak history will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeHabit(habit.id),
        },
      ],
    );
  };

  return (
    <HabitForm
      title="Edit Habit"
      saveLabel="Save Changes"
      initial={{
        name: habit.name,
        daysOfWeek: habit.daysOfWeek,
        reminders: habit.reminders,
        quantity: habit.quantity ?? '',
      }}
      onSave={onSave}
      onDelete={onDelete}
    />
  );
}
