import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import {
  useChallenges,
  type ActivityItem,
  type LeaderboardEntry,
} from '../../lib/challenges-context';
import { useThemeColors, useThemeFonts } from '../../lib/theme-context';
import * as ImagePicker from 'expo-image-picker';
import { uploadChallengeProof } from '../../lib/challenge-photo-upload';
import { useSupabase } from '../../lib/supabase';
import { todayISO } from '../../lib/streak';
import { formatSchedule, type Weekday } from '../../lib/weekdays';

export default function ChallengeDetailScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const fonts = useThemeFonts();
  const { user } = useUser();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getChallengeById,
    markComplete,
    unmarkComplete,
    postComment,
    deleteComment,
  } = useChallenges();
  const supabase = useSupabase();
  const insets = useSafeAreaInsets();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);

  const challenge = getChallengeById(id);

  if (!challenge) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
        edges={['top', 'bottom']}>
        <View className="flex-row items-center px-4 pt-2 pb-3">
          <Pressable
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/(tabs)/challenges')
            }
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center">
            <Ionicons name="chevron-back" size={26} color={colors.primaryText} />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-body-large font-secondary text-secondary-text">
            Challenge not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const firstName = user?.firstName?.trim() || 'there';
  const lastName = user?.lastName?.trim() ?? '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ');

  const hasEnded = challenge.endDate !== undefined && challenge.endDate < todayISO();
  const canLog = !challenge.isRestDayToday && !hasEnded;

  // Photo-proof flow: prompt for camera vs library, return a captured local
  // URI, or null if the user cancelled. Permission errors surface via Alert.
  const pickProofPhoto = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const pickFrom = async (source: 'camera' | 'library') => {
        try {
          const perm =
            source === 'camera'
              ? await ImagePicker.requestCameraPermissionsAsync()
              : await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert(
              source === 'camera' ? 'Camera permission needed' : 'Photos permission needed',
              'Enable access in Settings to attach a proof photo.',
            );
            resolve(null);
            return;
          }
          const result =
            source === 'camera'
              ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
              : await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: 'images',
                  quality: 0.8,
                });
          if (!result.canceled && result.assets[0]) resolve(result.assets[0].uri);
          else resolve(null);
        } catch {
          Alert.alert("Couldn't open the picker", 'Try again.');
          resolve(null);
        }
      };

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options: ['Take Photo', 'Choose from Library', 'Cancel'], cancelButtonIndex: 2 },
          (idx) => {
            if (idx === 0) pickFrom('camera');
            else if (idx === 1) pickFrom('library');
            else resolve(null);
          },
        );
      } else {
        Alert.alert('Attach proof', undefined, [
          { text: 'Take Photo', onPress: () => pickFrom('camera') },
          { text: 'Choose from Library', onPress: () => pickFrom('library') },
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        ]);
      }
    });
  };

  const onSendComment = async () => {
    const body = commentDraft.trim();
    if (!body || isSendingComment) return;
    setIsSendingComment(true);
    try {
      await postComment(challenge.id, body);
      setCommentDraft('');
    } catch (e) {
      Alert.alert(
        "Couldn't post comment",
        e instanceof Error ? e.message : 'Try again in a moment.',
      );
    } finally {
      setIsSendingComment(false);
    }
  };

  const onDeleteComment = async (commentId: string) => {
    Alert.alert('Delete comment?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(commentId);
          } catch (e) {
            Alert.alert(
              "Couldn't delete",
              e instanceof Error ? e.message : 'Try again in a moment.',
            );
          }
        },
      },
    ]);
  };

  const onToggleToday = async () => {
    if (isSubmitting || !canLog || !user) return;

    // Undo (any verification type): just delete the completion.
    if (challenge.completedToday) {
      setIsSubmitting(true);
      try {
        await unmarkComplete(challenge.id);
      } catch (e) {
        Alert.alert(
          "Couldn't update progress",
          e instanceof Error ? e.message : 'Try again in a moment.',
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Honor → straight insert.
    if (challenge.verification !== 'photo') {
      setIsSubmitting(true);
      try {
        await markComplete(challenge.id);
      } catch (e) {
        Alert.alert(
          "Couldn't update progress",
          e instanceof Error ? e.message : 'Try again in a moment.',
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Photo → pick → upload → insert with the storage path.
    const uri = await pickProofPhoto();
    if (!uri) return; // user cancelled / permission denied
    setIsSubmitting(true);
    try {
      const path = await uploadChallengeProof(supabase, user.id, challenge.id, uri);
      await markComplete(challenge.id, path);
    } catch (e) {
      Alert.alert(
        "Couldn't log proof",
        e instanceof Error ? e.message : 'Try again in a moment.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View className="flex-row items-center border-b border-divider px-4 pb-3 pt-2">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/challenges'))}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="h-10 w-10 items-center justify-center">
          <Ionicons name="chevron-back" size={26} color={colors.primaryText} />
        </Pressable>
        <View className="flex-1 items-center">
          <Text
            className="text-title-medium text-primary-text"
            style={{ fontFamily: fonts.primaryBold }}>
            {challenge.name}
          </Text>
        </View>
        <Pressable
          onPress={() => setIsMenuOpen(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Challenge menu"
          className="h-10 w-10 items-center justify-center">
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.primaryText} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}>
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: 14,
            padding: 20,
          }}>
          <Text
            className="text-body-medium font-secondary-semibold"
            style={{ color: colors.onPrimary, opacity: 0.9 }}>
            Day {challenge.dayCurrent} of {challenge.dayTotal}
            {challenge.daysOfWeek.length < 7
              ? ` · ${formatSchedule(challenge.daysOfWeek)}`
              : ''}
            {challenge.isRestDayToday ? ' · Rest day' : ''}
          </Text>
          <Text
            className="mt-1 text-title-large font-primary-bold"
            style={{ color: colors.onPrimary }}>
            Keep it up, {firstName}!
          </Text>

          <View className="mt-5 flex-row items-center justify-between">
            <Text
              className="text-body-medium font-secondary-semibold"
              style={{ color: colors.onPrimary }}>
              Group Consistency
            </Text>
            <Text
              className="text-body-medium font-primary-bold"
              style={{ color: colors.onPrimary }}>
              {challenge.groupConsistency}%
            </Text>
          </View>
          <View
            className="mt-2 h-2 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
            <View
              style={{
                width: `${challenge.groupConsistency}%`,
                height: '100%',
                backgroundColor: '#FFFFFF',
              }}
            />
          </View>

        </View>

        <Text
          className="mt-8 text-title-large text-primary-text"
          style={{ fontFamily: fonts.primaryBold }}>
          Leaderboard
        </Text>

        <View className="mt-4 gap-3">
          {challenge.leaderboard.map((entry) => (
            <LeaderboardRow
              key={entry.id}
              entry={entry}
              currentUserDisplayName={fullName}
            />
          ))}
        </View>

        <View className="mt-8 rounded-md bg-surface p-5">
          <Text
            className="text-title-large text-primary-text"
            style={{ fontFamily: fonts.primaryBold }}>
            Live Activity
          </Text>
          <View className="mt-4 gap-4">
            {challenge.activity.length === 0 ? (
              <Text className="text-body-small font-secondary text-secondary-text">
                Nothing here yet. Be the first to check in or leave a comment.
              </Text>
            ) : (
              challenge.activity.map((item) => (
                <ActivityRow
                  key={item.id}
                  item={item}
                  currentUserId={user?.id ?? null}
                  onDelete={onDeleteComment}
                />
              ))
            )}
          </View>

          {/* Comment composer */}
          <View
            className="mt-4 flex-row items-center rounded-md border border-divider bg-background px-3"
            style={{ minHeight: 44 }}>
            <TextInput
              value={commentDraft}
              onChangeText={setCommentDraft}
              placeholder="Add a comment…"
              placeholderTextColor={colors.hint}
              multiline
              style={{
                flex: 1,
                paddingVertical: 10,
                fontSize: 15,
                color: colors.primaryText,
                fontFamily: 'Inter-Regular',
                maxHeight: 100,
              }}
              accessibilityLabel="Comment text"
            />
            <Pressable
              onPress={onSendComment}
              disabled={commentDraft.trim().length === 0 || isSendingComment}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Post comment"
              style={{
                opacity:
                  commentDraft.trim().length === 0 || isSendingComment ? 0.4 : 1,
                paddingHorizontal: 6,
                paddingVertical: 8,
              }}>
              {isSendingComment ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="send" size={18} color={colors.primary} />
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: insets.bottom + 16,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          elevation: 8,
        }}>
        <Button
          onPress={onToggleToday}
          loading={isSubmitting}
          disabled={!canLog}
          variant={challenge.completedToday ? 'secondary' : 'primary'}
          accessibilityLabel={
            hasEnded
              ? 'Challenge ended'
              : challenge.isRestDayToday
                ? 'Rest day'
                : challenge.completedToday
                  ? 'Mark as not done'
                  : 'Log progress'
          }>
          {hasEnded
            ? 'Challenge ended'
            : challenge.isRestDayToday
              ? 'Rest day — nothing to log'
              : challenge.completedToday
                ? '✓ Completed today'
                : 'Log Progress'}
        </Button>
      </View>

      <ChallengeMenu
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        topOffset={insets.top + 56}
        challengeId={challenge.id}
        challengeName={challenge.name}
        isOwner={!!user && challenge.ownerClerkId === user.id}
        onShowInfo={() => setIsInfoOpen(true)}
        onShowSettings={() => setIsSettingsOpen(true)}
      />

      <SettingsSheet
        visible={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        challenge={challenge}
        hasEnded={hasEnded}
      />

      <InfoSheet
        visible={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        challenge={challenge}
      />
    </SafeAreaView>
  );
}

function ChallengeMenu({
  visible,
  onClose,
  topOffset,
  challengeId,
  challengeName,
  isOwner,
  onShowInfo,
  onShowSettings,
}: {
  visible: boolean;
  onClose: () => void;
  topOffset: number;
  challengeId: string;
  challengeName: string;
  isOwner: boolean;
  onShowInfo: () => void;
  onShowSettings: () => void;
}) {
  const colors = useThemeColors();
  const router = useRouter();
  const { leaveChallenge } = useChallenges();
  // We can't run Share.share, Alert.alert, or another Modal on top of a
  // closing Modal — iOS silently fails to present them. These refs hold a
  // "deferred action" that fires after the Modal's onDismiss (iOS) or a
  // timeout fallback (Android).
  const pendingShareRef = useRef(false);
  const pendingLeaveRef = useRef(false);
  const pendingInfoRef = useRef(false);
  const pendingSettingsRef = useRef(false);

  const doShare = async () => {
    try {
      const url = Linking.createURL(`/join/${challengeId}`);
      const result = await Share.share({
        message: `Join my "${challengeName}" challenge on RiseTogether\n${url}`,
        url, // iOS: makes the URL a tappable attachment instead of plain text
      });
      console.log('[share] result:', result.action);
    } catch (e) {
      console.warn('[share] error:', e);
      Alert.alert(
        "Couldn't share challenge",
        e instanceof Error ? e.message : 'Try again in a moment.',
      );
    }
  };

  const doLeavePrompt = () => {
    Alert.alert(
      'Leave challenge?',
      `You'll be removed from "${challengeName}". You can rejoin anytime via the invite link.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveChallenge(challengeId);
              router.replace('/(tabs)/challenges');
            } catch (e) {
              Alert.alert(
                "Couldn't leave challenge",
                e instanceof Error ? e.message : 'Try again in a moment.',
              );
            }
          },
        },
      ],
    );
  };

  const flushPending = () => {
    if (pendingShareRef.current) {
      pendingShareRef.current = false;
      doShare();
    } else if (pendingLeaveRef.current) {
      pendingLeaveRef.current = false;
      doLeavePrompt();
    } else if (pendingInfoRef.current) {
      pendingInfoRef.current = false;
      onShowInfo();
    } else if (pendingSettingsRef.current) {
      pendingSettingsRef.current = false;
      onShowSettings();
    }
  };

  const handleInfo = () => {
    pendingInfoRef.current = true;
    onClose();
    if (Platform.OS !== 'ios') {
      setTimeout(flushPending, 250);
    }
  };

  const handleShare = () => {
    pendingShareRef.current = true;
    onClose();
    // Android Modal has no onDismiss callback — fall back to a delay.
    if (Platform.OS !== 'ios') {
      setTimeout(flushPending, 250);
    }
  };

  const handleSettings = () => {
    pendingSettingsRef.current = true;
    onClose();
    if (Platform.OS !== 'ios') {
      setTimeout(flushPending, 250);
    }
  };

  const handleLeave = () => {
    pendingLeaveRef.current = true;
    onClose();
    if (Platform.OS !== 'ios') {
      setTimeout(flushPending, 250);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={flushPending}>
      {/* Invisible backdrop that closes the menu on tap-outside. */}
      <Pressable style={{ flex: 1 }} onPress={onClose}>
        <View
          // Absorb taps inside the menu so they don't bubble to the backdrop.
          onStartShouldSetResponder={() => true}
          style={{
            position: 'absolute',
            top: topOffset,
            right: 16,
            minWidth: 220,
            backgroundColor: colors.surface,
            borderRadius: 12,
            paddingVertical: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.18,
            shadowRadius: 16,
            elevation: 10,
          }}>
          <MenuRow icon="information-circle-outline" label="Info" onPress={handleInfo} />
          <MenuRow icon="share-outline" label="Share" onPress={handleShare} />
          {isOwner ? (
            <MenuRow icon="settings-outline" label="Settings" onPress={handleSettings} />
          ) : null}
          <View
            style={{
              height: 1,
              backgroundColor: colors.divider,
              marginVertical: 4,
              marginHorizontal: 12,
            }}
          />
          <MenuRow
            icon="exit-outline"
            label="Leave Challenge"
            destructive
            onPress={handleLeave}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

function SettingsSheet({
  visible,
  onClose,
  challenge,
  hasEnded,
}: {
  visible: boolean;
  onClose: () => void;
  challenge: {
    id: string;
    name: string;
    leaderboard: LeaderboardEntry[];
  };
  hasEnded: boolean;
}) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { transferAdmin, endChallenge, deleteChallenge } = useChallenges();
  const [mode, setMode] = useState<'main' | 'transfer'>('main');
  const [isWorking, setIsWorking] = useState(false);
  const pendingTransferRef = useRef<LeaderboardEntry | null>(null);
  const pendingEndRef = useRef(false);
  const pendingDeleteRef = useRef(false);

  // Reset to main view + clear deferred actions whenever the sheet opens.
  useEffect(() => {
    if (visible) {
      setMode('main');
      pendingTransferRef.current = null;
      pendingEndRef.current = false;
      pendingDeleteRef.current = false;
    }
  }, [visible]);

  const candidates = challenge.leaderboard.filter((e) => !e.isCurrentUser);

  const doTransferPrompt = (target: LeaderboardEntry) => {
    Alert.alert(
      'Transfer admin?',
      `${target.name} will become the admin of "${challenge.name}". You'll stay a participant but lose admin permissions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          style: 'destructive',
          onPress: async () => {
            setIsWorking(true);
            try {
              await transferAdmin(challenge.id, target.id);
            } catch (e) {
              Alert.alert(
                "Couldn't transfer admin",
                e instanceof Error ? e.message : 'Try again in a moment.',
              );
            } finally {
              setIsWorking(false);
            }
          },
        },
      ],
    );
  };

  const doEndPrompt = () => {
    Alert.alert(
      'End this challenge?',
      'Participants can no longer check in, but all progress and history will be preserved. The challenge will move to Completed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Challenge',
          onPress: async () => {
            setIsWorking(true);
            try {
              await endChallenge(challenge.id);
            } catch (e) {
              Alert.alert(
                "Couldn't end challenge",
                e instanceof Error ? e.message : 'Try again in a moment.',
              );
            } finally {
              setIsWorking(false);
            }
          },
        },
      ],
    );
  };

  const doDeletePrompt = () => {
    Alert.alert(
      'Delete this challenge?',
      'This permanently removes the challenge for every participant. This action can\'t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsWorking(true);
            try {
              await deleteChallenge(challenge.id);
              router.replace('/(tabs)/challenges');
            } catch (e) {
              Alert.alert(
                "Couldn't delete challenge",
                e instanceof Error ? e.message : 'Try again in a moment.',
              );
              setIsWorking(false);
            }
          },
        },
      ],
    );
  };

  const flushPending = () => {
    if (pendingTransferRef.current) {
      const t = pendingTransferRef.current;
      pendingTransferRef.current = null;
      doTransferPrompt(t);
    } else if (pendingEndRef.current) {
      pendingEndRef.current = false;
      doEndPrompt();
    } else if (pendingDeleteRef.current) {
      pendingDeleteRef.current = false;
      doDeletePrompt();
    }
  };

  const onTapTransfer = (entry: LeaderboardEntry) => {
    pendingTransferRef.current = entry;
    onClose();
    if (Platform.OS !== 'ios') setTimeout(flushPending, 250);
  };

  const onTapEnd = () => {
    pendingEndRef.current = true;
    onClose();
    if (Platform.OS !== 'ios') setTimeout(flushPending, 250);
  };

  const onTapDelete = () => {
    pendingDeleteRef.current = true;
    onClose();
    if (Platform.OS !== 'ios') setTimeout(flushPending, 250);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onDismiss={flushPending}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
        onPress={onClose}>
        <View
          onStartShouldSetResponder={() => true}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 12,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 24,
            maxHeight: '85%',
          }}>
          <View
            style={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.divider,
              marginBottom: 16,
            }}
          />

          {mode === 'main' ? (
            <>
              <Text className="text-title-large font-primary-bold text-primary-text">
                Challenge Settings
              </Text>

              <View className="mt-4 rounded-md bg-background">
                <Pressable
                  onPress={() => setMode('transfer')}
                  disabled={isWorking || candidates.length === 0}
                  accessibilityRole="button"
                  accessibilityLabel="Transfer admin"
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    opacity:
                      pressed || isWorking || candidates.length === 0 ? 0.55 : 1,
                  })}>
                  <Ionicons name="swap-horizontal-outline" size={22} color={colors.primary} />
                  <View className="ml-3 flex-1">
                    <Text className="text-body-large font-secondary-semibold text-primary-text">
                      Transfer Admin
                    </Text>
                    <Text className="mt-0.5 text-body-small font-secondary text-secondary-text">
                      {candidates.length === 0
                        ? 'No other participants to transfer to.'
                        : 'Hand control to another participant.'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.hint} />
                </Pressable>
              </View>

              {!hasEnded ? (
                <View className="mt-3 rounded-md bg-background">
                  <Pressable
                    onPress={onTapEnd}
                    disabled={isWorking}
                    accessibilityRole="button"
                    accessibilityLabel="End challenge"
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      opacity: pressed || isWorking ? 0.55 : 1,
                    })}>
                    <Ionicons name="flag-outline" size={22} color={colors.primary} />
                    <View className="ml-3 flex-1">
                      <Text className="text-body-large font-secondary-semibold text-primary-text">
                        End Challenge
                      </Text>
                      <Text className="mt-0.5 text-body-small font-secondary text-secondary-text">
                        Wrap up early. History is preserved.
                      </Text>
                    </View>
                  </Pressable>
                </View>
              ) : null}

              <View className="mt-3 rounded-md bg-background">
                <Pressable
                  onPress={onTapDelete}
                  disabled={isWorking}
                  accessibilityRole="button"
                  accessibilityLabel="Delete challenge"
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    opacity: pressed || isWorking ? 0.55 : 1,
                  })}>
                  <Ionicons name="trash-outline" size={22} color={colors.error} />
                  <View className="ml-3 flex-1">
                    <Text
                      className="text-body-large font-secondary-semibold"
                      style={{ color: colors.error }}>
                      Delete Challenge
                    </Text>
                    <Text className="mt-0.5 text-body-small font-secondary text-secondary-text">
                      Permanently remove for everyone.
                    </Text>
                  </View>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View className="flex-row items-center">
                <Pressable
                  onPress={() => setMode('main')}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Back to settings">
                  <Ionicons name="chevron-back" size={22} color={colors.primaryText} />
                </Pressable>
                <Text className="ml-2 text-title-large font-primary-bold text-primary-text">
                  Transfer Admin
                </Text>
              </View>
              <Text className="mt-1 text-body-small font-secondary text-secondary-text">
                Pick the participant you want to make admin.
              </Text>

              <ScrollView className="mt-4" style={{ maxHeight: 360 }}>
                {candidates.map((entry, idx) => (
                  <Pressable
                    key={entry.id}
                    onPress={() => onTapTransfer(entry)}
                    accessibilityRole="button"
                    accessibilityLabel={`Make ${entry.name} the admin`}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderTopWidth: idx === 0 ? 0 : 1,
                      borderTopColor: colors.divider,
                      opacity: pressed ? 0.55 : 1,
                    })}>
                    {entry.avatarUrl ? (
                      <Image
                        source={{ uri: entry.avatarUrl }}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: entry.avatarColor,
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: entry.avatarColor,
                        }}
                      />
                    )}
                    <Text className="ml-3 flex-1 text-body-large font-secondary-semibold text-primary-text">
                      {entry.name}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.hint} />
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

function InfoSheet({
  visible,
  onClose,
  challenge,
}: {
  visible: boolean;
  onClose: () => void;
  challenge: {
    name: string;
    description?: string;
    goal?: string;
    daysOfWeek: number[];
    startDate: string;
    endDate?: string;
    dayTotal: number;
    participantCount: number;
  };
}) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const scheduleLabel = formatSchedule(challenge.daysOfWeek as Weekday[]);
  const dateRange =
    challenge.endDate !== undefined
      ? `${formatPrettyDate(challenge.startDate)} → ${formatPrettyDate(challenge.endDate)}`
      : `${formatPrettyDate(challenge.startDate)} · ongoing`;

  // Swipe-down-to-dismiss: drag the sheet with the finger, dismiss past a
  // distance / velocity threshold, otherwise spring back to rest.
  const translateY = useSharedValue(0);

  // Reset position whenever the sheet (re)opens — a prior swipe-dismiss may
  // have left the shared value mid-drag.
  useEffect(() => {
    if (visible) translateY.value = 0;
  }, [visible, translateY]);

  const panGesture = Gesture.Pan()
    .runOnJS(true) // run callbacks on JS thread so we can call onClose directly
    .activeOffsetY(10) // only claim the gesture on a clear downward drag
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 600) {
        onClose();
      } else {
        translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      {/* Modals render in their own native root, so the gesture system needs
          a fresh GestureHandlerRootView here to receive touches. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={onClose}>
          <GestureDetector gesture={panGesture}>
            <Animated.View
              onStartShouldSetResponder={() => true}
              style={[
                {
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: colors.surface,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  paddingTop: 12,
                  paddingBottom: insets.bottom + 24,
                  paddingHorizontal: 24,
                },
                sheetStyle,
              ]}>
              {/* Grab handle */}
              <View
                style={{
                  alignSelf: 'center',
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.divider,
                  marginBottom: 16,
                }}
              />

              <Text className="text-title-large font-primary-bold text-primary-text">
                {challenge.name}
              </Text>

              <View className="mt-4">
                <InfoSection label="About">
                  <Text className="text-body-medium font-secondary text-primary-text">
                    {challenge.description?.trim() ? challenge.description : 'No description added.'}
                  </Text>
                </InfoSection>

                {challenge.goal?.trim() ? (
                  <InfoSection label="Goal">
                    <Text className="text-body-medium font-secondary text-primary-text">
                      {challenge.goal}
                    </Text>
                  </InfoSection>
                ) : null}

                <InfoSection label="Schedule">
                  <Text className="text-body-medium font-secondary text-primary-text">
                    {scheduleLabel}
                  </Text>
                </InfoSection>

                <InfoSection label="Duration">
                  <Text className="text-body-medium font-secondary text-primary-text">
                    {dateRange}
                    {challenge.dayTotal > 0
                      ? ` · ${challenge.dayTotal} day${challenge.dayTotal === 1 ? '' : 's'}`
                      : ''}
                  </Text>
                </InfoSection>

                <InfoSection label="Members" last>
                  <Text className="text-body-medium font-secondary text-primary-text">
                    {challenge.participantCount}{' '}
                    {challenge.participantCount === 1 ? 'person' : 'people'}
                  </Text>
                </InfoSection>
              </View>
            </Animated.View>
          </GestureDetector>
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}

function InfoSection({
  label,
  last,
  children,
}: {
  label: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: 14, marginBottom: last ? 0 : 0 }}>
      <Text className="text-label-large font-secondary-semibold text-secondary-text">
        {label}
      </Text>
      <View className="mt-1">{children}</View>
    </View>
  );
}

function formatPrettyDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function MenuRow({
  icon,
  label,
  destructive,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const tint = destructive ? colors.error : colors.primaryText;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        opacity: pressed ? 0.55 : 1,
      })}>
      <Ionicons name={icon} size={20} color={tint} />
      <Text
        className="ml-3 text-body-large font-secondary-semibold"
        style={{ color: tint }}>
        {label}
      </Text>
    </Pressable>
  );
}

function initializeName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fullName;
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

function LeaderboardRow({
  entry,
  currentUserDisplayName,
}: {
  entry: LeaderboardEntry;
  currentUserDisplayName: string;
}) {
  const colors = useThemeColors();
  const displayName = initializeName(
    entry.isCurrentUser ? currentUserDisplayName : entry.name,
  );

  return (
    <View
      className="flex-row items-center rounded-md bg-surface p-4"
      style={
        entry.isCurrentUser
          ? { borderWidth: 2, borderColor: colors.primary }
          : undefined
      }>
      <Text
        className="text-body-large font-primary-bold text-secondary-text"
        style={{ width: 22 }}>
        {entry.rank}
      </Text>
      {entry.avatarUrl ? (
        <Image
          source={{ uri: entry.avatarUrl }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            marginLeft: 4,
            backgroundColor: entry.avatarColor,
          }}
        />
      ) : (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: entry.avatarColor,
            marginLeft: 4,
          }}
        />
      )}
      <View className="ml-3 flex-1">
        <Text className="text-body-large font-primary-bold text-primary-text">{displayName}</Text>
        <View className="mt-0.5 flex-row items-center">
          <Ionicons name="flame" size={14} color={colors.primary} />
          <Text className="ml-1 text-body-small font-secondary-semibold text-primary-text">
            {entry.streak} day streak
          </Text>
        </View>
      </View>
      <LeaderboardStatusPill status={entry.status} />
    </View>
  );
}

function LeaderboardStatusPill({ status }: { status: LeaderboardEntry['status'] }) {
  const colors = useThemeColors();
  if (status === 'done') {
    return (
      <View className="flex-row items-center rounded-full bg-success/10 px-2.5 py-1">
        <Ionicons name="checkmark-circle" size={14} color={colors.success} />
        <Text className="ml-1 text-body-small font-secondary-semibold text-success">Done</Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center rounded-full bg-background px-2.5 py-1">
      <Ionicons name="ellipse-outline" size={14} color={colors.secondaryText} />
      <Text className="ml-1 text-body-small font-secondary-semibold text-secondary-text">
        Pending
      </Text>
    </View>
  );
}

function ActivityRow({
  item,
  currentUserId,
  onDelete,
}: {
  item: ActivityItem;
  currentUserId: string | null;
  onDelete?: (commentId: string) => void;
}) {
  const colors = useThemeColors();
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);

  if (item.type === 'comment') {
    const isOwn = item.authorId && currentUserId && item.authorId === currentUserId;
    return (
      <View className="flex-row items-start">
        {item.authorAvatarUrl ? (
          <Image
            source={{ uri: item.authorAvatarUrl }}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.divider }}
          />
        ) : (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.divider,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="person" size={16} color={colors.secondaryText} />
          </View>
        )}
        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Text className="flex-1 text-body-medium font-primary-bold text-primary-text">
              {item.authorName ?? 'Someone'}
            </Text>
            <Text className="text-body-small font-secondary text-secondary-text">
              {item.timeAgo}
            </Text>
            {isOwn && onDelete ? (
              <Pressable
                onPress={() => onDelete(item.id.replace(/^comment-/, ''))}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Delete comment"
                style={{ marginLeft: 8 }}>
                <Ionicons name="trash-outline" size={14} color={colors.secondaryText} />
              </Pressable>
            ) : null}
          </View>
          <Text className="mt-0.5 text-body-medium font-secondary text-primary-text">
            {item.body}
          </Text>
        </View>
      </View>
    );
  }

  // Non-comment row (done / joined / milestone / finished) — same layout,
  // icon + tint differ by type.
  const visual = activityVisual(item.type, colors);

  return (
    <View className="flex-row items-start">
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: visual.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name={visual.icon} size={16} color={visual.color} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-body-medium font-secondary text-primary-text">{item.text}</Text>
        <Text className="mt-0.5 text-body-small font-secondary text-secondary-text">
          {item.timeAgo}
        </Text>
      </View>
      {item.photoUrl ? (
        <>
          <Pressable
            onPress={() => setIsPhotoOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="View proof photo"
            style={{ marginLeft: 12 }}>
            <Image
              source={{ uri: item.photoUrl }}
              style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: colors.divider }}
            />
          </Pressable>
          <PhotoViewer
            visible={isPhotoOpen}
            uri={item.photoUrl}
            onClose={() => setIsPhotoOpen(false)}
          />
        </>
      ) : null}
    </View>
  );
}

function activityVisual(
  type: ActivityItem['type'],
  colors: { success: string; primary: string },
): { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string } {
  switch (type) {
    case 'joined':
      return { icon: 'person-add', color: colors.primary, bg: colors.primary + '20' };
    case 'milestone':
      return { icon: 'flame', color: colors.primary, bg: colors.primary + '20' };
    case 'finished':
      return { icon: 'trophy', color: colors.primary, bg: colors.primary + '20' };
    case 'transfer':
      return { icon: 'swap-horizontal', color: colors.primary, bg: colors.primary + '20' };
    case 'ended':
      return { icon: 'flag', color: colors.primary, bg: colors.primary + '20' };
    case 'done':
    default:
      return { icon: 'checkmark', color: colors.success, bg: colors.success + '20' };
  }
}

function PhotoViewer({
  visible,
  uri,
  onClose,
}: {
  visible: boolean;
  uri: string;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.92)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
      </Pressable>
    </Modal>
  );
}
