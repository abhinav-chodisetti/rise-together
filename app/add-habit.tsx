import { useRouter } from 'expo-router';

import { HabitForm } from '../components/HabitForm';
import { useHabits } from '../lib/habits-context';

export default function AddHabitScreen() {
  const router = useRouter();
  const { addHabit } = useHabits();

  return (
    <HabitForm
      title="New Habit"
      saveLabel="Save Habit"
      onSave={(input) => {
        addHabit(input);
        router.back();
      }}
    />
  );
}
