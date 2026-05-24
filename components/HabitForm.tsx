import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from './Button';
import { Input } from './Input';
import { cn } from './cn';
import type { Frequency, NewHabitInput } from '../lib/habits-context';
import { useThemeColors } from '../lib/theme-context';

const MAX_REMINDERS = 3;

const minutesFromDate = (d: Date): number => d.getHours() * 60 + d.getMinutes();

const minutesToDate = (totalMinutes: number): Date => {
  const d = new Date();
  d.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  return d;
};

const formatMinutesAsTime = (totalMinutes: number): string =>
  minutesToDate(totalMinutes).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

// Best-effort parse of a previously-saved reminder string back into minutes.
// Handles 12-hour "HH:MM AM/PM" (case/whitespace insensitive) and 24-hour "HH:MM".
// Returns null for anything else so callers can drop the entry.
const parseReminderToMinutes = (raw: string): number | null => {
  const s = raw.trim().toUpperCase();
  const ampm = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (ampm) {
    const hh = parseInt(ampm[1], 10) % 12;
    const mm = parseInt(ampm[2], 10);
    const offset = ampm[3] === 'PM' ? 12 : 0;
    return (hh + offset) * 60 + mm;
  }
  const military = s.match(/^(\d{1,2}):(\d{2})$/);
  if (military) {
    return parseInt(military[1], 10) * 60 + parseInt(military[2], 10);
  }
  return null;
};

export interface HabitFormInitial {
  name: string;
  frequency: Frequency;
  reminders: string[];
  quantity: string;
}

export interface HabitFormProps {
  title: string;
  initial?: HabitFormInitial;
  saveLabel?: string;
  onSave: (input: NewHabitInput) => void;
  onDelete?: () => void;
}

export function HabitForm({
  title,
  initial,
  saveLabel = 'Save Habit',
  onSave,
  onDelete,
}: HabitFormProps) {
  const router = useRouter();
  const colors = useThemeColors();

  const [name, setName] = useState(initial?.name ?? '');
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? 'daily');
  // Reminders are stored as minutes-since-midnight (0-1439) to avoid
  // locale-dependent string parsing for dedupe/sort.
  const [reminders, setReminders] = useState<number[]>(() => {
    if (!initial?.reminders) return [];
    const parsed = initial.reminders
      .map(parseReminderToMinutes)
      .filter((m): m is number => m !== null);
    return Array.from(new Set(parsed)).sort((a, b) => a - b);
  });
  const [quantity, setQuantity] = useState(initial?.quantity ?? '');

  const [nameError, setNameError] = useState<string | undefined>();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerValue, setPickerValue] = useState(new Date());

  const canAddReminder = reminders.length < MAX_REMINDERS;

  const openPicker = () => {
    if (!canAddReminder) return;
    const now = new Date();
    now.setSeconds(0, 0);
    setPickerValue(now);
    setIsPickerOpen(true);
  };

  const addReminder = (date: Date) => {
    const minutes = minutesFromDate(date);
    setReminders((prev) => {
      if (prev.includes(minutes)) return prev;
      return [...prev, minutes].sort((a, b) => a - b);
    });
  };

  const onAndroidPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    setIsPickerOpen(false);
    if (event.type === 'set' && date) addReminder(date);
  };

  const onIosPickerChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) setPickerValue(date);
  };

  const confirmIosPick = () => {
    addReminder(pickerValue);
    setIsPickerOpen(false);
  };

  const removeReminder = (minutes: number) => {
    setReminders((prev) => prev.filter((m) => m !== minutes));
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNameError('Give your habit a name');
      return;
    }
    setNameError(undefined);
    onSave({
      name: trimmed,
      frequency,
      reminders: reminders.map(formatMinutesAsTime),
      quantity,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-row items-center px-6 pt-2 pb-4">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center">
            <Ionicons name="chevron-back" size={26} color={colors.primaryText} />
          </Pressable>
          <Text className="flex-1 text-center text-title-large font-primary-bold text-primary-text">
            {title}
          </Text>
          <View className="h-10 w-10" />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 112 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Input
            label="Name"
            placeholder="e.g. Drink Water, Gym, Meditation"
            leadingIcon="create-outline"
            autoCapitalize="sentences"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (nameError) setNameError(undefined);
            }}
            error={nameError}
            returnKeyType="done"
            containerClassName="mt-2"
          />

          <Text className="mt-8 mb-3 text-label-large font-secondary-semibold text-primary-text">
            Description{' '}
            <Text className="text-body-small font-secondary text-secondary-text">(Optional)</Text>
          </Text>
          <Input
            placeholder="Add a short note about this habit"
            leadingIcon="document-text-outline"
            autoCapitalize="sentences"
            value={quantity}
            onChangeText={setQuantity}
            returnKeyType="done"
          />

          <Text className="mt-8 mb-3 text-label-large font-secondary-semibold text-primary-text">
            Frequency
          </Text>
          <View className="flex-row gap-3">
            <FrequencyPill
              label="Daily"
              active={frequency === 'daily'}
              onPress={() => setFrequency('daily')}
            />
            <FrequencyPill
              label="Weekly"
              active={frequency === 'weekly'}
              onPress={() => setFrequency('weekly')}
            />
          </View>

          <View className="mt-8 flex-row items-center justify-between">
            <Text className="text-label-large font-secondary-semibold text-primary-text">
              Reminders
            </Text>
            <Pressable
              onPress={openPicker}
              disabled={!canAddReminder}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Add reminder time"
              className={cn('flex-row items-center', !canAddReminder && 'opacity-40')}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text className="ml-1 text-label-large font-secondary-semibold text-primary">
                Add Time
              </Text>
            </Pressable>
          </View>

          {reminders.length > 0 ? (
            <View className="mt-3 gap-2">
              {reminders.map((minutes) => {
                const display = formatMinutesAsTime(minutes);
                return (
                  <View
                    key={minutes}
                    className="flex-row items-center rounded-md bg-surface px-4 py-3.5">
                    <Ionicons name="notifications-outline" size={18} color={colors.primary} />
                    <Text className="ml-3 flex-1 text-body-large font-secondary-semibold text-primary-text">
                      {display}
                    </Text>
                    <Pressable
                      onPress={() => removeReminder(minutes)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${display} reminder`}>
                      <Ionicons name="close" size={20} color={colors.secondaryText} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : null}

          <View className="mt-3 flex-row items-center">
            <Ionicons name="information-circle-outline" size={14} color={colors.secondaryText} />
            <Text className="ml-1.5 text-body-small font-secondary text-secondary-text">
              You can set up to {MAX_REMINDERS} reminders per habit
            </Text>
          </View>

          {onDelete ? (
            <Pressable
              onPress={onDelete}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Delete habit"
              className="mt-10 flex-row items-center justify-center py-2">
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text className="ml-2 text-body-large font-secondary-semibold text-error">
                Delete habit
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>

        <View
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            bottom: 24,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 8,
          }}>
          <Button
            onPress={handleSave}
            leadingIcon={<Ionicons name="checkmark" size={20} color={colors.onPrimary} />}
            accessibilityLabel={saveLabel}>
            {saveLabel}
          </Button>
        </View>
      </KeyboardAvoidingView>

      {Platform.OS === 'android' && isPickerOpen ? (
        <DateTimePicker
          value={pickerValue}
          mode="time"
          is24Hour={false}
          onChange={onAndroidPickerChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal
          visible={isPickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsPickerOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                paddingBottom: 24,
              }}>
              <View className="flex-row items-center justify-between border-b border-divider px-5 py-3">
                <Pressable onPress={() => setIsPickerOpen(false)} hitSlop={8}>
                  <Text className="text-body-large font-secondary text-secondary-text">Cancel</Text>
                </Pressable>
                <Text className="text-body-large font-primary-bold text-primary-text">
                  Pick a time
                </Text>
                <Pressable onPress={confirmIosPick} hitSlop={8}>
                  <Text className="text-body-large font-secondary-semibold text-primary">Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={pickerValue}
                mode="time"
                display="spinner"
                onChange={onIosPickerChange}
                textColor={colors.primaryText}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

function FrequencyPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={cn(
        'flex-1 items-center justify-center rounded-full py-3.5',
        active ? 'bg-primary' : 'bg-surface border border-divider',
      )}>
      <Text
        className={cn(
          'text-body-large font-primary-semibold',
          active ? 'text-on-primary' : 'text-primary-text',
        )}>
        {label}
      </Text>
    </Pressable>
  );
}
