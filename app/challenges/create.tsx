import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { cn } from '../../components/cn';
import { useChallenges } from '../../lib/challenges-context';
import { useThemeColors } from '../../lib/theme-context';

type Frequency = 'daily' | 'weekly';

const MAX_REMINDERS = 3;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const minutesFromDate = (d: Date): number => d.getHours() * 60 + d.getMinutes();

const formatMinutesAsTime = (totalMinutes: number): string => {
  const d = new Date();
  d.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatDate = (d: Date): string =>
  d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

export default function CreateChallengeScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { addChallenge } = useChallenges();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [durationDays, setDurationDays] = useState('30');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [goal, setGoal] = useState('');
  const [reminders, setReminders] = useState<number[]>([]);
  const [inviteInput, setInviteInput] = useState('');
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);

  // Validation state
  const [nameError, setNameError] = useState<string | undefined>();
  const [durationError, setDurationError] = useState<string | undefined>();
  const [inviteError, setInviteError] = useState<string | undefined>();

  // Modal state
  const [isReminderPickerOpen, setIsReminderPickerOpen] = useState(false);
  const [reminderPickerValue, setReminderPickerValue] = useState(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState(new Date());

  const canAddReminder = reminders.length < MAX_REMINDERS;

  // ---- Cover image ---------------------------------------------------------

  const uploadCover = async (uri: string) => {
    // TODO(challenges-backend): upload the image to your storage provider and
    // persist the resulting URL on the challenge. For now just hold it locally
    // so the preview renders.
    setIsUploadingCover(true);
    try {
      setCoverImageUri(uri);
    } finally {
      setIsUploadingCover(false);
    }
  };

  const pickCoverFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos permission needed', 'Enable Photos access in Settings to add a cover.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadCover(result.assets[0].uri);
    }
  };

  const takeCoverPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera permission needed', 'Enable camera access in Settings to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadCover(result.assets[0].uri);
    }
  };

  const openCoverPicker = () => {
    if (isUploadingCover) return;
    const options =
      coverImageUri !== null
        ? ['Take Photo', 'Choose from Library', 'Remove Cover', 'Cancel']
        : ['Take Photo', 'Choose from Library', 'Cancel'];
    const cancelIndex = options.length - 1;
    const destructiveIndex = coverImageUri !== null ? 2 : undefined;
    const handle = (idx: number | undefined) => {
      if (idx === 0) takeCoverPhoto();
      else if (idx === 1) pickCoverFromLibrary();
      else if (idx === 2 && coverImageUri !== null) setCoverImageUri(null);
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex },
        handle,
      );
    } else {
      const buttons: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
        { text: 'Take Photo', onPress: takeCoverPhoto },
        { text: 'Choose from Library', onPress: pickCoverFromLibrary },
      ];
      if (coverImageUri !== null) {
        buttons.push({
          text: 'Remove Cover',
          style: 'destructive',
          onPress: () => setCoverImageUri(null),
        });
      }
      buttons.push({ text: 'Cancel', style: 'cancel' });
      Alert.alert('Cover image', undefined, buttons);
    }
  };

  // ---- Self-reminders ------------------------------------------------------

  const openReminderPicker = () => {
    if (!canAddReminder) return;
    const now = new Date();
    now.setSeconds(0, 0);
    setReminderPickerValue(now);
    setIsReminderPickerOpen(true);
  };

  const addReminderMinutes = (minutes: number) => {
    setReminders((prev) => {
      if (prev.includes(minutes)) return prev;
      return [...prev, minutes].sort((a, b) => a - b);
    });
  };

  const onAndroidReminderChange = (event: DateTimePickerEvent, date?: Date) => {
    setIsReminderPickerOpen(false);
    if (event.type === 'set' && date) addReminderMinutes(minutesFromDate(date));
  };

  const onIosReminderChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) setReminderPickerValue(date);
  };

  const confirmIosReminder = () => {
    addReminderMinutes(minutesFromDate(reminderPickerValue));
    setIsReminderPickerOpen(false);
  };

  const removeReminder = (minutes: number) => {
    setReminders((prev) => prev.filter((m) => m !== minutes));
  };

  // ---- Start date ----------------------------------------------------------

  const openDatePicker = () => {
    setDatePickerValue(startDate);
    setIsDatePickerOpen(true);
  };

  const onAndroidDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setIsDatePickerOpen(false);
    if (event.type === 'set' && date) setStartDate(date);
  };

  const onIosDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) setDatePickerValue(date);
  };

  const confirmIosDate = () => {
    setStartDate(datePickerValue);
    setIsDatePickerOpen(false);
  };

  // ---- Invite people -------------------------------------------------------

  const addInvitee = () => {
    const trimmed = inviteInput.trim().toLowerCase();
    if (trimmed.length === 0) return;
    if (!EMAIL_RE.test(trimmed)) {
      setInviteError('Enter a valid email');
      return;
    }
    if (inviteEmails.includes(trimmed)) {
      setInviteError('Already on the invite list');
      return;
    }
    setInviteError(undefined);
    setInviteEmails((prev) => [...prev, trimmed]);
    setInviteInput('');
  };

  const removeInvitee = (email: string) => {
    setInviteEmails((prev) => prev.filter((e) => e !== email));
  };

  // ---- Save ----------------------------------------------------------------

  const handleCreate = () => {
    let hasErrors = false;
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setNameError('Give your challenge a name');
      hasErrors = true;
    } else {
      setNameError(undefined);
    }
    const duration = parseInt(durationDays, 10);
    if (!Number.isFinite(duration) || duration < 1) {
      setDurationError('At least 1 day');
      hasErrors = true;
    } else {
      setDurationError(undefined);
    }
    if (hasErrors) return;

    const created = addChallenge({
      name: trimmedName,
      description: description.trim() || undefined,
      coverImageUri: coverImageUri ?? undefined,
      frequency,
      durationDays: duration,
      startDate,
      goal: goal.trim() || undefined,
      reminderMinutes: reminders,
      invitedEmails: inviteEmails,
    });

    // Replace (not push) so the back button on the detail screen returns to the
    // challenges tab, not the create form.
    router.replace(`/challenges/${created.id}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-row items-center px-6 pb-4 pt-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/challenges'))}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center">
            <Ionicons name="chevron-back" size={26} color={colors.primaryText} />
          </Pressable>
          <Text className="flex-1 text-center text-title-large font-primary-bold text-primary-text">
            New Challenge
          </Text>
          <View className="h-10 w-10" />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* ---- Cover image ---- */}
          <Pressable
            onPress={openCoverPicker}
            disabled={isUploadingCover}
            accessibilityRole="button"
            accessibilityLabel={coverImageUri ? 'Change cover image' : 'Add cover image'}
            style={{
              width: '100%',
              aspectRatio: 16 / 9,
              borderRadius: 14,
              overflow: 'hidden',
              backgroundColor: colors.surface,
              borderWidth: coverImageUri ? 0 : 1,
              borderColor: colors.divider,
              borderStyle: coverImageUri ? 'solid' : 'dashed',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 4,
              position: 'relative',
            }}>
            {coverImageUri ? (
              <Image
                source={{ uri: coverImageUri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View className="items-center">
                <Ionicons name="image-outline" size={32} color={colors.secondaryText} />
                <Text className="mt-2 text-body-medium font-secondary-semibold text-secondary-text">
                  Add Cover Image
                </Text>
                <Text className="mt-0.5 text-body-small font-secondary text-hint">Optional</Text>
              </View>
            )}
            {coverImageUri ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  bottom: 12,
                  right: 12,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(0, 0, 0, 0.55)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="pencil" size={16} color="#FFFFFF" />
              </View>
            ) : null}
            {isUploadingCover ? (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            ) : null}
          </Pressable>

          {/* ---- Name ---- */}
          <Input
            label="Name"
            placeholder="e.g. 10K Steps Daily, Morning Zen"
            leadingIcon="trophy-outline"
            containerClassName="mt-8"
            autoCapitalize="words"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (nameError) setNameError(undefined);
            }}
            error={nameError}
            returnKeyType="next"
          />

          {/* ---- Description ---- */}
          <Text className="mt-8 mb-2 text-label-large font-secondary-semibold text-primary-text">
            Description{' '}
            <Text className="text-body-small font-secondary text-secondary-text">(Optional)</Text>
          </Text>
          <View
            className="rounded-md border border-divider bg-surface px-3.5 py-3">
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Why are you doing this challenge? Set the tone for your group."
              placeholderTextColor={colors.hint}
              multiline
              textAlignVertical="top"
              style={{
                minHeight: 100,
                fontSize: 16,
                color: colors.primaryText,
                fontFamily: 'Inter-Regular',
              }}
            />
          </View>

          {/* ---- Frequency ---- */}
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

          {/* ---- Duration ---- */}
          <Text className="mt-8 mb-2 text-label-large font-secondary-semibold text-primary-text">
            Duration
          </Text>
          <View
            className={cn(
              'flex-row items-center rounded-md border bg-surface px-3.5',
              durationError ? 'border-error' : 'border-divider',
            )}>
            <Ionicons name="calendar-outline" size={20} color={colors.secondaryText} />
            <TextInput
              value={durationDays}
              onChangeText={(t) => {
                setDurationDays(t.replace(/[^0-9]/g, ''));
                if (durationError) setDurationError(undefined);
              }}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="30"
              placeholderTextColor={colors.hint}
              style={{
                flex: 1,
                marginLeft: 10,
                paddingVertical: 14,
                fontSize: 17,
                color: colors.primaryText,
                fontFamily: 'Inter-Regular',
              }}
              textAlignVertical="center"
            />
            <Text className="text-body-large font-secondary text-secondary-text">days</Text>
          </View>
          {durationError ? (
            <Text className="mt-1.5 text-body-small font-secondary text-error">{durationError}</Text>
          ) : null}

          {/* ---- Start date ---- */}
          <Text className="mt-8 mb-2 text-label-large font-secondary-semibold text-primary-text">
            Start Date
          </Text>
          <Pressable
            onPress={openDatePicker}
            accessibilityRole="button"
            accessibilityLabel="Pick start date"
            className="flex-row items-center rounded-md border border-divider bg-surface px-3.5 py-3.5">
            <Ionicons name="calendar-outline" size={20} color={colors.secondaryText} />
            <Text
              className="ml-3 flex-1 text-body-large font-secondary text-primary-text"
              style={{ fontSize: 17 }}>
              {formatDate(startDate)}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.secondaryText} />
          </Pressable>

          {/* ---- Goal ---- */}
          <Text className="mt-8 mb-2 text-label-large font-secondary-semibold text-primary-text">
            Goal / Target{' '}
            <Text className="text-body-small font-secondary text-secondary-text">(Optional)</Text>
          </Text>
          <Input
            placeholder="e.g. 10,000 steps, 30 minutes meditation"
            leadingIcon="flag-outline"
            value={goal}
            onChangeText={setGoal}
            returnKeyType="done"
          />

          {/* ---- Self-reminders ---- */}
          <View className="mt-8 flex-row items-center justify-between">
            <Text className="text-label-large font-secondary-semibold text-primary-text">
              Self-Reminders{' '}
              <Text className="text-body-small font-secondary text-secondary-text">(Optional)</Text>
            </Text>
            <Pressable
              onPress={openReminderPicker}
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
            <Ionicons name="lock-closed-outline" size={14} color={colors.secondaryText} />
            <Text className="ml-1.5 text-body-small font-secondary text-secondary-text">
              Only visible to you · up to {MAX_REMINDERS} per challenge
            </Text>
          </View>

          {/* ---- Invite people ---- */}
          <Text className="mt-8 mb-2 text-label-large font-secondary-semibold text-primary-text">
            Invite People{' '}
            <Text className="text-body-small font-secondary text-secondary-text">(Optional)</Text>
          </Text>
          <View
            className={cn(
              'flex-row items-center rounded-md border bg-surface px-3.5',
              inviteError ? 'border-error' : 'border-divider',
            )}>
            <Ionicons name="mail-outline" size={20} color={colors.secondaryText} />
            <TextInput
              value={inviteInput}
              onChangeText={(t) => {
                setInviteInput(t);
                if (inviteError) setInviteError(undefined);
              }}
              placeholder="friend@example.com"
              placeholderTextColor={colors.hint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={addInvitee}
              style={{
                flex: 1,
                marginLeft: 10,
                paddingVertical: 14,
                fontSize: 17,
                color: colors.primaryText,
                fontFamily: 'Inter-Regular',
              }}
              textAlignVertical="center"
            />
            <Pressable
              onPress={addInvitee}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Add invitee"
              disabled={inviteInput.trim().length === 0}
              className={cn(inviteInput.trim().length === 0 && 'opacity-40')}>
              <Text className="text-label-large font-secondary-semibold text-primary">Add</Text>
            </Pressable>
          </View>
          {inviteError ? (
            <Text className="mt-1.5 text-body-small font-secondary text-error">{inviteError}</Text>
          ) : null}

          {inviteEmails.length > 0 ? (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {inviteEmails.map((email) => (
                <View
                  key={email}
                  className="flex-row items-center rounded-full bg-primary/10 px-3 py-1.5">
                  <Text className="text-body-small font-secondary-semibold text-primary">
                    {email}
                  </Text>
                  <Pressable
                    onPress={() => removeInvitee(email)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${email}`}
                    className="ml-2">
                    <Ionicons name="close" size={14} color={colors.primary} />
                  </Pressable>
                </View>
              ))}
            </View>
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
            onPress={handleCreate}
            leadingIcon={<Ionicons name="checkmark" size={20} color={colors.onPrimary} />}
            accessibilityLabel="Create challenge">
            Create Challenge
          </Button>
        </View>
      </KeyboardAvoidingView>

      {/* ---- Reminder time picker (Android: native dialog) ---- */}
      {Platform.OS === 'android' && isReminderPickerOpen ? (
        <DateTimePicker
          value={reminderPickerValue}
          mode="time"
          is24Hour={false}
          onChange={onAndroidReminderChange}
        />
      ) : null}

      {/* ---- Reminder time picker (iOS: modal with spinner) ---- */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={isReminderPickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsReminderPickerOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                paddingBottom: 24,
              }}>
              <View className="flex-row items-center justify-between border-b border-divider px-5 py-3">
                <Pressable onPress={() => setIsReminderPickerOpen(false)} hitSlop={8}>
                  <Text className="text-body-large font-secondary text-secondary-text">Cancel</Text>
                </Pressable>
                <Text className="text-body-large font-primary-bold text-primary-text">
                  Pick a time
                </Text>
                <Pressable onPress={confirmIosReminder} hitSlop={8}>
                  <Text className="text-body-large font-secondary-semibold text-primary">Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={reminderPickerValue}
                mode="time"
                display="spinner"
                onChange={onIosReminderChange}
                textColor={colors.primaryText}
              />
            </View>
          </View>
        </Modal>
      ) : null}

      {/* ---- Start date picker (Android) ---- */}
      {Platform.OS === 'android' && isDatePickerOpen ? (
        <DateTimePicker
          value={datePickerValue}
          mode="date"
          minimumDate={new Date()}
          onChange={onAndroidDateChange}
        />
      ) : null}

      {/* ---- Start date picker (iOS modal) ---- */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={isDatePickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIsDatePickerOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                paddingBottom: 24,
              }}>
              <View className="flex-row items-center justify-between border-b border-divider px-5 py-3">
                <Pressable onPress={() => setIsDatePickerOpen(false)} hitSlop={8}>
                  <Text className="text-body-large font-secondary text-secondary-text">Cancel</Text>
                </Pressable>
                <Text className="text-body-large font-primary-bold text-primary-text">
                  Start date
                </Text>
                <Pressable onPress={confirmIosDate} hitSlop={8}>
                  <Text className="text-body-large font-secondary-semibold text-primary">Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={datePickerValue}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={onIosDateChange}
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
