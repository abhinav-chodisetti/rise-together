import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { cn } from './cn';
import type { Habit } from '../lib/habits-context';
import { useThemeColors } from '../lib/theme-context';
import { formatSchedule, isScheduledToday } from '../lib/weekdays';

export type { Habit };

export interface HabitCardProps {
  habit: Habit;
  onToggle: (id: string) => void;
  onPress?: (id: string) => void;
}

export function HabitCard({ habit, onToggle, onPress }: HabitCardProps) {
  const colors = useThemeColors();
  const primaryReminder = habit.reminders[0];
  const isRestDay = !isScheduledToday(habit.daysOfWeek);
  const showSchedule = habit.daysOfWeek.length < 7;
  const scheduleLabel = formatSchedule(habit.daysOfWeek);

  return (
    <Pressable
      onPress={() => onPress?.(habit.id)}
      accessibilityRole="button"
      accessibilityLabel={`${habit.name}, ${habit.streak} day streak${
        primaryReminder ? `, ${primaryReminder}` : ''
      }${isRestDay ? ', rest day' : ''}`}
      accessibilityHint="Tap to edit or delete"
      className="flex-row items-center rounded-md bg-surface p-4">
      {isRestDay ? (
        <View
          className="h-11 w-11 items-center justify-center rounded-md bg-background"
          accessibilityElementsHidden>
          <Ionicons name="leaf-outline" size={20} color={colors.secondaryText} />
        </View>
      ) : (
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
      )}

      <View className="ml-4 flex-1">
        <Text className="text-title-medium font-primary-bold text-primary-text">{habit.name}</Text>
        {showSchedule ? (
          <Text className="mt-0.5 text-body-small font-secondary text-secondary-text">
            {scheduleLabel}
          </Text>
        ) : null}
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

      {isRestDay ? (
        <View className="rounded-full bg-background px-3 py-1">
          <Text className="text-body-small font-secondary-semibold text-secondary-text">
            Rest day
          </Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={colors.hint} />
      )}
    </Pressable>
  );
}
