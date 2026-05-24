import { useClerk, useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
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
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { cn } from '../../components/cn';
import { useNotifications } from '../../lib/notifications-context';
import { useTheme, useThemeColors } from '../../lib/theme-context';

// TODO(subscription): replace with real subscription state once payments are wired.
const IS_PRO = false;

export default function Settings() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const colors = useThemeColors();
  const { isDark, setIsDark } = useTheme();
  const { enabled: notificationsEnabled, setEnabled: setNotificationsEnabled } = useNotifications();

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isNameEditorOpen, setIsNameEditorOpen] = useState(false);
  const [firstNameDraft, setFirstNameDraft] = useState('');
  const [lastNameDraft, setLastNameDraft] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | undefined>();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      Alert.alert(
        "Couldn't sign you out",
        'Something went wrong. Check your connection and try again.',
      );
    }
  };

  // TODO(feedback-backend): replace the body of submitFeedback with a real POST
  // to your endpoint (Web3Forms / Formspree / your own server). The function
  // must resolve on success or throw on failure — the calling code is already
  // wired for both branches.
  const submitFeedback = async (_message: string): Promise<void> => {
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
  };

  const openFeedback = () => {
    setFeedbackDraft('');
    setFeedbackError(undefined);
    setIsFeedbackOpen(true);
  };

  const handleSendFeedback = async () => {
    const trimmed = feedbackDraft.trim();
    if (trimmed.length === 0) {
      setFeedbackError('Type a message first.');
      return;
    }
    setFeedbackError(undefined);
    setIsSendingFeedback(true);
    try {
      await submitFeedback(trimmed);
      setIsFeedbackOpen(false);
      Alert.alert('Thanks!', 'We got your feedback — we read every message.');
    } catch {
      setFeedbackError("Couldn't send. Check your connection and try again.");
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!user) return;
    setIsUploadingAvatar(true);
    try {
      await user.setProfileImage({ file: uri });
    } catch {
      Alert.alert("Couldn't update profile picture", 'Try again.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera permission needed', 'Enable camera access in Settings to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Photos permission needed',
        'Enable Photos access in Settings to choose a picture.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const openAvatarPicker = () => {
    if (isUploadingAvatar) return;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Take Photo', 'Choose from Library', 'Cancel'],
          cancelButtonIndex: 2,
        },
        (idx) => {
          if (idx === 0) takePhoto();
          else if (idx === 1) pickFromLibrary();
        },
      );
    } else {
      Alert.alert('Profile picture', undefined, [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickFromLibrary },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const openNameEditor = () => {
    setFirstNameDraft(user?.firstName ?? '');
    setLastNameDraft(user?.lastName ?? '');
    setNameError(undefined);
    setIsNameEditorOpen(true);
  };

  const onSaveName = async () => {
    if (!user) return;
    const first = firstNameDraft.trim();
    const last = lastNameDraft.trim();
    if (first.length === 0) {
      setNameError('First name is required');
      return;
    }
    setNameError(undefined);
    setIsSavingName(true);
    try {
      await user.update({ firstName: first, lastName: last });
      setIsNameEditorOpen(false);
    } catch {
      setNameError("Couldn't save. Try again.");
    } finally {
      setIsSavingName(false);
    }
  };

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'there';
  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  const initials =
    ((user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')).toUpperCase() || '?';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}>
        <Text className="pt-2 pb-6 text-headline-medium font-primary-bold text-primary-text">
          Settings
        </Text>

        <View className="flex-row items-center pb-6">
          <Pressable
            onPress={openAvatarPicker}
            disabled={isUploadingAvatar}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Change profile picture"
            style={{ position: 'relative' }}>
            {user?.imageUrl ? (
              <Image
                source={{ uri: user.imageUrl }}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  borderWidth: 2,
                  borderColor: colors.primary,
                }}
              />
            ) : (
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: colors.primary,
                  borderWidth: 2,
                  borderColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text className="text-headline-medium font-primary-bold text-on-primary">
                  {initials}
                </Text>
              </View>
            )}
            {isUploadingAvatar ? (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: 36,
                  backgroundColor: 'rgba(0, 0, 0, 0.45)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            ) : (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: colors.primary,
                  borderWidth: 2,
                  borderColor: colors.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="pencil" size={12} color={colors.onPrimary} />
              </View>
            )}
          </Pressable>

          <View className="ml-4 flex-1">
            <Text className="text-title-large font-primary-bold text-primary-text">
              {displayName}
            </Text>
            {email ? (
              <Text className="mt-0.5 text-body-medium font-secondary text-secondary-text">
                {email}
              </Text>
            ) : null}
          </View>

          <Pressable
            onPress={openNameEditor}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Edit name">
            <Ionicons name="pencil" size={20} color={colors.secondaryText} />
          </Pressable>
        </View>

        <View className="rounded-md bg-surface p-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-body-small font-secondary text-secondary-text">
                Subscription
              </Text>
              <Text className="mt-1 text-title-medium font-primary-bold text-primary-text">
                {IS_PRO ? 'Pro Plan' : 'Basic Plan'}
              </Text>
            </View>
            <Button
              variant="secondary"
              onPress={
                IS_PRO
                  ? () => {
                      /* TODO(subscription): open subscription management */
                    }
                  : () => router.push('/paywall')
              }
              className="px-5 py-2">
              {IS_PRO ? 'Manage' : 'Upgrade'}
            </Button>
          </View>
        </View>

        <SectionHeader>Preferences</SectionHeader>

        <View className="overflow-hidden rounded-md bg-surface">
          <ToggleRow
            iconName="notifications"
            iconColor={colors.primary}
            tileBg="bg-primary/10"
            label="Notifications"
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackOnColor={colors.primary}
            trackOffColor={colors.divider}
          />
          <View className="h-px bg-divider" />
          <ToggleRow
            iconName="moon"
            iconColor={colors.primary}
            tileBg="bg-primary/10"
            label="Dark Mode"
            value={isDark}
            onValueChange={setIsDark}
            trackOnColor={colors.primary}
            trackOffColor={colors.divider}
          />
        </View>

        <SectionHeader>Support</SectionHeader>

        <View className="overflow-hidden rounded-md bg-surface">
          <NavRow
            iconName="document-text-outline"
            iconColor={colors.primary}
            tileBg="bg-primary/10"
            label="Terms of Service"
            labelClassName="text-primary-text"
            onPress={() => router.push('/terms')}
            chevronColor={colors.hint}
          />
          <View className="h-px bg-divider" />
          <NavRow
            iconName="chatbubble-ellipses-outline"
            iconColor={colors.primary}
            tileBg="bg-primary/10"
            label="Send Feedback"
            labelClassName="text-primary-text"
            onPress={openFeedback}
            chevronColor={colors.hint}
          />
          <View className="h-px bg-divider" />
          <NavRow
            iconName="log-out-outline"
            iconColor={colors.error}
            tileBg="bg-error/10"
            label="Logout"
            labelClassName="text-error"
            onPress={handleSignOut}
            hideChevron
          />
        </View>
      </ScrollView>

      <Modal
        visible={isNameEditorOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!isSavingName) setIsNameEditorOpen(false);
        }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}>
          <Pressable
            onPress={() => {
              if (!isSavingName) setIsNameEditorOpen(false);
            }}
            style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          />
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 32,
            }}>
            <View className="mb-4 flex-row items-center justify-between">
              <Pressable
                onPress={() => setIsNameEditorOpen(false)}
                disabled={isSavingName}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Cancel">
                <Text className="text-body-large font-secondary text-secondary-text">Cancel</Text>
              </Pressable>
              <Text className="text-body-large font-primary-bold text-primary-text">Edit name</Text>
              <Pressable
                onPress={onSaveName}
                disabled={isSavingName}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Save name">
                {isSavingName ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text className="text-body-large font-secondary-semibold text-primary">Save</Text>
                )}
              </Pressable>
            </View>

            <Input
              label="First name"
              value={firstNameDraft}
              onChangeText={(t) => {
                setFirstNameDraft(t);
                if (nameError) setNameError(undefined);
              }}
              autoCapitalize="words"
              autoComplete="given-name"
              returnKeyType="next"
              error={nameError}
              containerClassName="mb-4"
            />
            <Input
              label="Last name"
              value={lastNameDraft}
              onChangeText={setLastNameDraft}
              autoCapitalize="words"
              autoComplete="family-name"
              returnKeyType="done"
              onSubmitEditing={onSaveName}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={isFeedbackOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!isSendingFeedback) setIsFeedbackOpen(false);
        }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}>
          <Pressable
            onPress={() => {
              if (!isSendingFeedback) setIsFeedbackOpen(false);
            }}
            style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          />
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 32,
            }}>
            <View className="mb-4 flex-row items-center justify-between">
              <Pressable
                onPress={() => setIsFeedbackOpen(false)}
                disabled={isSendingFeedback}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Cancel">
                <Text className="text-body-large font-secondary text-secondary-text">Cancel</Text>
              </Pressable>
              <Text className="text-body-large font-primary-bold text-primary-text">
                Send Feedback
              </Text>
              <Pressable
                onPress={handleSendFeedback}
                disabled={isSendingFeedback}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Send feedback">
                {isSendingFeedback ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text className="text-body-large font-secondary-semibold text-primary">Send</Text>
                )}
              </Pressable>
            </View>

            <View
              className={cn(
                'rounded-md border bg-surface px-3.5 py-3',
                feedbackError ? 'border-error' : 'border-divider',
              )}>
              <TextInput
                value={feedbackDraft}
                onChangeText={(t) => {
                  setFeedbackDraft(t);
                  if (feedbackError) setFeedbackError(undefined);
                }}
                placeholder="Tell us what's on your mind — feature ideas, bugs, anything…"
                placeholderTextColor={colors.hint}
                multiline
                textAlignVertical="top"
                style={{
                  minHeight: 140,
                  fontSize: 17,
                  color: colors.primaryText,
                  fontFamily: 'Inter-Regular',
                }}
                editable={!isSendingFeedback}
              />
            </View>
            {feedbackError ? (
              <Text className="mt-1.5 text-body-small font-secondary text-error">
                {feedbackError}
              </Text>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Text
      className="mt-8 mb-3 text-body-small font-secondary-semibold text-secondary-text"
      style={{ letterSpacing: 1.2 }}>
      {String(children).toUpperCase()}
    </Text>
  );
}

function IconTile({
  iconName,
  iconColor,
  tileBg,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  tileBg: string;
}) {
  return (
    <View className={cn('h-10 w-10 items-center justify-center rounded-md', tileBg)}>
      <Ionicons name={iconName} size={20} color={iconColor} />
    </View>
  );
}

function ToggleRow({
  iconName,
  iconColor,
  tileBg,
  label,
  value,
  onValueChange,
  trackOnColor,
  trackOffColor,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  tileBg: string;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  trackOnColor: string;
  trackOffColor: string;
}) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      className="flex-row items-center px-4 py-3.5"
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}>
      <IconTile iconName={iconName} iconColor={iconColor} tileBg={tileBg} />
      <Text className="ml-3 flex-1 text-body-large font-secondary text-primary-text">{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: trackOnColor, false: trackOffColor }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={trackOffColor}
      />
    </Pressable>
  );
}

function NavRow({
  iconName,
  iconColor,
  tileBg,
  label,
  labelClassName,
  onPress,
  hideChevron,
  chevronColor,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  tileBg: string;
  label: string;
  labelClassName?: string;
  onPress: () => void;
  hideChevron?: boolean;
  chevronColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-3.5"
      accessibilityRole="button"
      accessibilityLabel={label}>
      <IconTile iconName={iconName} iconColor={iconColor} tileBg={tileBg} />
      <Text
        className={cn(
          'ml-3 flex-1 text-body-large font-secondary',
          labelClassName ?? 'text-primary-text',
        )}>
        {label}
      </Text>
      {!hideChevron && chevronColor ? (
        <Ionicons name="chevron-forward" size={20} color={chevronColor} />
      ) : null}
    </Pressable>
  );
}
