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

import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { cn } from '../components/cn';
import { useHabits } from '../lib/habits-context';
import { useThemeColors } from '../lib/theme-context';

const MAX_REMINDERS = 3;
type Frequency = 'daily' | 'weekly';

const formatTime = (d: Date): string =>
  d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

const timeToMinutes = (timeStr: string): number => {
  const [time, period] = timeStr.split(' ');
  const [hh, mm] = time.split(':').map(Number);
  let hours = hh % 12;
  if (period === 'PM') hours += 12;
  return hours * 60 + mm;
};

export default function AddHabitScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { addHabit } = useHabits();

  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [reminders, setReminders] = useState<string[]>([]);
  const [quantity, setQuantity] = useState('');

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
    const formatted = formatTime(date);
    setReminders((prev) => {
      if (prev.includes(formatted)) return prev;
      return [...prev, formatted].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
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

  const removeReminder = (time: string) => {
    setReminders((prev) => prev.filter((t) => t !== time));
  };

  const onSave = () => {
    if (name.trim().length < 2) {
      setNameError('Give your habit a name');
      return;
    }
    setNameError(undefined);

    addHabit({
      name,
      frequency,
      reminders,
      quantity,
    });

    router.back();
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
            New Habit
          </Text>
          <View className="h-10 w-10" />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 112 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text className="mt-2 text-label-large font-secondary-semibold text-primary-text">
            What&apos;s the habit?
          </Text>
          <Input
            label="Habit Name"
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
            containerClassName="mt-3"
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
              {reminders.map((time) => (
                <View
                  key={time}
                  className="flex-row items-center rounded-md bg-surface px-4 py-3.5">
                  <Ionicons name="notifications-outline" size={18} color={colors.primary} />
                  <Text className="ml-3 flex-1 text-body-large font-secondary-semibold text-primary-text">
                    {time}
                  </Text>
                  <Pressable
                    onPress={() => removeReminder(time)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${time} reminder`}>
                    <Ionicons name="close" size={20} color={colors.secondaryText} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          <View className="mt-3 flex-row items-center">
            <Ionicons name="information-circle-outline" size={14} color={colors.secondaryText} />
            <Text className="ml-1.5 text-body-small font-secondary text-secondary-text">
              You can set up to {MAX_REMINDERS} reminders per habit
            </Text>
          </View>

          <Text className="mt-8 text-label-large font-secondary-semibold text-primary-text">
            Daily Goal (Optional)
          </Text>
          <Input
            label="Quantity"
            placeholder="e.g. 8 glasses, 30 minutes"
            leadingIcon="flag-outline"
            value={quantity}
            onChangeText={setQuantity}
            returnKeyType="done"
            containerClassName="mt-3"
          />
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
            onPress={onSave}
            leadingIcon={<Ionicons name="checkmark" size={20} color={colors.onPrimary} />}
            accessibilityLabel="Save habit">
            Save Habit
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
