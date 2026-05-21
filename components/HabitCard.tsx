import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { cn } from './cn';
import type { Habit } from '../lib/habits-context';
import { useThemeColors } from '../lib/theme-context';

export type { Habit };

export interface HabitCardProps {
  habit: Habit;
  onToggle: (id: string) => void;
  onPress?: (id: string) => void;
}

export function HabitCard({ habit, onToggle, onPress }: HabitCardProps) {
  const colors = useThemeColors();
  const primaryReminder = habit.reminders[0];

  return (
    <Pressable
      onPress={() => onPress?.(habit.id)}
      accessibilityRole="button"
      accessibilityLabel={`${habit.name}, ${habit.streak} day streak${
        primaryReminder ? `, ${primaryReminder}` : ''
      }`}
      accessibilityHint="Tap to edit or delete"
      className="flex-row items-center rounded-md bg-surface p-4">
      <Pressable
        onPress={() => onToggle(habit.id)}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: habit.isCompletedToday }}
        accessibilityLabel={habit.isCompletedToday ? 'Mark as not done' : 'Mark as done'}
        className={cn(
          'h-11 w-11 items-center justify-center rounded-md border-2',
          habit.isCompletedToday ? 'border-success bg-success/10' : 'border-divider bg-surface',
        )}>
        {habit.isCompletedToday ? (
          <Ionicons name="checkmark" size={22} color={colors.success} />
        ) : null}
      </Pressable>

      <View className="ml-4 flex-1">
        <Text className="text-title-medium font-primary-bold text-primary-text">{habit.name}</Text>
        <View className="mt-1.5 flex-row items-center">
          <Ionicons name="flame" size={14} color={colors.primary} />
          <Text className="ml-1 text-body-small font-secondary-semibold text-primary-text">
            {habit.streak} Day Streak
          </Text>
          {primaryReminder ? (
            <>
              <Ionicons
                name="time-outline"
                size={14}
                color={colors.hint}
                style={{ marginLeft: 12 }}
              />
              <Text className="ml-1 text-body-small font-secondary text-hint">
                {primaryReminder}
              </Text>
            </>
          ) : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.hint} />
    </Pressable>
  );
}
