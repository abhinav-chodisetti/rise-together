import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { useChallenges } from '../../lib/challenges-context';
import { type ActivityItem, type LeaderboardEntry } from '../../lib/mock-challenges';
import { useThemeColors } from '../../lib/theme-context';

export default function ChallengeDetailScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { user } = useUser();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getChallengeById } = useChallenges();

  const challenge = getChallengeById(id);

  if (!challenge) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
        edges={['top', 'bottom']}>
        <View className="flex-row items-center px-4 pt-2 pb-3">
          <Pressable
            onPress={() => router.back()}
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
          <Text className="text-headline-medium font-primary-bold text-secondary-text">
            Challenge
          </Text>
          <Text className="mt-1 text-title-medium font-primary-bold text-primary-text">
            {challenge.name}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            /* TODO(challenges-share): share challenge link via Share.share */
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Share challenge"
          className="h-10 w-10 items-center justify-center">
          <Ionicons name="share-social-outline" size={24} color={colors.primaryText} />
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
            position: 'relative',
          }}>
          <Pressable
            onPress={() => {
              /* TODO(challenges-info): show challenge info / rules */
            }}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Challenge info"
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="help" size={18} color="#FFFFFF" />
          </Pressable>

          <Text
            className="text-body-medium font-secondary-semibold"
            style={{ color: colors.onPrimary, opacity: 0.9 }}>
            Day {challenge.dayCurrent} of {challenge.dayTotal}
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

          <View className="mt-5 flex-row items-center justify-between">
            <View className="flex-row">
              {challenge.detailHeaderAvatars.map((color, idx) => (
                <View
                  key={idx}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: color,
                    borderWidth: 2,
                    borderColor: colors.primary,
                    marginLeft: idx === 0 ? 0 : -10,
                  }}
                />
              ))}
            </View>
            <Text
              className="text-body-medium font-secondary-semibold"
              style={{ color: colors.onPrimary }}>
              +{challenge.detailOthersCount} others
            </Text>
          </View>
        </View>

        <View className="mt-8 flex-row items-center justify-between">
          <Text className="text-title-large font-primary-bold text-primary-text">Leaderboard</Text>
          <Pressable
            onPress={() => {
              /* TODO(challenges): navigate to full leaderboard */
            }}
            hitSlop={6}
            accessibilityRole="link"
            accessibilityLabel="View full leaderboard">
            <Text className="text-label-large font-secondary-semibold text-primary">View All</Text>
          </Pressable>
        </View>

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
          <Text className="text-title-large font-primary-bold text-primary-text">Live Activity</Text>
          <View className="mt-4 gap-4">
            {challenge.activity.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: 16,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          elevation: 8,
        }}>
        <Button
          onPress={() => {
            /* TODO(challenges): mark today's progress via context/backend */
          }}
          leadingIcon={
            <Ionicons name="checkmark-circle" size={20} color={colors.onPrimary} />
          }
          accessibilityLabel="Log today's progress">
          Log Today&apos;s Progress
        </Button>
      </View>
    </SafeAreaView>
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
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: entry.avatarColor,
          marginLeft: 4,
        }}
      />
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

function ActivityRow({ item }: { item: ActivityItem }) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-start">
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.success + '20',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name="checkmark" size={16} color={colors.success} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-body-medium font-secondary text-primary-text">{item.text}</Text>
        <Text className="mt-0.5 text-body-small font-secondary text-secondary-text">
          {item.timeAgo}
        </Text>
      </View>
    </View>
  );
}
