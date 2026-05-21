import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { HabitForm } from '../../components/HabitForm';
import { useHabits } from '../../lib/habits-context';

export default function EditHabitScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { habits, updateHabit, removeHabit } = useHabits();

  const habit = habits.find((h) => h.id === id);

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
          onPress: () => {
            removeHabit(habit.id);
            router.back();
          },
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
        frequency: habit.frequency,
        reminders: habit.reminders,
        quantity: habit.quantity ?? '',
      }}
      onSave={onSave}
      onDelete={onDelete}
    />
  );
}
